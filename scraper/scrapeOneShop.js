export async function scrapeOneShop(page, shop, productName) {
  await page.goto(shop.search(productName), {
    waitUntil: "networkidle2",
    timeout: 60000
  });

  await page.waitForTimeout(2000);

  return await page.evaluate((shop) => {
    const item = document.querySelector(shop.item);
    if (!item) return null;

    const titleEl = item.querySelector(shop.title);
    const priceEl = item.querySelector(shop.price);

    if (!titleEl || !priceEl) return null;

    const rawPrice = priceEl.innerText
      .replace(/[^\d,\.]/g, "")
      .replace(",", ".");

    const price = parseFloat(rawPrice);
    if (isNaN(price)) return null;

    return {
      title: titleEl.innerText.trim(),
      price: Number(price.toFixed(2)),
      link: titleEl.href
    };
  }, shop);
}
