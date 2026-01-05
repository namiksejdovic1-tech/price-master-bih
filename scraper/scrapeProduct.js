import { SHOPS } from "./shops.js";
import { scrapeOneShop } from "./scrapeOneShop.js";

export async function scrapeProduct(page, productName) {
  const results = [];

  for (const shop of SHOPS) {
    try {
      const res = await scrapeOneShop(page, shop, productName);
      if (res) {
        results.push({
          shop: shop.id,
          ...res
        });
      }
    } catch (e) {
      console.log(`❌ ${shop.id} failed`);
    }
  }

  return results;
}
