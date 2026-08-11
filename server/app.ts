import express from 'express';
import type { IntakeResponse } from '../src/runtime/modelRun.js';
import type { IntakePayload } from './intakeService.js';

export interface AppDependencies {
  runIntake: (payload: IntakePayload) => Promise<IntakeResponse>;
}

export function createApp(dependencies: AppDependencies) {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok', default_inference_mode: 'replay' });
  });

  app.post('/api/intake', async (request, response) => {
    try {
      const body = request.body as Record<string, unknown>;
      const headerMode = request.headers['x-et-inference-mode'];
      const payload: IntakePayload = {
        prior_ledger: body.prior_ledger,
        client_request_id: typeof body.client_request_id === 'string' ? body.client_request_id : '',
        message: typeof body.message === 'string' ? body.message : undefined,
        attachments: Array.isArray(body.attachments) ? body.attachments : undefined,
        locale: typeof body.locale === 'string' ? body.locale : undefined,
        inference_mode: typeof headerMode === 'string'
          ? headerMode.toLowerCase()
          : typeof body.inference_mode === 'string'
            ? body.inference_mode.toLowerCase()
            : 'replay',
      };
      const result = await dependencies.runIntake(payload);
      return response.status(result.success ? 200 : result.run.status === 'provider_error' ? 502 : 422).json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid intake request.';
      return response.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message },
      });
    }
  });

  return app;
}
