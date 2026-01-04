// Main scraper orchestrator
const puppeteer = require('puppeteer');
const domod = require('./shops/domod');
const ekupi = require('./shops/ekupi');
const technoshop = require('./shops/technoshop');
const tehnomag = require('./shops/tehnomag');
const bijelatehnika = require('./shops/bijelatehnika');
const aiAdvisor = require('./utils/aiAdvisor');

class ScraperEngine {
    constructor() {
        this.browser = null;
        this.shops = [domod, ekupi, technoshop, tehnomag];
    }

    async getBrowser() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--disable-features=IsolateOrigins',
                    '--disable-site-isolation-trials'
                ],
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium'
            });
        }
        return this.browser;
    }

    async scrapeProduct(productName, myPrice) {
        console.log(`\n🔍 Scraping: ${productName}`);

        const browser = await this.getBrowser();
        const results = {};

        // Scrape all shops in parallel
        const promises = this.shops.map(shop =>
            shop.scrape(browser, productName)
                .then(result => ({ shop: shop.name, result }))
                .catch(error => {
                    console.error(`${shop.name} error:`, error.message);
                    return {
                        shop: shop.name,
                        result: { found: false, price: 0, url: '', productName: '', matchScore: 0 }
                    };
                })
        );

        const shopResults = await Promise.all(promises);

        // Organize results
        shopResults.forEach(({ shop, result }) => {
            results[shop] = result;
        });

        // Calculate AI advisor recommendation
        const competitorPrices = Object.values(results)
            .filter(r => r.found)
            .map(r => r.price);

        const analysis = aiAdvisor.analyze(myPrice, competitorPrices);

        return {
            product: productName,
            myPrice: myPrice,
            competitors: results,
            analysis: analysis.competitiveIndex,
            aiAdvisor: {
                recommendation: analysis.recommendation,
                message: analysis.message,
                strategy: analysis.strategy,
                marketData: analysis.marketData
            },
            timestamp: new Date().toISOString()
        };
    }

    async scrapeMultipleProducts(products) {
        const results = [];

        for (const product of products) {
            const result = await this.scrapeProduct(product.name, product.price);
            results.push(result);

            // Small delay between products to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return results;
    }

    async refreshProduct(product) {
        return await this.scrapeProduct(product.product, product.myPrice);
    }

    async getMyRandomProducts(count = 10) {
        console.log(`\n📦 Fetching ${count} random products from BijelaTehnika...`);

        const browser = await this.getBrowser();
        const products = await bijelatehnika.getRandomProducts(browser, count);

        console.log(`✅ Found ${products.length} products`);
        return products;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

module.exports = ScraperEngine;
