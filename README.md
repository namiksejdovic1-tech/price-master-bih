# Price Master BIH - Admin Dashboard

Professional price intelligence dashboard for analyzing competitor prices in Bosnia and Herzegovina.

## Features

- ✅ Manual product entry
- ✅ OCR invoice/image upload (Tesseract.js)
- ✅ Real-time competitor price scraping (Domod, Ekupi, Technoshop, Tehnomag)
- ✅ Advanced fuzzy matching for product comparison
- ✅ AI-powered price recommendations
- ✅ Competitive index calculation
- ✅ Fast search and advanced filters
- ✅ Pagination (6 products per page)
- ✅ Responsive premium UI with dark theme
- ✅ Sticky table headers

## Tech Stack

**Backend:**
- Node.js + Express
- Puppeteer (web scraping)
- Tesseract.js (OCR)
- Fuzzball (fuzzy matching)

**Frontend:**
- Vanilla HTML/CSS/JavaScript
- Modern responsive design
- Premium dark theme

## Installation

```bash
# Install dependencies
npm install

# Set environment variables (optional)
cp .env.example .env

# Start development server
npm run dev

# Start production server
npm start
```

## Deployment to Render

1. Push code to GitHub repository
2. Connect repository to Render
3. Configure build command: `./build.sh`
4. Configure start command: `node server.js`
5. Add environment variable: `NODE_ENV=production`

## API Endpoints

- `GET /` - Frontend dashboard
- `GET /api/products` - Get all products (with filters and pagination)
- `POST /api/products/manual` - Add manual product
- `POST /api/products/ocr` - Upload invoice for OCR
- `POST /api/products/:id/refresh` - Refresh competitor data
- `DELETE /api/products/:id` - Delete product
- `POST /api/scrape-random` - Scrape random products from Bijela Tehnika

## Environment Variables

```env
PORT=3000
NODE_ENV=production
CRON_SCHEDULE=0 */6 * * *
```

## Architecture

```
price-master-bih/
├── scraper/
│   ├── shops/
│   │   ├── bijelatehnika.js
│   │   ├── domod.js
│   │   ├── ekupi.js
│   │   ├── tehnomag.js
│   │   └── technoshop.js
│   ├── utils/
│   │   ├── cookies.js
│   │   ├── price.js
│   │   ├── fuzzy.js
│   │   ├── ocr.js
│   │   └── aiAdvisor.js
│   └── scraper.js
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── server.js
├── package.json
└── build.sh
```

## Competitor Websites

- Domod: https://domod.ba/pretraga?keywords=
- Ekupi: https://www.ekupi.ba/bs/search/?text=
- Technoshop: https://technoshop.ba/proizvodi?pretraga=
- Tehnomag: https://tehnomag.com/proizvodi/?search_q=

## License

MIT

## Author

Price Master BIH Team
