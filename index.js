import scrapeRoutes from "./routes/scrape.routes.js";
app.use("/api", scrapeRoutes);
import express from 'express';
import uploadRouter from './routes/upload.js';

const app = express();
app.use('/upload', uploadRouter);

app.listen(3000, () => console.log('Server running on port 3000'));
