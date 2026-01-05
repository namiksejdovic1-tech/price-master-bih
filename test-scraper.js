// TEST SCRIPT - Verify scraper functionality
const ScraperEngine = require('./scraper/scraper');

async function testScraper() {
    console.log('\n========================================');
    console.log('🧪 TESTING SCRAPER ENGINE');
    console.log('========================================\n');

    const scraper = new ScraperEngine();

    try {
        // Test 1: Get random products from BijelaTehnika
        console.log('Test 1: Scraping BijelaTehnika.com...');
        console.log('🚀 Scraper started');

        const products = await scraper.getMyRandomProducts(10);

        console.log(`✅ Products found: ${products.length}\n`);

        if (products.length === 0) {
            console.error('❌ FAILED: No products scraped');
            process.exit(1);
        }

        // Display first 3 products
        console.log('📦 Sample products:\n');
        products.slice(0, 3).forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.name}`);
            console.log(`      Price: ${p.price} KM\n`);
        });

        console.log('========================================');
        console.log('✅ SCRAPER TEST PASSED');
        console.log('========================================\n');

        await scraper.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ SCRAPER TEST FAILED');
        console.error('Error:', error.message);
        console.error(error.stack);

        await scraper.close();
        process.exit(1);
    }
}

testScraper();
