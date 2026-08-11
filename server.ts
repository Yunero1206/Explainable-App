import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createApp } from './server/app.js';
import { createIntakeService } from './server/intakeService.js';

async function start() {
  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  const root = process.cwd();
  const app = createApp({ runIntake: createIntakeService() });

  if (process.env.NODE_ENV === 'production') {
    const dist = path.resolve(root, 'dist');
    app.use(express.static(dist));
    app.get('*', (_request, response) => response.sendFile(path.join(dist, 'index.html')));
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ root, server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  const server = app.listen(port, () => {
    console.log(`Explainable Trust listening on http://localhost:${port}`);
    console.log('Inference defaults to replay; set GEMINI_API_KEY and choose live mode for Gemini.');
  });

  function shutdown() {
    server.close(() => process.exit(0));
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

void start();
