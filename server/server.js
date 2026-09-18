import dotenv from 'dotenv';

dotenv.config();

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

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Unexpected server error',
    ...(err.details ? { details: err.details } : {})
  });
});

// Start the server if running locally (not in lambda)
if (process.env.NODE_ENV !== 'production' || !process.env.LAMBDA_TASK_ROOT) {
  app.listen(port, () => {
    console.log(`Digital invitation API running on port ${port}`);
  });
}

export { app };
