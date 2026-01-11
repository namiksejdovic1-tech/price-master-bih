const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');

async function parse(filePath, fileMeta = {}) {
  const originalName = fileMeta.originalName || '';
  const mimeType = fileMeta.mimeType || '';
  const ext = path.extname(originalName || filePath).toLowerCase();
  const isPdf = ext === '.pdf' || mimeType === 'application/pdf';

  let text = '';

  if (isPdf) {
    // Parse PDF
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    text = data.text;
  } else {
    // OCR for images
    const worker = await createWorker('bos'); // Bosnian language
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789., KM'
    });

    const { data: { text: ocrText } } = await worker.recognize(filePath);
    text = ocrText;
    await worker.terminate();
  }

  // Parse text to extract products
  const products = parseInvoiceText(text);

  return products;
}

function parseInvoiceText(text) {
  const products = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);

  const headerStop = [
    'RBŠifraNaziv',
    'ŠifraNaziv',
    'Cijena sa',
    'Vrijednost',
    'PDV broj',
    'PORESKE STOPE',
    'Ukupno',
    'Za platiti'
  ];

  const parsePriceToken = (value) => {
    if (!value) return null;
    let cleaned = value.replace(/\s/g, '').replace(/[^\d.,]/g, '');
    if (!cleaned) return null;
    if (cleaned.includes('.') && cleaned.includes(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',') && !cleaned.includes('.')) {
      cleaned = cleaned.replace(',', '.');
    } else if (cleaned.includes('.') && !cleaned.includes(',')) {
      const parts = cleaned.split('.');
      if (parts[parts.length - 1].length === 3) {
        cleaned = cleaned.replace(/\./g, '');
      }
    }
    const num = parseFloat(cleaned);
    return Number.isNaN(num) ? null : num;
  };

  const isHeaderLine = (line) => headerStop.some((token) => line.includes(token));
  const isMostlyNumeric = (line) => /[\d.,]/.test(line) && !/[A-Za-zČĆŽŠĐčćžšđ]/.test(line);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const qtyMatch = line.match(/(\d+[.,]\d{2})\s*KOM/i) || line.match(/(\d+[.,]\d{2})KOM/i);
    if (!qtyMatch) {
      const singleMatch = line.match(/^(.+?)\s+(\d+[.,]\d{2})(?:\s*KM)?$/i);
      if (singleMatch) {
        const name = singleMatch[1].trim();
        const price = parsePriceToken(singleMatch[2]);
        if (price && price > 0) {
          products.push({ name, my_price: price, competitor_prices: [] });
        }
      }
      continue;
    }

    const qty = parsePriceToken(qtyMatch[1]);
    if (!qty || qty <= 0) continue;

    const nameParts = [];
    for (let j = i - 1; j >= 0 && nameParts.length < 4; j -= 1) {
      const prev = lines[j];
      if (!prev || isHeaderLine(prev)) break;
      if (isMostlyNumeric(prev)) continue;
      nameParts.unshift(prev);
    }
    const name = nameParts.join(' ').replace(/\s+/g, ' ').trim();
    if (!name) continue;

    const priceTokens = [];
    for (let k = i; k < Math.min(lines.length, i + 12); k += 1) {
      if (isHeaderLine(lines[k])) break;
      const matches = lines[k].match(/\d[\d.,]*/g) || [];
      matches.forEach((match) => {
        const price = parsePriceToken(match);
        if (price) priceTokens.push(price);
      });
    }

    if (priceTokens.length === 0) continue;
    const totalWithVat = Math.max(...priceTokens);
    const unitPrice = totalWithVat / qty;

    products.push({
      name,
      my_price: Math.round(unitPrice * 100) / 100,
      competitor_prices: []
    });
  }

  return products;
}

module.exports = { parse };
