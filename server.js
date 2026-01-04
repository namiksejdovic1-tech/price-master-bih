import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import ScraperEngine from './scraper/scraper.js';
import OCRProcessor from './scraper/utils/ocr.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// File upload configuration
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mime = allowedTypes.test(file.mimetype);

        if (ext && mime) {
            return cb(null, true);
        }
        cb(new Error('Only images (JPEG, PNG) and PDFs are allowed'));
    }
});

// Initialize scraper and OCR
const scraperEngine = new ScraperEngine();
const ocrProcessor = new OCRProcessor();

// In-memory storage for products (replace with database in production)
let products = [];
let productIdCounter = 1;

// ============= API ENDPOINTS =============

// Home - serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get all products
app.get('/api/products', (req, res) => {
    const { search, brand, minPrice, maxPrice, minIndex, maxIndex, page = 1, limit = 6 } = req.query;

    let filtered = [...products];

    // Fast search
    if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(p =>
            p.product.toLowerCase().includes(searchLower)
        );
    }

    // Brand filter
    if (brand) {
        filtered = filtered.filter(p =>
            p.product.toLowerCase().includes(brand.toLowerCase())
        );
    }

    // Price range filter
    if (minPrice) {
        const min = parseFloat(minPrice);
        filtered = filtered.filter(p => p.myPrice >= min);
    }
    if (maxPrice) {
        const max = parseFloat(maxPrice);
        filtered = filtered.filter(p => p.myPrice <= max);
    }

    // Competitive index filter
    if (minIndex) {
        const min = parseInt(minIndex);
        filtered = filtered.filter(p =>
            p.analysis && p.analysis.competitiveIndex >= min
        );
    }
    if (maxIndex) {
        const max = parseInt(maxIndex);
        filtered = filtered.filter(p =>
            p.analysis && p.analysis.competitiveIndex <= max
        );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginated = filtered.slice(startIndex, endIndex);

    res.json({
        products: paginated,
        total: filtered.length,
        page: parseInt(page),
        totalPages: Math.ceil(filtered.length / limit)
    });
});

// Add manual product
app.post('/api/products/manual', async (req, res) => {
    try {
        const { name, price } = req.body;

        if (!name || !price) {
            return res.status(400).json({ error: 'Product name and price are required' });
        }

        console.log(`\n📝 Manual product entry: ${name} - ${price} KM`);

        // Scrape competitors
        const result = await scraperEngine.scrapeProduct(name, parseFloat(price));

        const product = {
            id: productIdCounter++,
            ...result,
            source: 'manual',
            createdAt: new Date().toISOString()
        };

        // Add to beginning of array (newest first)
        products.unshift(product);

        res.json({
            success: true,
            product: product
        });

    } catch (error) {
        console.error('Error adding manual product:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload invoice/image for OCR
app.post('/api/products/ocr', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(`\n📄 OCR processing: ${req.file.originalname}`);

        // Extract products from image/PDF
        const ocrResult = await ocrProcessor.parseInvoice(req.file.path);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        if (ocrResult.products.length === 0) {
            return res.json({
                success: true,
                message: 'No products found in image',
                extractedText: ocrResult.rawText
            });
        }

        console.log(`✅ Found ${ocrResult.products.length} products in OCR`);

        // Scrape competitor prices for all extracted products
        const scraped = await scraperEngine.scrapeMultipleProducts(ocrResult.products);

        // Add all products to database
        const newProducts = scraped.map(result => ({
            id: productIdCounter++,
            ...result,
            source: 'ocr',
            ocrConfidence: 'medium',
            createdAt: new Date().toISOString()
        }));

        // Add to beginning (newest first)
        products.unshift(...newProducts);

        res.json({
            success: true,
            productsFound: ocrResult.products.length,
            productsAdded: newProducts.length,
            products: newProducts
        });

    } catch (error) {
        console.error('OCR error:', error);

        // Clean up file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ error: error.message });
    }
});

// Refresh single product
app.post('/api/products/:id/refresh', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const productIndex = products.findIndex(p => p.id === productId);

        if (productIndex === -1) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const oldProduct = products[productIndex];
        console.log(`\n🔄 Refreshing: ${oldProduct.product}`);

        // Rescrape
        const refreshed = await scraperEngine.refreshProduct(oldProduct);

        const updatedProduct = {
            ...oldProduct,
            ...refreshed,
            lastRefresh: new Date().toISOString()
        };

        products[productIndex] = updatedProduct;

        res.json({
            success: true,
            product: updatedProduct
        });

    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const initialLength = products.length;

        products = products.filter(p => p.id !== productId);

        if (products.length === initialLength) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ success: true, message: 'Product deleted' });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Scrape random products from my shop
app.post('/api/scrape-random', async (req, res) => {
    try {
        const count = parseInt(req.body.count) || 10;

        console.log(`\n🎲 Scraping ${count} random products from Bijela Tehnika`);

        const randomProducts = await scraperEngine.getMyRandomProducts(count);

        // Scrape competitors for each
        const scraped = await scraperEngine.scrapeMultipleProducts(randomProducts);

        // Add to database
        const newProducts = scraped.map(result => ({
            id: productIdCounter++,
            ...result,
            source: 'auto',
            createdAt: new Date().toISOString()
        }));

        products.unshift(...newProducts);

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

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', products: products.length });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║   🚀 Price Master BIH - Admin Dashboard      ║
║   Server running on port ${PORT}                ║
║   http://localhost:${PORT}                      ║
╚═══════════════════════════════════════════════╝
    `);
});

export default app;

