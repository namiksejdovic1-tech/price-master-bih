import express from "express";
import { scrapeInitialProducts } from "../scraper/scrapeInit.js";

const router = express.Router();

router.get("/scrape/init", async (req, res) => {
  try {
    const data = await scrapeInitialProducts();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Scraping failed" });
  }
});

export default router;
