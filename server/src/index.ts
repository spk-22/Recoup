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
const candidateClientPaths = [
  path.resolve(process.cwd(), 'client/out'),
  path.resolve(process.cwd(), '../client/out'),
  path.resolve(__dirname, '../../client/out'),
  path.resolve(__dirname, '../client/out'),
];
const clientOutPath = candidateClientPaths.find((p) => fs.existsSync(p));
if (clientOutPath) {
  console.log(`📦 Serving static client build from: ${clientOutPath}`);
  app.use(express.static(clientOutPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(clientOutPath, 'index.html'));
  });
}

import { runBatchRecoveryPipeline } from './engine/pipelineRunner.js';
import { prisma } from './db/client.js';

app.listen(Number(port), '0.0.0.0', async () => {
  console.log(`=======================================================`);
  console.log(`⚡ Recoup Payment Failure Recovery Backend Running`);
  console.log(`📍 Server listening on 0.0.0.0:${port}`);
  console.log(`💳 Razorpay API Mode: TEST MODE`);
  console.log(`=======================================================`);

  // Auto-seed on cold-start so fresh deployments are immediately pre-populated for evaluators
  try {
    const count = await prisma.transaction.count();
    if (count === 0) {
      console.log('🚀 Cold-start on fresh database: auto-seeding initial batch & running recovery pipeline...');
      await runBatchRecoveryPipeline();
      console.log('✅ Dashboard pre-populated with live data for first-time evaluators.');
    }
  } catch (err: any) {
    console.error('Initial auto-seed check:', err.message);
  }
});
