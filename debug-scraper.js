const { chromium } = require('playwright');

async function testScraper() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Test Domod
    console.log('Testing Domod...');
    await page.goto('https://domod.ba/pretraga?keywords=samsung+tv', { timeout: 15000 });

    // Wait and check if products load
    await page.waitForTimeout(3000);

    // Try different possible selectors
    const selectors = [
      '.product-item',
      '.product',
      '.item',
      '[class*="product"]',
      '.card',
      '.product-card',
      'article',
      '.search-result'
    ];

    for (const selector of selectors) {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        break;
      }
    }

    // Check for any elements that might contain product info
    const allDivs = await page.$$('div');
    console.log(`Total div elements: ${allDivs.length}`);

    // Look for price-related elements
    const priceSelectors = ['.price', '[class*="price"]', '.amount', '.cost', '.cijena', '.regular-price', '.sale-price'];
    for (const selector of priceSelectors) {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} price elements with selector: ${selector}`);
        if (elements.length > 0) {
          const text = await elements[0].innerText();
          console.log(`First price text: "${text}"`);
        }
        break;
      }
    }

    // Check for any spans or divs that might contain prices
    const spans = await page.$$('span');
    console.log(`Total spans: ${spans.length}`);

    // Look for elements containing "KM" or price-like patterns
    const allElements = await page.$$('*');
    let priceElements = [];
    for (let i = 0; i < Math.min(allElements.length, 50); i++) {
      const text = await allElements[i].innerText();
      if (text && (text.includes('KM') || /^\d+[.,]\d{2}$/.test(text.trim()))) {
        priceElements.push(text.trim());
      }
    }
    console.log('Potential price elements found:', priceElements.slice(0, 5));

    // Get page title and URL to confirm we're on the right page
    const title = await page.title();
    const url = page.url();
    console.log(`Page title: ${title}`);
    console.log(`Page URL: ${url}`);

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testScraper();