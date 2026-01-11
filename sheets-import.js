const axios = require('axios');

async function importSheet(sheetUrl) {
  try {
    // For Google Sheets, convert to CSV export URL
    let csvUrl = sheetUrl;
    if (sheetUrl.includes('docs.google.com/spreadsheets')) {
      // Convert to CSV export URL
      const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
      }
    }

    const response = await axios.get(csvUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const csvData = response.data;
    const products = parseCSV(csvData);

    return products;

  } catch (error) {
    console.error('Sheet import error:', error);
    throw new Error('Failed to import from Google Sheets');
  }
}

function parseCSV(csvText) {
  const products = [];
  const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);

  for (const line of lines) {
    // Split by comma, but handle quoted values
    const columns = parseCSVLine(line);

    if (columns.length >= 2) {
      const name = columns[0].trim();
      const priceStr = columns[1].trim().replace(',', '.');

      const price = parseFloat(priceStr);

      if (!isNaN(price) && price > 0) {
        products.push({
          name,
          my_price: price,
          competitor_prices: []
        });
      }
    }
  }

  return products;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

module.exports = { import: importSheet };