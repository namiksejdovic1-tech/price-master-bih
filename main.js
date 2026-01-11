const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cron = require('node-cron');
const multer = require('multer');
require('dotenv').config();

// Polyfill global `File` for libraries (undici/fetch) that expect a browser-like
// environment. Prefer `fetch-blob` if available, otherwise provide a minimal
// fallback implementation so the container doesn't crash on startup.
try {
  if (typeof File === 'undefined') {
    try {
      const { File: FetchFile } = require('fetch-blob');
      global.File = FetchFile;
    } catch (err) {
      // Minimal fallback implementation
      global.File = class File extends Buffer {
        constructor(chunks = [], name = 'file', opts = {}) {
          if (Array.isArray(chunks)) {
            const buf = Buffer.concat(chunks.map(c => Buffer.isBuffer(c) ? c : Buffer.from(String(c))));
            super(buf);
          } else {
            super(Buffer.from(String(chunks)));
          }
          this.name = name;
          this.lastModified = opts.lastModified || Date.now();
          this.size = this.length;
          this.type = opts.type || '';
        }
      };
    }
  }
} catch (e) {
  // Do not block startup on polyfill errors
  console.warn('Warning: File polyfill setup failed', e && e.message);
}

const scraper = require('./scraper');
const backupScraper = require('./backup-scraper');
const priceAnalysis = require('./price-analysis');
const invoiceParser = require('./invoice-parser');
const sheetsImport = require('./sheets-import');
const queue = require('./queue');
const cache = require('./cache');

const app = express();
const PORT = process.env.PORT || 8080;
const isCloudRun = Boolean(process.env.K_SERVICE || process.env.K_REVISION);
const dataDir = process.env.DATA_DIR || (isCloudRun ? path.join(os.tmpdir(), 'price-app') : __dirname);
const uploadsDir = path.join(dataDir, 'uploads');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));

// In-memory storage for products (for demo; in production use database)
let products = [];

// Load products from file if exists
const PRODUCTS_FILE = path.join(dataDir, 'products.json');
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(path.dirname(PRODUCTS_FILE), { recursive: true });
} catch (e) {
  console.warn('Warning: failed to create data directories:', e.message);
}

if (fs.existsSync(PRODUCTS_FILE)) {
  try {
    const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    if (data.trim()) {
      products = JSON.parse(data);
      console.log(`Loaded ${products.length} products from file`);
    }
  } catch (e) {
    console.log('Error loading products, starting with empty array:', e.message);
    products = [];
  }
} else {
  console.log('Products file not found, starting with empty array');
  products = [];
}

// Save products to file
function saveProducts() {
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
  } catch (e) {
    console.warn('Warning: failed to save products:', e.message);
  }
}

// Routes
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  // Sort products by scraped_at DESC
  const sortedProducts = [...products].sort((a, b) =>
    new Date(b.scraped_at) - new Date(a.scraped_at)
  );

  res.render('dashboard', {
    products: sortedProducts,
    error: req.query.error,
    success: req.query.success
  });
});

// Manual product entry
app.post('/add-product', (req, res) => {
  const { name, my_price } = req.body;

  if (!name || !my_price) {
    return res.redirect('/?error=Missing product name or price');
  }

  const product = {
    name: name.trim(),
    my_price: parseFloat(my_price),
    competitor_prices: [],
    scraped_at: new Date().toISOString(),
    source: 'manual'
  };

  products.unshift(product); // Insert at top
  saveProducts();

  res.redirect('/?success=Product added successfully');
});

