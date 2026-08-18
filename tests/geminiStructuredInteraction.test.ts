import { describe, expect, it, vi } from 'vitest';
import { runGeminiStructuredInteraction } from '../server/inference/geminiStructuredInteraction';

describe('Gemini structured interaction adapter', () => {
  it('uses the Interactions API structured-output contract for text and files', async () => {
    const create = vi.fn().mockResolvedValue({ output_text: '{"ok":true}' });
    const result = await runGeminiStructuredInteraction({ interactions: { create } } as never, {
      model: 'gemini-3.5-flash-lite',
      systemInstruction: 'System rule',
      parts: [
        { text: 'Case text' },
        { inlineData: { mimeType: 'application/pdf', data: 'cGRm' } },
        { inlineData: { mimeType: 'image/png', data: 'aW1hZ2U=' } },
      ],
      responseJsonSchema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
      stage: 'proposal_generation',
    });

    expect(result).toBe('{"ok":true}');
    expect(create).toHaveBeenCalledWith({
      model: 'gemini-3.5-flash-lite',
      input: [
        { type: 'text', text: 'Case text' },
        { type: 'document', data: 'cGRm', mime_type: 'application/pdf' },
        { type: 'image', data: 'aW1hZ2U=', mime_type: 'image/png' },
      ],
      system_instruction: 'System rule',
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
      },
      store: false,
    });
  });

  it('identifies the failed provider stage without exposing request data', async () => {
    const create = vi.fn().mockRejectedValue(new Error('Request contains an invalid argument.'));
    await expect(runGeminiStructuredInteraction({ interactions: { create } } as never, {
      model: 'gemini-3.5-flash-lite',
      systemInstruction: 'System rule',
      parts: [{ text: 'Private case content' }],
      responseJsonSchema: { type: 'object' },
      stage: 'retrieval_planning',
    })).rejects.toThrow('retrieval_planning: Request contains an invalid argument.');
  });
});
