import Tesseract from 'tesseract.js';
import { PriceParser } from './price.js';

// OCR utilities for extracting text from invoices and images
export class OCRProcessor {
    constructor() {
        this.worker = null;
    }

    // Initialize Tesseract worker
    async initialize() {
        if (!this.worker) {
            this.worker = await Tesseract.createWorker('bos+eng', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });
        }
        return this.worker;
    }

    // Terminate worker
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
        }
    }

    // Extract text from image
    async extractText(imagePath) {
        try {
            await this.initialize();
            const { data: { text } } = await this.worker.recognize(imagePath);
            return text;
        } catch (error) {
            console.error('OCR extraction error:', error);
            throw new Error('Failed to extract text from image');
        }
    }

    // Parse invoice/receipt and extract products with prices
    async parseInvoice(imagePath) {
        try {
            const text = await this.extractText(imagePath);
            return this.parseInvoiceText(text);
        } catch (error) {
            console.error('Invoice parsing error:', error);
            throw error;
        }
    }

    // Parse text to extract products and prices
    parseInvoiceText(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
        const products = [];

        // Patterns for product lines (various invoice formats)
        const productPatterns = [
            // Product name followed by price: "Product Name 123.45"
            /^(.+?)\s+(\d+[.,]\d{2})\s*(?:KM|BAM)?$/i,
            // Quantity Product Price: "2x Product Name 123.45"
            /^\d+x?\s+(.+?)\s+(\d+[.,]\d{2})\s*(?:KM|BAM)?$/i,
            // Product | Price format
            /^(.+?)\s*[|:]\s*(\d+[.,]\d{2})\s*(?:KM|BAM)?$/i
        ];

        for (const line of lines) {
            // Skip header/footer lines
            if (this.isHeaderOrFooter(line)) continue;

            for (const pattern of productPatterns) {
                const match = line.match(pattern);
                if (match) {
                    const productName = match[1].trim();
                    const priceText = match[2];
                    const price = PriceParser.parsePrice(priceText);

                    if (productName.length > 3 && price > 0) {
                        products.push({
                            name: this.cleanProductName(productName),
                            price: price,
                            raw: line
                        });
                        break;
                    }
                }
            }
        }

        // Fallback: extract all prices and nearby text
        if (products.length === 0) {
            products.push(...this.extractProductsPriceHeuristic(lines));
        }

        return {
            rawText: text,
            products: products,
            count: products.length
        };
    }

    // Heuristic extraction when pattern matching fails
    extractProductsPriceHeuristic(lines) {
        const products = [];
        const priceRegex = /(\d+[.,]\d{2})\s*(?:KM|BAM)?/gi;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const priceMatches = [...line.matchAll(priceRegex)];

            if (priceMatches.length > 0) {
                // Get surrounding context (previous and current line)
                const context = i > 0 ? lines[i - 1] + ' ' + line : line;
                const productName = context.replace(priceRegex, '').trim();

                if (productName.length > 3) {
                    const price = PriceParser.parsePrice(priceMatches[0][1]);
                    if (price > 0) {
                        products.push({
                            name: this.cleanProductName(productName),
                            price: price,
                            raw: line
                        });
                    }
                }
            }
        }

        return products;
    }

    // Clean product name from invoice artifacts
    cleanProductName(name) {
        return name
            .replace(/^\d+x?\s*/i, '')  // Remove quantity
            .replace(/\s+/g, ' ')        // Normalize whitespace
            .replace(/[|:]\s*$/, '')     // Remove trailing separators
            .trim();
    }

    // Detect header/footer lines to skip
    isHeaderOrFooter(line) {
        const skipPatterns = [
            /^(račun|invoice|faktura|ukupno|total|suma|subtotal|pdv|vat|tax)/i,
            /^(datum|date|vrijeme|time|br\.|broj|number)/i,
            /^(hvala|thank you|dobrodošli|welcome)/i,
            /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/,  // Dates
            /^[-=_*]{3,}$/,                         // Separators
            /^(str|page)\s*\d+/i                    // Page numbers
        ];

        return skipPatterns.some(pattern => pattern.test(line));
    }
}

export default OCRProcessor;
