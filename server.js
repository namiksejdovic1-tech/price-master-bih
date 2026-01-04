const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const puppeteer = require('puppeteer');
require('dotenv').config();

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

// In-memory storage
let products = [];
let productIdCounter = 1;

// Simple scraper function
async function scrapeCompetitor(productName) {
    // Placeholder - returns mock data for now
    return {
        BijelaTehnika: { found: false, price: 0 },
        Tehnomag: { found: false, price: 0 }
    };
}

// OCR function
async function extractTextFromImage(filePath) {
    try {
        const { data: { text } } = await Tesseract.recognize(filePath, 'bos+eng');
        return text;
    } catch (error) {
        console.error('OCR Error:', error);
        return '';
    }
}

// Parse products from OCR text
function parseProductsFromText(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const products = [];

    for (const line of lines) {
        // Match price pattern: 1.234,56 or 234,56
        const priceMatch = line.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/);
        if (!priceMatch) continue;

        const priceStr = priceMatch[1];
        const price = parseFloat(priceStr.replace(/\./g, '').replace(',', '.'));

        // Extract product name
        const name = line.substring(0, line.indexOf(priceStr)).trim();

        if (name.length > 5 && !name.match(/^(UKUPNO|TOTAL|PDV)/i)) {
            products.push({ name, price });
        }
    }

    return products;
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/products', (req, res) => {
    const { search, brand, minPrice, maxPrice, page = 1, limit = 6 } = req.query;

    let filtered = [...products];

    if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(p => p.product.toLowerCase().includes(searchLower));
    }

    if (brand) {
        filtered = filtered.filter(p => p.product.toLowerCase().includes(brand.toLowerCase()));
    }

    if (minPrice) filtered = filtered.filter(p => p.myPrice >= parseFloat(minPrice));
    if (maxPrice) filtered = filtered.filter(p => p.myPrice <= parseFloat(maxPrice));

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

        const competitors = await scrapeCompetitor(name);

        const product = {
            id: productIdCounter++,
            product: name,
            myPrice: parseFloat(price),
            competitors,
            analysis: { competitiveIndex: 50 },
            aiAdvisor: {},
            timestamp: new Date().toISOString()
        };

        products.unshift(product);

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

        console.log('Processing OCR for:', req.file.originalname);

        const text = await extractTextFromImage(req.file.path);
        const extractedProducts = parseProductsFromText(text);

        // Cleanup
        fs.unlinkSync(req.file.path);

        if (extractedProducts.length === 0) {
            return res.json({
                success: true,
                productsAdded: 0,
                message: 'No products found in image'
            });
        }

        // Add products
        for (const prod of extractedProducts) {
            const competitors = await scrapeCompetitor(prod.name);

            products.unshift({
                id: productIdCounter++,
                product: prod.name,
                myPrice: prod.price,
                competitors,
                analysis: { competitiveIndex: 50 },
                aiAdvisor: {},
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            productsAdded: extractedProducts.length
        });

    } catch (error) {
        console.error('OCR error:', error);
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

        const product = products[productIndex];
        const competitors = await scrapeCompetitor(product.product);

        products[productIndex] = {
            ...product,
            competitors,
            lastRefresh: new Date().toISOString()
        };

        res.json({ success: true, product: products[productIndex] });
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

        res.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', products: products.length });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║   🚀 Price Master BIH - Admin Dashboard      ║
║   Server running on port ${PORT}                ║
╚═══════════════════════════════════════════════╝
    `);
});

module.exports = app;
