import DomodScraper from './shops/domod.js';
import EkupiScraper from './shops/ekupi.js';
import TehnomagScraper from './shops/tehnomag.js';
import TechnoshopScraper from './shops/technoshop.js';
import BijelaTehnikaScraper from './shops/bijelatehnika.js';
import FuzzyMatcher from './utils/fuzzy.js';
import AIAdvisor from './utils/aiAdvisor.js';

export class ScraperEngine {
    constructor() {
        this.competitors = {
            domod: new DomodScraper(),
            ekupi: new EkupiScraper(),
            tehnomag: new TehnomagScraper(),
            technoshop: new TechnoshopScraper()
        };
        this.myShop = new BijelaTehnikaScraper();
    }

    // Scrape all competitors for a product
    async scrapeProduct(productName, myPrice = 0) {
        console.log(`\n🔍 Scraping product: ${productName}`);

        const results = {
            product: productName,
            myPrice: myPrice,
            timestamp: new Date().toISOString(),
            competitors: {},
            analysis: {}
        };

        // Scrape all competitors in parallel
        const competitorPromises = Object.entries(this.competitors).map(
            async ([key, scraper]) => {
                try {
                    const result = await scraper.searchProduct(productName);
                    return [key, result];
                } catch (error) {
                    console.error(`Error scraping ${key}:`, error);
                    return [key, {
                        shop: scraper.name,
                        price: 0,
                        url: '',
                        found: false,
                        name: ''
                    }];
                }
            }
        );

        const competitorResults = await Promise.all(competitorPromises);

        // Process results with fuzzy matching
        for (const [key, result] of competitorResults) {
            if (result.found && result.name) {
                // Calculate match score
                const matchScore = FuzzyMatcher.matchScore(productName, result.name);
                result.matchScore = matchScore;

                // Only include if match is good enough
                if (matchScore >= 60) {
                    results.competitors[result.shop] = result;
                } else {
                    console.log(`⚠️ Poor match for ${result.shop}: ${matchScore}% - "${result.name}"`);
                    results.competitors[result.shop] = {
                        ...result,
                        found: false,
                        price: 0,
                        note: 'Poor product match'
                    };
                }
            } else {
                results.competitors[result.shop] = result;
            }
        }

        // Calculate analysis
        const competitorPrices = Object.values(results.competitors)
            .filter(c => c.found && c.price > 0)
            .map(c => c.price);

        if (competitorPrices.length > 0) {
            const minPrice = Math.min(...competitorPrices);
            const maxPrice = Math.max(...competitorPrices);
            const avgPrice = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length;

            results.analysis = {
                minCompetitorPrice: Math.round(minPrice * 100) / 100,
                maxCompetitorPrice: Math.round(maxPrice * 100) / 100,
                avgCompetitorPrice: Math.round(avgPrice * 100) / 100,
                competitorsFound: competitorPrices.length,
                competitiveIndex: myPrice > 0 ? AIAdvisor.calculateCompetitiveIndex(myPrice, competitorPrices) : 50
            };

            // AI Advisor recommendations
            if (myPrice > 0) {
                const advice = AIAdvisor.calculateRecommendedPrice(myPrice, competitorPrices);
                results.aiAdvisor = advice;
                results.alerts = AIAdvisor.generateAlerts(myPrice, competitorPrices, advice.recommendedPrice);
            }
        } else {
            results.analysis = {
                minCompetitorPrice: 0,
                maxCompetitorPrice: 0,
                avgCompetitorPrice: 0,
                competitorsFound: 0,
                competitiveIndex: 50
            };
            results.alerts = ['⚠️ No competitor data available'];
        }

        return results;
    }

    // Scrape multiple products
    async scrapeMultipleProducts(productList) {
        const results = [];

        for (const item of productList) {
            const productName = typeof item === 'string' ? item : item.name;
            const myPrice = typeof item === 'object' ? item.price : 0;

            try {
                const result = await this.scrapeProduct(productName, myPrice);
                results.push(result);

                // Small delay between products to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.error(`Error scraping ${productName}:`, error);
                results.push({
                    product: productName,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }

        return results;
    }

    // Get random products from my shop
    async getMyRandomProducts(count = 10) {
        console.log(`\n📦 Fetching ${count} random products from Bijela Tehnika...`);
        return await this.myShop.scrapeRandomProducts(count);
    }

    // Refresh competitor data for existing product
    async refreshProduct(productData) {
        return await this.scrapeProduct(productData.product, productData.myPrice);
    }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const engine = new ScraperEngine();

    const testProduct = process.argv[2] || 'Samsung TV';
    const testPrice = parseFloat(process.argv[3]) || 1500;

    console.log('🚀 Price Master BIH - Scraper Engine\n');

    const result = await engine.scrapeProduct(testProduct, testPrice);
    console.log('\n📊 Results:');
    console.log(JSON.stringify(result, null, 2));
}

export default ScraperEngine;
