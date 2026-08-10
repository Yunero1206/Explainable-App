import { CanonicalCaseRecordSchema } from './schema.js';
import { validateCanonicalRecord } from './validate.js';
import { CanonicalCaseRecord } from './types.js';
import { upgradeLegacyCaseToCanonical } from './upgrade.js';
import { z } from 'zod';
import { LegacyCaseData } from '../types.js';

// Minimal LegacyCaseDataSchema to identify legacy shapes securely.
export const LegacyCaseDataSchema = z.object({
  id: z.string(),
  case_number: z.string().optional(),
  title: z.string().optional(),
  objective: z.string().optional(),
  statements: z.array(z.any()),
  evidence: z.array(z.any()),
  events: z.array(z.any()),
  claims: z.array(z.any()),
  gaps: z.array(z.any()),
  actions: z.array(z.any()),
  schema_version: z.undefined().or(z.literal('1.0.0').or(z.null())),
}).passthrough();

/**
 * Strict canonical parser.
 * Rejects on any structural or semantic failure.
 * Never falls back to legacy upgrade.
 */
export function parseCanonicalRecord(input: unknown): CanonicalCaseRecord {
  const parseResult = CanonicalCaseRecordSchema.safeParse(input);
  if (!parseResult.success) {
    const errorMsg = `Structural validation failed: ${parseResult.error.message}`;
    throw Object.assign(new Error(errorMsg), { stage: 'VALIDATION_FAILED' });
  }

  const record = parseResult.data as CanonicalCaseRecord;
  const invariantErrors = validateCanonicalRecord(record);
  
  if (invariantErrors.length > 0) {
    const errorMsg = `Invariant validation failed: ${invariantErrors.join('; ')}`;
    throw Object.assign(new Error(errorMsg), { stage: 'VALIDATION_FAILED' });
  }

  return record;
}

/**
 * Admission parser used ONLY for bootstrap (bundled samples / IndexedDB).
 * Upgrades legacy cases exactly once.
 */
export function admitBootstrapRecord(input: unknown): CanonicalCaseRecord {
  if (typeof input === 'object' && input !== null) {
    const obj = input as any;
    if (obj.schema_version === '2.0.0') {
      return parseCanonicalRecord(input);
    }
  }

  // Attempt legacy check
  const legacyParse = LegacyCaseDataSchema.safeParse(input);
  if (legacyParse.success) {
    const upgraded = upgradeLegacyCaseToCanonical(legacyParse.data as LegacyCaseData);
    return parseCanonicalRecord(upgraded);
  }

  throw new Error('Unrecognized case record format. Cannot admit to canonical runtime.');
}
