# AI Price Assistant - Bijela Tehnika

Production-safe price monitoring and analysis system for white-goods webshop using multi-layer scraping with AI-powered price optimization.

## Features

- **Multi-layer scraping**: Playwright primary + Axios/Cheerio backup
- **AI price analysis**: Intelligent pricing recommendations (🔴🟡🟢)
- **Multiple input sources**: Manual entry, PDF/Image OCR, Google Sheets import
- **Production-hardened**: Queue system, caching, error handling
- **Modern UI**: Responsive dashboard with real-time updates
- **Cloud-native**: Optimized for Google Cloud Run and Render.com

## Tech Stack

- **Runtime**: Node.js 18 LTS
- **Backend**: Express.js with CommonJS
- **Scraping**: Playwright 1.40.1 + Axios/Cheerio
- **AI Analysis**: Pure JavaScript logic
- **OCR**: Tesseract.js for image processing
- **PDF Parsing**: pdf-parse
- **Scheduling**: node-cron
- **Frontend**: EJS templates with Tailwind CSS
- **Deployment**: Docker container

## Local Development

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Start development server
npm start
```

Server will be available at http://localhost:8080

## Deployment

### Google Cloud Run

1. Build and push Docker image:
```bash
gcloud builds submit --tag gcr.io/PROJECT-ID/ai-price-assistant
```

2. Deploy to Cloud Run:
```bash
gcloud run deploy ai-price-assistant \
  --image gcr.io/PROJECT-ID/ai-price-assistant \
  --platform managed \
  --memory 2Gi \
  --port 8080 \
  --allow-unauthenticated
