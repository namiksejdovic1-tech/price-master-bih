import puppeteer from 'puppeteer';
import { PriceParser } from '../utils/price.js';
import { CookieManager } from '../utils/cookies.js';

export class TehnomagScraper {
    constructor() {
        this.baseUrl = 'https://tehnomag.com';
        this.searchUrl = 'https://tehnomag.com/proizvodi/?search_q=';
        this.name = 'Tehnomag';
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

            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
            });

            const searchQuery = encodeURIComponent(productName);
            const url = `${this.searchUrl}${searchQuery}`;

            console.log(`Scraping Tehnomag: ${url}`);
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            await CookieManager.randomDelay(500, 1500);

            const result = await page.evaluate(() => {
                const selectors = [
                    '.product-layout',
                    '.product-item',
                    '.product',
                    '[data-product]'
                ];

                let card = null;
                for (const sel of selectors) {
                    card = document.querySelector(sel);
                    if (card) break;
                }

                if (!card) return null;

                // Name
                const nameSelectors = [
                    '.product-name a',
                    '.product-title a',
                    'h4 a',
                    'a[title]'
                ];
                let nameEl = null;
                for (const sel of nameSelectors) {
                    nameEl = card.querySelector(sel);
                    if (nameEl) break;
                }

                // Price - prefer .price-new over .price
                const priceSelectors = [
                    '.price-new',
                    '.price',
                    '.product-price',
                    '[class*="price"]'
                ];
                let priceEl = null;
                for (const sel of priceSelectors) {
                    priceEl = card.querySelector(sel);
                    if (priceEl && priceEl.textContent.match(/\d/)) break;
                }

                // Link - try .image a first
                let linkEl = card.querySelector('.image a') || card.querySelector('a');

                return {
                    name: nameEl ? nameEl.textContent.trim() : '',
                    priceText: priceEl ? priceEl.textContent.trim() : '',
                    link: linkEl ? linkEl.getAttribute('href') : ''
                };
            });

            if (!result || !result.name || !result.priceText) {
                console.log('Tehnomag: No valid product found');
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
            console.error('Tehnomag scraping error:', error.message);
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

export default TehnomagScraper;
