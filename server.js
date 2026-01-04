const express = require('express');
const puppeteer = require('puppeteer');
const Tesseract = require('tesseract.js');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });
let products = [];

app.post('/api/products', (req, res) => {
    const product = req.body;
    product.id = Date.now();
    products.push(product);
    res.status(201).json(product);
});

app.get('/api/products', (req, res) => {
    res.json(products);
});

app.post('/api/ocr', upload.single('image'), async (req, res) => {
    try {
        const { data: { text } } = await Tesseract.recognize(req.file.path, 'eng');
        fs.unlinkSync(req.file.path);
        res.json({ text });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/scrape', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    let browser;
    try {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });
        const details = await page.evaluate(() => {
            const title = document.querySelector('h1')?.innerText || 'Product';
            const price = document.querySelector('.price, [class*="price"]')?.innerText || 'Unknown';
            return { title, price };
        });
        await browser.close();
        res.json(details);
    } catch (error) {
        if (browser) await browser.close();
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ai-advice', (req, res) => {
    const { productName, price, competitors } = req.body;
    let advice = "Based on market data, we recommend ";
    if (competitors && competitors.length > 0) {
        advice += "optimizing your pricing strategy.";
    } else {
        advice += "collecting more competitor data for better insights.";
    }
    res.json({ advice });
});

app.listen(port, () => {
    console.log('Server running');
});
