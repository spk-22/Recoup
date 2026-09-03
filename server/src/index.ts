import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRouter } from './routes/api.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Recoup Express Backend', mode: 'Razorpay Test Mode' });
});

import path from 'path';
import fs from 'fs';

// API Routes
app.use('/api', apiRouter);

// Serve Next.js static client export if present (unified single-service deployment)
const clientOutPath = path.resolve(__dirname, '../../client/out');
if (fs.existsSync(clientOutPath)) {
  console.log(`📦 Serving static client build from: ${clientOutPath}`);
  app.use(express.static(clientOutPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(clientOutPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`=======================================================`);
  console.log(`⚡ Recoup Payment Failure Recovery Backend Running`);
  console.log(`📍 Server URL: http://localhost:${port}`);
  console.log(`💳 Razorpay API Mode: TEST MODE`);
  console.log(`=======================================================`);
});
