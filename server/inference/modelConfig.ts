export const INFERENCE_MODEL = {
  provider: 'gemini',
  modelId: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  promptVersion: 'explainable-trust-analysis-v4',
  description: 'Primary structured generative model for intake extraction',
} as const;