// Scrape prices for a product
app.post('/scrape', async (req, res) => {
  const { name, my_price } = req.body;

  if (!name) {
    return res.redirect('/?error=Missing product name');
  }

  try {
    // Check cache first
    const cached = cache.get(name);
    if (cached) {
      const product = {
        name,
        my_price: my_price ? parseFloat(my_price) : 0,
        competitor_prices: cached.prices,
        scraped_at: new Date().toISOString(),
        source: 'scraper'
      };
      products.unshift(product);
      saveProducts();
      return res.redirect('/?success=Prices loaded from cache');
    }

    // Add to queue
    await queue.add(async () => {
      let prices = [];

      try {
        // Try Playwright first
        prices = await scraper.scrapeProduct(name);
      } catch (e) {
        console.log('Playwright failed, trying backup scraper:', e.message);
        try {
          // Fallback to Axios + Cheerio
          prices = await backupScraper.scrapeProduct(name);
        } catch (e2) {
          console.log('Backup scraper also failed:', e2.message);
          prices = [0, 0, 0, 0]; // Default empty prices
        }
      }

      // Check if scraping completely failed
      const hasAnyPrice = prices.some(price => price > 0);
      if (!hasAnyPrice) {
        throw new Error('Failed to scrape any products from competitor shops. This may be due to website changes or blocking.');
      }

      // Cache the result
      cache.set(name, { prices, timestamp: Date.now() });

      const product = {
        name,
        my_price: my_price ? parseFloat(my_price) : 0,
        competitor_prices: prices,
        scraped_at: new Date().toISOString(),
        source: 'scraper'
      };

      products.unshift(product);
      saveProducts();
    });

    res.redirect('/?success=Scraping started');

  } catch (error) {
    console.error('Scraping error:', error);
    res.redirect('/?error=Scraping failed: ' + error.message);
  }
});

// Manual refresh for specific product
app.post('/refresh/:index', async (req, res) => {
  const index = parseInt(req.params.index);
  if (isNaN(index) || index < 0 || index >= products.length) {
    return res.redirect('/?error=Invalid product index');
  }

  const product = products[index];

  try {
    // Clear cache for this product
    cache.del(product.name);

    // Re-scrape
    let prices = [];
    try {
      prices = await scraper.scrapeProduct(product.name);
    } catch (e) {
      prices = await backupScraper.scrapeProduct(product.name);
    }

    cache.set(product.name, { prices, timestamp: Date.now() });

    // Update product
    product.competitor_prices = prices;
    product.scraped_at = new Date().toISOString();
    saveProducts();

    res.redirect('/?success=Product refreshed');

  } catch (error) {
    res.redirect('/?error=Refresh failed: ' + error.message);
  }
});

// Price analysis
app.post('/analyze', (req, res) => {
  try {
    const analysis = priceAnalysis.analyze(products);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// File upload for invoices
const upload = multer({ dest: uploadsDir });
app.post('/upload-invoice', upload.single('invoice'), async (req, res) => {
  try {
    if (!req.file) {
      return res.redirect('/?error=No file uploaded');
    }

    const filePath = req.file.path;
    const extractedProducts = await invoiceParser.parse(filePath, {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype
    });

    // Add extracted products
    for (const prod of extractedProducts) {
      products.unshift({
        ...prod,
        scraped_at: new Date().toISOString(),
        source: req.file.mimetype.includes('pdf') ? 'pdf' : 'image'
      });
    }

    saveProducts();

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.redirect('/?success=Invoice processed successfully');

  } catch (error) {
    res.redirect('/?error=Invoice processing failed: ' + error.message);
  }
});

// Google Sheets import
app.post('/import-sheets', async (req, res) => {
  const { sheetUrl } = req.body;

  try {
    const importedProducts = await sheetsImport.import(sheetUrl);

    for (const prod of importedProducts) {
      products.unshift({
        ...prod,
        scraped_at: new Date().toISOString(),
        source: 'sheet'
      });
    }

    saveProducts();
    res.redirect('/?success=Sheet imported successfully');

  } catch (error) {
    res.redirect('/?error=Sheet import failed: ' + error.message);
  }
});

// API endpoint for external access
app.get('/api/products', (req, res) => {
  res.json(products);
});

// Cron job: daily refresh at 02:00
cron.schedule('0 2 * * *', async () => {
  console.log('Starting daily price refresh...');

  for (const product of products) {
    if (product.source === 'scraper') {
      try {
        // Clear cache
        cache.del(product.name);

        // Re-scrape
        let prices = [];
        try {
          prices = await scraper.scrapeProduct(product.name);
        } catch (e) {
          prices = await backupScraper.scrapeProduct(product.name);
        }

        cache.set(product.name, { prices, timestamp: Date.now() });
        product.competitor_prices = prices;
        product.scraped_at = new Date().toISOString();

      } catch (error) {
        console.error(`Failed to refresh ${product.name}:`, error);
      }
    }
  }

  saveProducts();
  console.log('Daily refresh completed');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`AI Price Assistant running on port ${PORT}`);
});

module.exports = app;
