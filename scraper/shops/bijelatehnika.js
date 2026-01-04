import puppeteer from 'puppeteer';
import { PriceParser } from '../utils/price.js';
import { CookieManager } from '../utils/cookies.js';

export class BijelaTehnikaScraper {
    constructor() {
        this.baseUrl = 'https://bijelatehnika.com';
        this.name = 'Bijela Tehnika';
    }

    // Scrape random products from homepage
    async scrapeRandomProducts(count = 10) {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        try {
            const page = await browser.newPage();
            await page.setUserAgent(CookieManager.getHeaders()['User-Agent']);

            console.log(`Loading ${this.baseUrl}...`);
            await page.goto(this.baseUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            await CookieManager.randomDelay(1000, 2000);

            // Try multiple selectors for product cards
            const products = await page.evaluate(() => {
                const selectors = [
                    '.product-item',
                    '.product-card',
                    '.product',
                    '[data-product]',
                    '.item-product'
                ];

                let elements = [];
                for (const selector of selectors) {
                    elements = Array.from(document.querySelectorAll(selector));
                    if (elements.length > 0) break;
                }

                return elements.slice(0, 20).map(el => {
                    // Try multiple selectors for name
                    const nameEl = el.querySelector('h3, h4, .product-name, .product-title, a[title]');
                    const name = nameEl ?
                        (nameEl.getAttribute('title') || nameEl.textContent.trim()) :
                        '';

                    // Try multiple selectors for price
                    const priceEl = el.querySelector('.price, .product-price, [class*="price"]');
                    const priceText = priceEl ? priceEl.textContent.trim() : '';

                    // Try to get link
                    const linkEl = el.querySelector('a');
                    const link = linkEl ? linkEl.getAttribute('href') : '';

                    return { name, priceText, link };
                }).filter(p => p.name && p.priceText);
            });

            const formattedProducts = products.map(p => ({
                name: p.name,
                price: PriceParser.parsePrice(p.priceText),
                url: p.link.startsWith('http') ? p.link : this.baseUrl + p.link,
                shop: this.name
            })).filter(p => p.price > 0);

            // Shuffle and return requested count
            const shuffled = formattedProducts.sort(() => 0.5 - Math.random());
            return shuffled.slice(0, count);

        } catch (error) {
            console.error('Bijela Tehnika scraping error:', error);
            return [];
        } finally {
            await browser.close();
        }
    }

    // Search for specific product
    async searchProduct(productName) {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();
            await page.setUserAgent(CookieManager.getHeaders()['User-Agent']);

            const searchUrl = `${this.baseUrl}/pretraga?q=${encodeURIComponent(productName)}`;
            await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

            const result = await page.evaluate(() => {
                const selectors = ['.product-item', '.product-card', '.product'];
                let card = null;

                for (const sel of selectors) {
                    card = document.querySelector(sel);
                    if (card) break;
                }

                if (!card) return null;

                const nameEl = card.querySelector('h3, h4, .product-name, .product-title');
                const priceEl = card.querySelector('.price, .product-price');
                const linkEl = card.querySelector('a');

                return {
                    name: nameEl ? nameEl.textContent.trim() : '',
                    priceText: priceEl ? priceEl.textContent.trim() : '',
                    link: linkEl ? linkEl.getAttribute('href') : ''
                };
            });

            if (!result) return null;

            return {
                name: result.name,
                price: PriceParser.parsePrice(result.priceText),
                url: result.link.startsWith('http') ? result.link : this.baseUrl + result.link,
                shop: this.name
            };

        } catch (error) {
            console.error('Bijela Tehnika search error:', error);
            return null;
        } finally {
            await browser.close();
        }
    }
}

export default BijelaTehnikaScraper;
