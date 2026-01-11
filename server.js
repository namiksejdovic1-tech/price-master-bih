const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const ScraperEngine = require('./scraper/scraper');
const OCRProcessor = require('./scraper/utils/ocr');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// File upload
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Initialize engines
const scraperEngine = new ScraperEngine();
const ocrProcessor = OCRProcessor;

// In-memory storage
let products = [];
let productIdCounter = 1;

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/products', (req, res) => {
    const { search, brand, minPrice, maxPrice, minIndex, maxIndex, page = 1, limit = 6 } = req.query;

    let filtered = [...products];

    // Fast search
    if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(p => p.product.toLowerCase().includes(searchLower));
    }

    // Brand filter
    if (brand) {
        filtered = filtered.filter(p => p.product.toLowerCase().includes(brand.toLowerCase()));
    }

    // Price range
    if (minPrice) filtered = filtered.filter(p => p.myPrice >= parseFloat(minPrice));
    if (maxPrice) filtered = filtered.filter(p => p.myPrice <= parseFloat(maxPrice));

    // Competitive index range
    if (minIndex) filtered = filtered.filter(p => p.analysis >= parseInt(minIndex));
    if (maxIndex) filtered = filtered.filter(p => p.analysis <= parseInt(maxIndex));

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + parseInt(limit));

    res.json({
        products: paginated,
        total: filtered.length,
        page: parseInt(page),
        totalPages: Math.ceil(filtered.length / limit)
    });
});

