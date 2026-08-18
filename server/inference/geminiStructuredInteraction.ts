import type { GoogleGenAI } from '@google/genai';

export type GeminiStructuredInputPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export interface GeminiStructuredInteractionInput {
  model: string;
  systemInstruction: string;
  parts: GeminiStructuredInputPart[];
  responseJsonSchema: unknown;
  stage: 'retrieval_planning' | 'proposal_generation';
}

export interface InteractionRetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function interactionContent(part: GeminiStructuredInputPart) {
  if ('text' in part) return { type: 'text' as const, text: part.text };
  const type = part.inlineData.mimeType === 'application/pdf' ? 'document' as const : 'image' as const;
  return {
    type,
    data: part.inlineData.data,
    mime_type: part.inlineData.mimeType,
  };
}

export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('504') ||
    msg.includes('rate limit') ||
    msg.includes('resource exhausted') ||
    msg.includes('overloaded') ||
    msg.includes('temporarily unavailable') ||
    msg.includes('etimedout') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('socket hang up') ||
    msg.includes('fetch failed') ||
    msg.includes('network error') ||
    msg.includes('quota exceeded')
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  return 'Gemini interaction failed.';
}

/**
 * Gemini 3.6 structured outputs use the Interactions API contract.
 * Includes exponential backoff and jitter for transient failures (429, 503, network timeouts).
 */
export async function runGeminiStructuredInteraction(
  ai: Pick<GoogleGenAI, 'interactions'>,
  input: GeminiStructuredInteractionInput,
  retryOptions?: InteractionRetryOptions,
): Promise<string> {
  const maxRetries = retryOptions?.maxRetries ?? 3;
  const initialDelay = retryOptions?.initialDelayMs ?? 800;
  const sleep = retryOptions?.sleepFn ?? defaultSleep;

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.interactions.create({
        model: input.model,
        input: input.parts.map(interactionContent),
        system_instruction: input.systemInstruction,
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: input.responseJsonSchema as Record<string, unknown>,
        },
        store: false,
      });
      if (typeof response.output_text !== 'string' || response.output_text.trim().length === 0) {
        throw new Error('Gemini returned empty structured output.');
      }
      return response.output_text;
    } catch (error: unknown) {
      lastError = error;
      if (attempt < maxRetries && isRetryableError(error)) {
        const jitter = Math.floor(Math.random() * 200);
        const delay = Math.min(initialDelay * (2 ** attempt) + jitter, 4000);
        await sleep(delay);
        continue;
      }
      break;
    }
  }

  throw new Error(`${input.stage}: ${errorMessage(lastError)}`, { cause: lastError });
}
