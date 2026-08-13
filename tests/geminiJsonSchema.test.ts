import { describe, expect, it } from 'vitest';
import { sanitizeGeminiResponseJsonSchema } from '../server/inference/geminiJsonSchema';
import {
  createProviderGenerationJsonSchema,
  createProviderResponseJsonSchema,
  decodeProviderGenerationProposal,
} from '../server/proposalProvider';

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

  it('uses union-free typed operation buckets while retaining the full server contract separately', () => {
    const generation = createProviderGenerationJsonSchema();
    const generationText = JSON.stringify(generation);
    const validationText = JSON.stringify(createProviderResponseJsonSchema());

    expect(generationText.length).toBeLessThan(15_000);
    expect(generationText).not.toContain('anyOf');
    expect(generationText).toContain('operation_type');
    expect(validationText).toContain('anyOf');
    expect(validationText.length).toBeGreaterThan(generationText.length);

    const generationOperations = generation.properties.operations;
    expect(generationOperations.type).toBe('object');
    expect(generationOperations.required).toEqual(Object.keys(generationOperations.properties));
    const addClaim = generationOperations.properties.add_claim.items;
    expect(addClaim.required).toEqual([
      'operation_type', 'local_ref', 'proposition', 'actor', 'action', 'target',
      'domain_time', 'assessment', 'reasoning', 'scope', 'limits',
      'source_basis_ids', 'reason',
    ]);
    expect(addClaim.properties.operation_type.enum).toEqual(['add_claim']);

    const generationFields = [...new Set(
      Object.values(generationOperations.properties)
        .flatMap((bucket) => Object.keys(bucket.items.properties)),
    )].sort();
    const validationItems = (createProviderResponseJsonSchema().properties as Record<string, any>).operations.items;
    const validationFields = [...new Set(
      (validationItems.anyOf as Array<{ properties: Record<string, unknown> }>)
        .flatMap((branch) => Object.keys(branch.properties)),
    )].sort();
    expect(generationFields).toEqual(validationFields);
  });
});

describe('Gemini proposal generation wire decoder', () => {
  function emptyBuckets() {
    const operations = createProviderGenerationJsonSchema().properties.operations;
    return Object.fromEntries(operations.required.map((operationType) => [operationType, []]));
  }

  it('flattens typed buckets in dependency-safe order without changing operation fields', () => {
    const claim = {
      operation_type: 'add_claim', local_ref: 'new_claim_1', proposition: 'p', actor: 'a', action: 'a',
      target: 't', domain_time: 'd', assessment: 'Reported', reasoning: 'r', scope: 's', limits: [],
      source_basis_ids: ['U01'], reason: 'r',
    };
    const disposition = {
      operation_type: 'disposition_source', relationship_type: 'supports_claim', source_id: 'U01',
      target_ref: 'new_claim_1', reason: 'r',
    };
    const raw = {
      explanation: { answer: 'a', text: 't', user_goal: 'g' },
      reasoning: { turn_intent: 'record', answer_status: 'recorded', steps: [] },
      operations: { ...emptyBuckets(), add_claim: [claim], disposition_source: [disposition] },
    };

    expect(decodeProviderGenerationProposal(raw)).toEqual({
      ...raw,
      operations: [claim, disposition],
    });
    expect(Array.isArray(raw.operations)).toBe(false);
  });

  it('rejects missing buckets and mismatched operation types instead of repairing them', () => {
    const missing = {
      explanation: { answer: 'a', text: 't', user_goal: 'g' },
      reasoning: { turn_intent: 'record', answer_status: 'recorded', steps: [] },
      operations: { ...emptyBuckets() },
    };
    delete (missing.operations as Record<string, unknown>).add_claim;
    expect(() => decodeProviderGenerationProposal(missing)).toThrow('missing buckets [add_claim]');

    const mismatched = {
      ...missing,
      operations: { ...emptyBuckets(), add_claim: [{ operation_type: 'add_event' }] },
    };
    expect(() => decodeProviderGenerationProposal(mismatched)).toThrow('contains a mismatched operation_type');
  });
});
