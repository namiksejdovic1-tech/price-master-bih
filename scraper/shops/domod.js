import puppeteer from 'puppeteer';
import { PriceParser } from '../utils/price.js';
import { CookieManager } from '../utils/cookies.js';

export class DomodScraper {
    constructor() {
        this.baseUrl = 'https://domod.ba';
        this.searchUrl = 'https://domod.ba/pretraga?keywords=';
        this.name = 'Domod';
    }

    async searchProduct(productName) {
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        try {
            const page = await browser.newPage();
            await page.setUserAgent(CookieManager.getHeaders()['User-Agent']);
            await page.setExtraHTTPHeaders(CookieManager.getHeaders());

            // Stealth mode
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
            });

            const searchQuery = encodeURIComponent(productName);
            const url = `${this.searchUrl}${searchQuery}`;

            console.log(`Scraping Domod: ${url}`);
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            await CookieManager.randomDelay(500, 1500);

            const result = await page.evaluate(() => {
                // Try multiple selectors
                const selectors = [
                    '.product-item',
                    '.product-card',
                    '.product-grid-item',
                    '[data-product-id]',
                    '.product'
                ];

                let card = null;
                for (const sel of selectors) {
                    card = document.querySelector(sel);
                    if (card) break;
                }

                if (!card) return null;

                // Extract name
                const nameSelectors = [
                    '.product-name a',
                    '.product-title a',
                    'h3 a',
                    'h4 a',
                    'a.product-link'
                ];
                let nameEl = null;
                for (const sel of nameSelectors) {
                    nameEl = card.querySelector(sel);
                    if (nameEl) break;
                }

                // Extract price
                const priceSelectors = [
                    '.price .price-new',
                    '.product-price',
                    '.price',
                    '[class*="price"]'
                ];
                let priceEl = null;
                for (const sel of priceSelectors) {
                    priceEl = card.querySelector(sel);
                    if (priceEl && priceEl.textContent.match(/\d/)) break;
                }

                // Extract link
                let linkEl = card.querySelector('a');

                return {
                    name: nameEl ? nameEl.textContent.trim() : '',
                    priceText: priceEl ? priceEl.textContent.trim() : '',
                    link: linkEl ? linkEl.getAttribute('href') : ''
                };
            });

            if (!result || !result.name || !result.priceText) {
                console.log('Domod: No valid product found');
                return {
                    shop: this.name,
                    price: 0,
                    url: url,
                    found: false,
                    name: ''
                };
            }

            const price = PriceParser.parsePrice(result.priceText);
            const productUrl = result.link.startsWith('http') ?
                result.link :
                this.baseUrl + result.link;

            return {
                shop: this.name,
                name: result.name,
                price: price,
                url: productUrl,
                found: price > 0
            };

        } catch (error) {
            console.error('Domod scraping error:', error.message);
            return {
                shop: this.name,
                price: 0,
                url: this.searchUrl + encodeURIComponent(productName),
                found: false,
                name: ''
            };
        } finally {
            await browser.close();
        }
    }
}

export default DomodScraper;