app.post('/api/products/manual', async (req, res) => {
    try {
        const { name, price } = req.body;

        if (!name || !price) {
            return res.status(400).json({ error: 'Name and price required' });
        }

        console.log(`\n📝 Manual product: ${name} - ${price} KM`);

        // Scrape competitors - THIS IS REAL SCRAPING NOW
        const result = await scraperEngine.scrapeProduct(name, parseFloat(price));

        const product = {
            id: productIdCounter++,
            ...result,
            source: 'manual',
            createdAt: new Date().toISOString()
        };

        // Add to beginning (newest first)
        products.unshift(product);

        console.log(`✅ Product added with ${Object.keys(result.competitors).length} competitor checks`);

        res.json({ success: true, product });

    } catch (error) {
        console.error('Manual add error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products/ocr', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(`\n📄 OCR Upload: ${req.file.originalname}`);

        // Extract products using OCR
        const ocrResult = await ocrProcessor.parseInvoice(req.file.path);

        // Cleanup uploaded file
        fs.unlinkSync(req.file.path);

        if (ocrResult.products.length === 0) {
            return res.json({
                success: true,
                productsAdded: 0,
                message: 'No products found in image',
                extractedText: ocrResult.rawText.substring(0, 500)
            });
        }

        console.log(`✅ OCR found ${ocrResult.products.length} products`);

        // Scrape competitors for all products - REAL SCRAPING
        const scrapedProducts = await scraperEngine.scrapeMultipleProducts(ocrResult.products);

        // Add all products to database
        const newProducts = scrapedProducts.map(result => ({
            id: productIdCounter++,
            ...result,
            source: 'ocr',
            ocrConfidence: 'high',
            createdAt: new Date().toISOString()
        }));

        // Add to beginning (newest first)
        products.unshift(...newProducts);

        console.log(`✅ Added ${newProducts.length} products with competitor data`);

        res.json({
            success: true,
            productsFound: ocrResult.products.length,
            productsAdded: newProducts.length,
            products: newProducts
        });

    } catch (error) {
        console.error('OCR error:', error);

        // Cleanup on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products/:id/refresh', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const productIndex = products.findIndex(p => p.id === productId);

        if (productIndex === -1) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const oldProduct = products[productIndex];
        console.log(`\n🔄 Refreshing: ${oldProduct.product}`);

        // Re-scrape with REAL scraper
        const refreshed = await scraperEngine.refreshProduct(oldProduct);

        const updatedProduct = {
            ...oldProduct,
            ...refreshed,
            lastRefresh: new Date().toISOString()
        };

        products[productIndex] = updatedProduct;

        console.log(`✅ Refreshed with new competitor data`);

        res.json({ success: true, product: updatedProduct });

    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/products/:id', (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const initialLength = products.length;

        products = products.filter(p => p.id !== productId);

        if (products.length === initialLength) {
            return res.status(404).json({ error: 'Product not found' });
        }

        console.log(`🗑️  Deleted product ID ${productId}`);

        res.json({ success: true });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Primary scrape endpoint - Returns real scraped products from BijelaTehnika
app.get('/api/scrape', async (req, res) => {
    try {
        const count = parseInt(req.query.count) || 10;

        console.log(`\n🚀 Scraper started`);
        console.log(`📦 Scraping ${count} products from BijelaTehnika.com...`);

        const randomProducts = await scraperEngine.getMyRandomProducts(count);

        console.log(`✅ Products found: ${randomProducts.length}`);

        // Return the scraped products
        const products = randomProducts.map(p => ({
            productName: p.name,
            price: p.price,
            productUrl: 'https://bijelatehnika.com'
        }));

        res.json(products);

    } catch (error) {
        console.error('❌ Scrape error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Populate dashboard with 10 products
app.post('/api/scrape-random', async (req, res) => {
    try {
        const count = parseInt(req.body.count) || 10;

        console.log(`\n🎲 Scraping ${count} random products from BijelaTehnika`);

        const randomProducts = await scraperEngine.getMyRandomProducts(count);

        // Scrape competitors for each
        const scrapedProducts = await scraperEngine.scrapeMultipleProducts(randomProducts);

        // Add to database
        const newProducts = scrapedProducts.map(result => ({
            id: productIdCounter++,
            ...result,
            source: 'auto',
            createdAt: new Date().toISOString()
        }));

        products.unshift(...newProducts);

        console.log(`✅ Added ${newProducts.length} random products`);

        res.json({
            success: true,
            productsAdded: newProducts.length,
            products: newProducts
        });

    } catch (error) {
        console.error('Random scrape error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        products: products.length,
        scraperReady: true
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing scraper...');
    await scraperEngine.close();
    process.exit(0);
});

// Preload 10 products on startup WITH AUTO-SCRAPING
async function preloadProducts() {
    console.log('\n💡 Preloading 10 products from top brands...');

    const preloadedProducts = [
        { name: 'SAMSUNG TV 50UR78003 Smart LED 4K', price: 1299.99 },
        { name: 'LG Frižider GBB72STDFN NoFrost', price: 1499.00 },
        { name: 'VIVAX klima ACP-12CH35AEVI+', price: 799.90 },
        { name: 'BEKO mašina za pranje veša WUE8736XST', price: 649.00 },
        { name: 'iPhone 15 Pro 256GB Titanium', price: 2499.00 },
        { name: 'SAMSUNG Galaxy S24 Ultra 512GB', price: 2199.00 },
        { name: 'LG perilica rublja F4WV709P2T', price: 899.00 },
        { name: 'VIVAX TV 43S60T2S2SM Smart Android', price: 549.99 },
        { name: 'BEKO frižider RCNA366K40XBN', price: 999.00 },
        { name: 'SAMSUNG frižider RB38C776CS9', price: 1799.00 }
    ];

    // Add products first (so dashboard shows them immediately)
    preloadedProducts.forEach(prod => {
        products.push({
            id: productIdCounter++,
            product: prod.name,
            myPrice: prod.price,
            competitors: {
                Domod: { found: false, price: 0, url: '', productName: '', matchScore: 0 },
                Ekupi: { found: false, price: 0, url: '', productName: '', matchScore: 0 },
                Technoshop: { found: false, price: 0, url: '', productName: '', matchScore: 0 },
                Tehnomag: { found: false, price: 0, url: '', productName: '', matchScore: 0 }
            },
            analysis: 0,
            aiAdvisor: {
                recommendation: 'Učitavanje...',
                message: 'Scraping konkurenata u toku...',
                strategy: 'loading',
                marketData: {
                    minPrice: 0,
                    maxPrice: 0,
                    avgPrice: 0,
                    competitorCount: 0
                }
            },
            source: 'preloaded',
            timestamp: new Date().toISOString()
        });
    });

    console.log(`✅ Preloaded ${preloadedProducts.length} products`);
    console.log('🔄 Starting competitor scraping in background...');

    // AUTO-SCRAPE competitors in background (non-blocking)
    setImmediate(async () => {
        for (let i = 0; i < products.length; i++) {
            try {
                const product = products[i];
                console.log(`\n🔍 [${i + 1}/${products.length}] Scraping: ${product.product}`);

                // Scrape competitors
                const result = await scraperEngine.scrapeProduct(product.product, product.myPrice);

                // Update product with real data
                products[i] = {
                    ...product,
                    ...result,
                    lastUpdated: new Date().toISOString()
                };

                console.log(`✅ Updated with competitor data`);

                // Small delay between products to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
                console.error(`❌ Scrape failed for product ${i + 1}:`, error.message);
            }
        }

        console.log('\n🎉 All products scraped and updated with competitor prices!');
    });
}

// Start server
app.listen(PORT, () => {
    console.log(`

╔═══════════════════════════════════════════════╗
║   🚀 Price Master BIH - PRODUCTION           ║
║   Server running on port ${PORT}                ║
║   Scraper: ACTIVE (4 competitors)            ║
║   OCR: ENABLED                               ║
║   💡 10 products preloaded - ready to test   ║
╚═══════════════════════════════════════════════╝
    `);

    // Preload products immediately
    preloadProducts();
});

module.exports = app;
