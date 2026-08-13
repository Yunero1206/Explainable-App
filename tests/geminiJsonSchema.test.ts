import { describe, expect, it } from 'vitest';
import { sanitizeGeminiResponseJsonSchema } from '../server/inference/geminiJsonSchema';
import { createProviderResponseJsonSchema } from '../server/proposalProvider';

const unsupported = new Set(['$schema', 'pattern', 'minLength', 'maxLength', 'const']);

function collectUnsupportedKeys(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectUnsupportedKeys(item, found);
    return found;
  }
  if (typeof value !== 'object' || value === null) return found;
  for (const [key, child] of Object.entries(value)) {
    if (unsupported.has(key)) found.push(key);
    collectUnsupportedKeys(child, found);
  }
  return found;
}

describe('Gemini response JSON Schema sanitizer', () => {
  it('removes unsupported schema metadata and converts const discriminants to enums', () => {
    expect(sanitizeGeminiResponseJsonSchema({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        operation_type: { type: 'string', const: 'add_claim', pattern: '^add_' },
        note: { type: 'string', minLength: 1, maxLength: 40 },
      },
    })).toEqual({
      type: 'object',
      properties: {
        operation_type: { type: 'string', enum: ['add_claim'] },
        note: { type: 'string' },
      },
    });
  });

  it('keeps property names intact while sanitizing the complete proposal schema', () => {
    const schema = createProviderResponseJsonSchema() as Record<string, unknown>;
    expect(collectUnsupportedKeys(schema)).toEqual([]);
    expect(schema.properties).toBeDefined();
    expect(JSON.stringify(schema)).toContain('operation_type');
    expect(JSON.stringify(schema)).toContain('reasoning');
  });
});
