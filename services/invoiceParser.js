const PRICE_REGEX = /(\d+[.,]\d{2})\s?(KM|BAM)/i;

export function parseInvoiceText(text) {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 4);

  const products = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // preskačemo zaglavlja
    if (
      /ukupno|subtotal|pdv|total|račun|faktura/i.test(line)
    ) continue;

    const priceMatch = line.match(PRICE_REGEX);

    if (priceMatch) {
      const price = parseFloat(
        priceMatch[1].replace(",", ".")
      );

      // naziv proizvoda je:
      // ili isti red prije cijene
      // ili prethodni red
      const name =
        line.replace(PRICE_REGEX, "").trim() ||
        lines[i - 1];

      if (name && price) {
        products.push({
          name: cleanName(name),
          priceWithVAT: Number(price.toFixed(2)),
          currency: "KM",
        });
      }
    }
  }

  return products;
}

function cleanName(name) {
  return name
    .replace(/[^\w\d\s\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
