import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildDashboardResponse } from './analytics/dashboardBuilder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

dotenv.config({ path: path.resolve(projectRoot, '.env') });

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Medcare analytics API is running.' });
});

app.get('/api/dashboard', async (req, res) => {
  try {
    const data = await buildDashboardResponse();
    res.json(data);
  } catch (error) {
    console.error('Dashboard build failed:', error);
    res.status(500).json({
      message: 'Unable to generate dashboard data.',
      error: error.message || 'Unknown error'
    });
  }
});

app.use('/api/data', express.static(path.resolve(process.cwd(), 'data')));

app.listen(port, () => {
  console.log(`Medcare backend listening on http://localhost:${port}`);
});