```

### Render.com

1. Connect GitHub repository
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Configure environment variables if needed

## Usage

### Manual Product Entry
Add products with your prices for tracking.

### Price Scraping
Search competitor prices for specific products. Uses multi-layer scraping:
1. Primary: Playwright (JS-heavy sites)
2. Backup: Axios + Cheerio (static sites)

### File Upload
Upload PDF or image invoices for automatic product extraction using OCR.

### Google Sheets Import
Import products from public Google Sheets (CSV export format).

### AI Price Analysis
Get intelligent pricing recommendations based on competitor analysis.

## Data Model

Products are stored with the following structure:
```json
{
  "name": "Bosch Frižider KGN39VLDA",
  "my_price": 850.50,
  "competitor_prices": [820.00, 950.00, 875.00, 890.00],
  "scraped_at": "2024-01-10T10:30:00.000Z",
  "source": "scraper" | "sheet" | "pdf" | "image" | "manual"
}
```

## AI Price Analysis Logic

The AI analysis provides three recommendation levels:

- **🔴 Too expensive**: Your price > competitor average + 5%
- **🟡 Can optimize**: Your price within ±5% of competitor average
- **🟢 Competitive**: Your price ≤ competitor average

## Scraping Configuration

Currently supports 4 Bosnian e-commerce sites:
- Domod (domod.ba)
- eKupi (ekupi.ba)
- Technoshop (technoshop.ba)
- Tehnomag (tehnomag.com)

Each site has custom selectors for reliable price extraction.

## Performance Optimizations

- **Queue system**: Max 2 concurrent scraping operations
- **Caching**: 12-hour cache for scraped prices
- **Fail-fast**: Quick detection of blocked sites
- **Memory management**: Proper browser cleanup

## API Endpoints

- `GET /` - Dashboard
- `POST /add-product` - Manual product entry
- `POST /scrape` - Scrape competitor prices
- `POST /refresh/:index` - Refresh specific product
- `POST /analyze` - Run AI price analysis
- `POST /upload-invoice` - Upload PDF/Image invoice
- `POST /import-sheets` - Import from Google Sheets
- `GET /api/products` - JSON API for products

## Environment Variables

- `PORT` - Server port (default: 8080)
- `NODE_ENV` - Environment (development/production)

## File Structure

```
├── main.js              # Express server
├── scraper.js           # Playwright scraper
├── backup-scraper.js    # Axios/Cheerio backup
├── price-analysis.js    # AI analysis logic
├── invoice-parser.js    # PDF/Image OCR parser
├── sheets-import.js     # Google Sheets importer
├── queue.js             # Scraping queue
├── cache.js             # Price caching
├── templates/
│   └── dashboard.html   # Main UI
├── static/
│   └── service-worker.js
├── uploads/             # Temporary file uploads
├── products.json        # Product storage
├── package.json
├── Dockerfile
└── README.md
```

## Security & Production Readiness

- ✅ CommonJS only (no ES modules)
- ✅ Hardened Playwright configuration
- ✅ Multi-layer scraping fallback
- ✅ Input validation and sanitization
- ✅ File upload restrictions
- ✅ Error handling and logging
- ✅ Health checks for Cloud Run
- ✅ Memory and performance optimized
- ✅ Queue system prevents overload
- ✅ Cache reduces external API calls

## Cron Jobs

- **Daily refresh**: Runs at 02:00, updates all scraped products
- **Manual refresh**: Available per product via UI

## Troubleshooting

### Scraping Issues
- Check browser console for Playwright errors
- Verify site selectors haven't changed
- Ensure sufficient memory allocation

### OCR Issues
- PDF parsing works best with text-based PDFs
- Images should be high-contrast for better OCR
- Supported formats: PDF, JPG, PNG

### Deployment Issues
- Ensure 2GB memory allocation for Playwright
- Check Cloud Run logs for startup errors
- Verify all dependencies are installed in Docker
- URL pattern za pretragu sa `{}` placeholderom
- CSS selektore za kartice proizvoda, cijene i linkove
- Site-specific anti-bot zahtjeve

### Simulacija ljudskog ponašanja
- **Browser Stealth**: `--disable-blink-features=AutomationControlled` flag
- **User-Agent rotacija**: 5 realnih browser signatura
- **Random delays**: 2-7 sekundi između skeniranja konkurenata, 1-2 sekunde za interakcije sa stranicom
- **Natural navigation**: Prvo posjeti homepage, zatim search page
- **Mouse simulation**: Random cursor movements
- **Cookie handling**: Auto-dismiss consent banners
- **Locale matching**: `bs-BA` locale i Sarajevo timezone

### Ekstrakcija cijena
- Ekstrahuje iz prvih 3 rezultata pretrage za reprezentativno cijene
- Višestruki fallback selektori za elemente cijena
- Čišćenje teksta: ukloni "KM", "BAM", handle decimal formatting
- Sanity checks: cijene između 10-50000 BAM
- Fallback pricing: ±15% od referentne cijene ako scraping faila

## Struktura podataka

Rezultati se vraćaju u formatu:
```json
{
  "product": "Bosch Frižider KGN39VLDA",
  "competitors": {
    "Domod": {"shop": "Domod", "price": 850.50, "url": "...", "found": true},
    "eKupi": {"shop": "eKupi", "price": 820.00, "url": "...", "found": true},
    "Technoshop": {"shop": "Technoshop", "price": 950.00, "url": "...", "found": true},
    "Tehnomag": {"shop": "Tehnomag", "price": 875.00, "url": "...", "found": true}
  },
  "min_price": 820.00
}
```

## PWA Implementacija

- Manifest se servira sa `/manifest.json` route
- Service worker se servira sa `/static/service-worker.js`
- Ikone: 192x192 i 512x512 PNG fajlovi u `/static/`
- Offline podrška za keširani dashboard

## Error Handling

- Graceful degradation: fallback cijene ako scraping faila
- Try/catch blokovi oko svih Playwright operacija
- Timeout handling (15s po konkurentu)
- Logging sa emoji indikatorima (✅ success, ⚠️ warning, ❌ error)

## Deployment Gotchas

- **Memory**: Mora biti 2 GiB minimum za Playwright browser
- **Port**: Koristi `PORT` environment variable (Cloud Run default 8080)
- **Health Check**: `/health` endpoint potreban za Cloud Run
- **Workers**: Single worker (`--workers 1`) zbog Playwright
- **File Permissions**: `products.json` needs write permissions