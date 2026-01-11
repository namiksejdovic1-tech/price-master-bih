const { chromium } = require('playwright');

const SHOPS = {
  "Domod": {
    "url_pattern": "https://domod.ba/pretraga?keywords={}",
    "product_card": ".product-item",
    "price": ".price",
    "link": "a"
  },
  "eKupi": {
    "url_pattern": "https://www.ekupi.ba/bs/search/?text={}",
    "product_card": ".product-item",
    "price": ".price",
    "link": "a.name"
  },
  "Technoshop": {
    "url_pattern": "https://technoshop.ba/pretraga?keywords={}",
    "product_card": ".product-card",
    "price": ".price-new",
    "link": ".product-title a"
  },
  "Tehnomag": {
    "url_pattern": "https://tehnomag.com/pretraga?keywords={}",
    "product_card": ".product-layout",
    "price": ".price-new",
    "link": ".image a"
  }
};

async function fetchPrice(page, shopName, query) {
  const config = SHOPS[shopName];
  const searchUrl = config.url_pattern.replace('{}', query.replace(/ /g, '+'));

  try {
    // Navigate with longer timeout
    await page.goto(searchUrl, { timeout: 15000, waitUntil: 'domcontentloaded' });

    // Wait for body to load
    await page.waitForSelector('body', { timeout: 10000 });

    // Look for first product
    const card = await page.$(config.product_card);
    if (!card) {
      return { shop: shopName, price: 0, url: searchUrl, found: false };
    }

    // Extract price
    const priceEl = await card.$(config.price);
    let priceText = '';
    if (priceEl) {
      priceText = await priceEl.innerText();
    }

    // Clean price (convert "1.299,00 KM" to 1299.00)
    let cleanPrice = priceText.replace(/[^\d,]/g, '').replace(',', '.');

    // Fix cases with multiple dots (1.200.00 -> 1200.00)
    const dotCount = (cleanPrice.match(/\./g) || []).length;
    if (dotCount > 1) {
      cleanPrice = cleanPrice.replace(/\./g, '', dotCount - 1);
    }

    let finalPrice = 0;
    try {
      finalPrice = parseFloat(cleanPrice);
      if (isNaN(finalPrice)) finalPrice = 0;
    } catch (e) {
      finalPrice = 0;
    }

    // Extract link
    const linkEl = await card.$(config.link);
    let link = searchUrl;
    if (linkEl) {
      const href = await linkEl.getAttribute('href');
      if (href) {
        link = href.startsWith('http') ? href : new URL(href, searchUrl).href;
      }
    }

    return {
      shop: shopName,
      price: finalPrice,
      url: link,
      found: finalPrice > 0
    };

  } catch (error) {
    console.warn(`⚠️ Error scraping ${shopName}: ${error.message.substring(0, 100)}...`);
    return { shop: shopName, price: 0, url: searchUrl, found: false };
  }
}

async function scrapeProduct(productName) {
  let browser;
  try {
    // Launch browser with hardened settings
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });

    // Create pages for each shop
    const pages = await Promise.all(
      Object.keys(SHOPS).map(() => context.newPage())
    );

    // Scrape all shops concurrently
    const tasks = pages.map((page, index) =>
      fetchPrice(page, Object.keys(SHOPS)[index], productName)
    );

    const results = await Promise.all(tasks);

    // Extract prices array
    const prices = results.map(r => r.found && r.price > 0 ? r.price : 0);

    return prices;

  } catch (error) {
    console.error('Playwright scraper failed:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { scrapeProduct };