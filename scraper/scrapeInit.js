import puppeteer from "puppeteer";
import { scrapeProduct } from "./scrapeProduct.js";

export async function scrapeInitialProducts() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox"]
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120"
  );

  await page.goto("https://bijelatehnika.com", {
    waitUntil: "networkidle2"
  });

  const products = await page.evaluate(() => {
    return [...document.querySelectorAll("a")]
      .map(a => a.innerText)
      .filter(t => t && t.length > 15)
      .slice(0, 10);
  });

  const output = [];

  for (const name of products) {
    const competitors = await scrapeProduct(page, name);
    output.push({
      name,
      competitors
    });
  }

  await browser.close();
  return output;
}
