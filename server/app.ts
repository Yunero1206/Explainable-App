import express from 'express';
import { parseCanonicalRecord } from '../src/canonical/boundary.js';
import { CanonicalCaseRecord } from '../src/canonical/types.js';

interface AppDependencies {
  runIntakeTransition: (priorRecord: CanonicalCaseRecord, intakePayload: any, inferenceMode?: string) => Promise<CanonicalCaseRecord>;
}

export function createApp(deps: AppDependencies) {
  const app = express();
  
  // Increase payload limit for image/PDF uploads
  app.use(express.json({ limit: '20mb' }));

  app.post('/api/intake', async (req, res) => {
    try {
      const isProd = process.env.NODE_ENV === 'production';
      const headerMode = (req.headers['x-et-dev-inference-mode'] as string)?.toLowerCase();
      const bodyMode = req.body?.dev_inference_mode?.toLowerCase();
      const requestedMode = headerMode || bodyMode || 'live';
      
      if (isProd && requestedMode === 'replay') {
        return res.status(400).json({ error: 'RECONSTRUCTION_FAILED', stage: 'FORGED_REPLAY_REJECTED', message: 'Replay mode is not available in production environment.' });
      }

      const inferenceMode = requestedMode === 'replay' ? 'replay' : 'live';
      const { prior_record, ...intakePayload } = req.body;

      if (!prior_record) {
        return res.status(400).json({ error: 'RECONSTRUCTION_FAILED', stage: 'MISSING_PRIOR_RECORD', message: 'A prior canonical record is required.' });
      }

      // 1. Strict validation of prior record
      const parsedPriorRecord = parseCanonicalRecord(prior_record);

      // 2. Invoke injected dependency
      const nextRecord = await deps.runIntakeTransition(parsedPriorRecord, intakePayload, inferenceMode);

      // 3. Strict validation of the result
      const parsedNextRecord = parseCanonicalRecord(nextRecord);

      return res.json({
        success: true,
        case: parsedNextRecord
      });
    } catch (error: any) {
      const stage = error.stage || 'REQUEST_FAILED';
      console.error(`Error in /api/intake [${stage}]:`, error);
      const statusCode = (stage === 'REPLAY_MISMATCH' || stage === 'VALIDATION_FAILED') ? 400 : 500;
      return res.status(statusCode).json({
        error: 'RECONSTRUCTION_FAILED',
        stage,
        message: error.message || 'Intake processing failed.',
      });
    }
  });

  app.post('/api/translate-case', async (req, res) => {
    // Basic translation proxy for the PresentationCaseData overlay
    try {
      const { events = [], claims = [], gaps = [], actions = [], title = '', objective = '', locale = 'en' } = req.body;
      
      const { GoogleGenAI } = await import('@google/genai');
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'Gemini client not initialized.' });
      
      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const systemInstruction = `You are a highly professional translation assistant. Translate the human-prose descriptions of the provided case record into the target language: "${locale}". You MUST preserve all IDs. Return the output as strict JSON matching the requested schema.`;
      
      const promptText = `Translate the following case elements to "${locale}":
TITLE: ${title}
OBJECTIVE: ${objective}
EVENTS: ${JSON.stringify(events, null, 2)}
CLAIMS: ${JSON.stringify(claims, null, 2)}
GAPS: ${JSON.stringify(gaps, null, 2)}
ACTIONS: ${JSON.stringify(actions, null, 2)}
`;
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: promptText,
        config: { systemInstruction, responseMimeType: 'application/json' },
      });
      
      if (!response?.text) throw new Error('Empty response');
      const translatedData = JSON.parse(response.text.trim());
      
      return res.json({ success: true, ...translatedData });
    } catch (error: any) {
      console.error('Translation failed:', error);
      return res.json({ success: false, ...req.body }); // fallback
    }
  });

  return app;
}
