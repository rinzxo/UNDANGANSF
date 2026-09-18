import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api.js';
import { isDemoMode } from './services/dataStore.js';

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());

const bodyLimit = process.env.API_BODY_LIMIT || '50mb';

app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'digital-invitation-api',
    demoMode: isDemoMode
  });
});

app.use('/api', apiRouter);

// 404 handler for unhandled API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Unexpected server error',
    ...(err.details ? { details: err.details } : {})
  });
});

app.listen(port, () => {
  console.log(`Digital invitation API running on port ${port}`);
});
