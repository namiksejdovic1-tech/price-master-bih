import multer from "multer";
import fs from "fs";
import pdf from "pdf-parse";
import Tesseract from "tesseract.js";
import { parseInvoiceText } from "../services/invoiceParser.js";

const upload = multer({ dest: "uploads/" });

export default function (app) {
  app.post("/api/upload-invoice", upload.single("file"), async (req, res) => {
    const filePath = req.file.path;
    let text = "";

    try {
      if (req.file.mimetype === "application/pdf") {
        const data = await pdf(fs.readFileSync(filePath));
        text = data.text;
      } else {
        const result = await Tesseract.recognize(filePath, "bos+eng");
        text = result.data.text;
      }

      const products = parseInvoiceText(text);

      res.json({
        success: true,
        count: products.length,
        products,
      });
    } finally {
      fs.unlinkSync(filePath);
    }
  });
}
