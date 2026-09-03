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

// API Routes
app.use('/api', apiRouter);

app.listen(port, () => {
  console.log(`=======================================================`);
  console.log(`⚡ Recoup Payment Failure Recovery Backend Running`);
  console.log(`📍 Server URL: http://localhost:${port}`);
  console.log(`💳 Razorpay API Mode: TEST MODE`);
  console.log(`=======================================================`);
});
