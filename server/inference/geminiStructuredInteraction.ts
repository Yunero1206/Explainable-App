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

function interactionContent(part: GeminiStructuredInputPart) {
  if ('text' in part) return { type: 'text' as const, text: part.text };
  const type = part.inlineData.mimeType === 'application/pdf' ? 'document' as const : 'image' as const;
  return {
    type,
    data: part.inlineData.data,
    mime_type: part.inlineData.mimeType,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  return 'Gemini interaction failed.';
}

/**
 * Gemini 3.6 structured outputs use the Interactions API contract. Keeping
 * this adapter in one place prevents the retrieval and proposal paths from
 * drifting onto different provider request formats.
 */
export async function runGeminiStructuredInteraction(
  ai: Pick<GoogleGenAI, 'interactions'>,
  input: GeminiStructuredInteractionInput,
): Promise<string> {
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
    throw new Error(`${input.stage}: ${errorMessage(error)}`, { cause: error });
  }
}
