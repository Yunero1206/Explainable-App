import { createApp } from './server/app.js';
import { runIntakeTransition } from './server/productionService.js';
import express from 'express';
import path from 'path';

const PORT = 3000;

const app = createApp({ runIntakeTransition });

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static assets in production
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

// Fallback to index.html for React Router
app.get('*', (req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});