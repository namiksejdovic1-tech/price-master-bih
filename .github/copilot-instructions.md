# AI Price Assistant - Copilot Instructions

## Architecture Overview

This is a Node.js Express application implementing a multi-layer web scraping system for price monitoring. **CommonJS only** - never use ES6 imports/exports.

### Core Components

- **`main.js`**: Express server with routes for scraping, analysis, and file uploads
- **`scraper.js`**: Primary Playwright scraper for JS-heavy sites
- **`backup-scraper.js`**: Axios + Cheerio fallback for static sites
- **`price-analysis.js`**: AI pricing logic with 🔴🟡🟢 recommendations
- **`queue.js`**: Concurrent scraping queue (max 2 browsers)
- **`cache.js`**: 12-hour price caching system

### Data Model

Products use this exact structure:
```javascript
{
  name: string,
  my_price: number,
  competitor_prices: number[],  // Array of 4 prices from competitors
  scraped_at: ISODate,
  source: "scraper" | "sheet" | "pdf" | "image" | "manual"
}
```

## Critical Patterns

### Scraping Architecture
- **Multi-layer**: Try Playwright first, fallback to Axios/Cheerio
- **Queue system**: Use `queue.add(async () => { ... })` for all scraping operations
- **Cache first**: Check `cache.get(productName)` before scraping
- **4 shops only**: Domod, eKupi, Technoshop, Tehnomag with site-specific selectors

### AI Analysis Logic
```javascript
// Exact pricing rules - DO NOT modify
if (my_price > competitor_average * 1.05) suggestion = "🔴";  // Too expensive
else if (my_price <= competitor_average) suggestion = "🟢";    // Competitive
else suggestion = "🟡";  // Can optimize (±5% range)
```

### Storage & Persistence
- **File-based**: Products stored in `products.json`
- **In-memory**: Load on startup, save on changes
- **Sorted by date**: Newest products first (`scraped_at DESC`)

### Error Handling
- **Defensive scraping**: Skip broken cards, return 0 for missing prices
- **Fail fast**: Timeout after 15s per site
- **Graceful degradation**: Continue with partial results

## Development Workflow

### Setup Commands
```bash
npm install
npx playwright install chromium
npm start  # Runs on port 8080
```

### Adding New Shops
1. Add to `SHOPS` object in both `scraper.js` and `backup-scraper.js`
2. Test selectors manually first
3. Update competitor_prices array logic (expects exactly 4 prices)

### Testing Scrapers
- Use browser dev tools to verify selectors
- Test with specific product names (avoid generics)
- Check both primary and backup scrapers

## Deployment Requirements

- **Node.js 18+** with CommonJS only
- **Docker**: Uses `node:18-slim` with Playwright browsers
- **Memory**: Minimum 2GB for Playwright
- **Allowed modules**: Only the 12 specified in package.json

## File Upload Handling

- **Multer**: Configured for `uploads/` directory
- **OCR**: Tesseract.js for images, pdf-parse for PDFs
- **Cleanup**: Delete uploaded files after processing
- **Invoice parsing**: Extract "Product Name | Price" format

## Cron Scheduling

- **Daily refresh**: `02:00` runs `node-cron` job
- **Manual refresh**: POST `/refresh/:index` endpoint
- **Background processing**: All scraping is queued

## UI Integration

- **EJS templates**: Located in `templates/` directory
- **Static files**: Served from `static/` directory
- **AJAX calls**: Use fetch API for analysis endpoint
- **Live updates**: Products appear immediately after scraping

## Security & Performance

- **Input validation**: Sanitize all form inputs
- **Rate limiting**: Queue prevents overwhelming sites
- **Memory management**: Close browsers after scraping
- **Error boundaries**: Try/catch around all async operations

## Common Pitfalls

- **Don't modify AI logic**: Pricing rules are business-critical
- **Test both scrapers**: Primary Playwright, backup Axios/Cheerio
- **Queue all scraping**: Never call scrapers directly
- **Maintain 4-price arrays**: System expects exactly 4 competitor prices
- **File cleanup**: Always delete uploaded files after processing