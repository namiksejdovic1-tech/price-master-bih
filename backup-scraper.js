const axios = require('axios');
const cheerio = require('cheerio');

const SHOPS = {
  "Domod": {
    "url_pattern": "https://domod.ba/pretraga?keywords={}",
    "product_card": ".item",
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

async function fetchPrice(shopName, query) {
  const config = SHOPS[shopName];
  const searchUrl = config.url_pattern.replace('{}', query.replace(/ /g, '+'));

  try {
    const response = await axios.get(searchUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Find first product card
    const card = $(config.product_card).first();
    if (!card.length) {
      return { shop: shopName, price: 0, url: searchUrl, found: false };
    }

    // Extract price - try multiple selectors
    let priceText = '';
    const priceSelectors = ['.price', '.regular-price', '.sale-price', '[class*="price"]', '.amount'];

    for (const selector of priceSelectors) {
      const priceEl = card.find(selector);
      if (priceEl.length > 0) {
        priceText = priceEl.first().text().trim();
        if (priceText) break;
      }
    }

    // If no price found with selectors, try to find any text containing "KM"
    if (!priceText) {
      const cardText = card.text();
      const kmMatch = cardText.match(/(\d+[.,]\d{2})\s*KM/i);
      if (kmMatch) {
        priceText = kmMatch[1];
      }
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
    const linkEl = card.find(config.link);
    let link = searchUrl;
    if (linkEl.length) {
      const href = linkEl.attr('href');
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
  try {
    // Scrape all shops concurrently
    const tasks = Object.keys(SHOPS).map(shopName =>
      fetchPrice(shopName, productName)
    );

    const results = await Promise.all(tasks);

    // Extract prices array
    const prices = results.map(r => r.found && r.price > 0 ? r.price : 0);

    return prices;

  } catch (error) {
    console.error('Backup scraper failed:', error);
    throw error;
  }
}

module.exports = { scrapeProduct };