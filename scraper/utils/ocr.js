// OCR Invoice Parser - EXTRACT PRODUCT NAMES ONLY (no prices)
const Tesseract = require('tesseract.js');
const pdf = require('pdf-parse');

/**
 * Parse invoice text - EXTRACT ONLY PRODUCT NAMES
 * Prices are NOT extracted - we scrape competitors instead
 */
function parseInvoiceText(text) {
    const lines = text
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 4);

    const products = [];
    const seen = new Set(); // Prevent duplicates

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip headers, totals, and metadata
        if (/ukupno|subtotal|pdv|total|račun|faktura|invoice|napomena|datum|date|adresa|telefon|fax|broj|način/i.test(line)) {
            continue;
        }

        // Skip lines that are just numbders or prices
        if (/^\d+[.,]?\d*\s*(KM|BAM|kom|EUR)?$/i.test(line)) {
            continue;
        }

        // Look for product lines (lines with letters and some words)
        // Must have at least 2 words and some letters
        const hasLetters = /[a-zA-ZčćžšđČĆŽŠĐ]/.test(line);
        const wordCount = line.split(/\s+/).length;

        if (hasLetters && wordCount >= 2) {
            let name = cleanName(line);

            // Must be at least 5 chars after cleaning
            if (name && name.length >= 5) {
                const normalized = name.toLowerCase();

                if (!seen.has(normalized)) {
                    seen.add(normalized);
                    products.push({
                        name: name,
                        source: 'ocr'
                    });
                }
            }
        }
    }

    return products;
}

/**
 * Clean product name - remove noise but keep brand/model info
 */
function cleanName(name) {
    return name
        // Remove common prefixes (quantities, item numbers)
        .replace(/^\d+\s+/, '')
        .replace(/^[RB]+\s+\d+\s+/, '') // Remove "RB 1 ", "R 2 " etc.
        // Remove prices at end
        .replace(/\d+[.,]\d{2}\s*(KM|BAM|EUR)?\s*$/gi, '')
        // Keep alphanumeric, spaces, dashes, and Bosnian characters
        .replace(/[^\wčćžšđČĆŽŠĐ\d\s\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Main OCR processor - handles PDF and images
 * Returns ONLY product names (no prices)
 */
async function parseInvoice(filePath) {
    const fs = require('fs');
    const path = require('path');

    try {
        const ext = path.extname(filePath).toLowerCase();
        let text = '';

        if (ext === '.pdf') {
            // PDF extraction
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            text = data.text;
            console.log('📄 PDF parsed, extracting product names...');
        } else {
            // Image OCR (JPG, PNG)
            console.log('🖼️  Image OCR starting (tesseract.js)...');
            const result = await Tesseract.recognize(filePath, 'bos+eng', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log(`   Progress: ${(m.progress * 100).toFixed(0)}%`);
                    }
                }
            });
            text = result.data.text;
            console.log('✅ OCR complete');
        }

        // Parse products (names only)
        const products = parseInvoiceText(text);

        console.log(`📦 Found ${products.length} product names`);
        console.log('💡 Competitor prices will be scraped automatically');

        return {
            success: true,
            products: products,
            rawText: text
        };

    } catch (error) {
        console.error('OCR error:', error.message);
        return {
            success: false,
            products: [],
            rawText: '',
            error: error.message
        };
    }
}

module.exports = {
    parseInvoice,
    parseInvoiceText,
    cleanName
};
