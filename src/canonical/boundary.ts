import { CanonicalCaseRecordSchema } from './schema.js';
import { validateCanonicalRecord } from './validate.js';
import { CanonicalCaseRecord } from './types.js';
import { upgradeLegacyCaseToCanonical } from './upgrade.js';
import { z } from 'zod';

// LegacyCaseDataSchema describes the complete known legacy shape.
// No z.any() collections or .passthrough(). Partial legacy-looking objects
// that lack required fields will be rejected rather than upgraded.
export const LegacyCaseDataSchema = z.object({
  id: z.string(),
  case_number: z.string(),
  title: z.string(),
  objective: z.string(),
  statements: z.array(z.object({
    id: z.string(),
    text: z.string(),
    submitted_at: z.string().optional(),
    attachment_ids: z.array(z.string()).optional(),
  }).passthrough()),
  evidence: z.array(z.object({
    id: z.string(),
    label: z.string(),
    input_form: z.string().optional(),
    received_at: z.string().optional(),
    mime_type: z.string().optional(),
  }).passthrough()),
  events: z.array(z.object({
    id: z.string(),
    time: z.string().optional(),
    actor: z.string().optional(),
    action: z.string().optional(),
    target: z.string().optional(),
    effect: z.string().optional(),
    evidence_ids: z.array(z.string()).optional(),
    assessment: z.string().optional(),
  }).passthrough()),
  claims: z.array(z.object({
    id: z.string(),
    text: z.string(),
    assessment: z.string().optional(),
    reasoning: z.string().optional(),
    supporting_evidence: z.array(z.string()).optional(),
    qualifying_evidence: z.array(z.string()).optional(),
    conflicting_evidence: z.array(z.string()).optional(),
  }).passthrough()),
  gaps: z.array(z.object({
    id: z.string(),
    what_is_unknown: z.string().optional(),
    target_claim_ids: z.array(z.string()).optional(),
  }).passthrough()),
  actions: z.array(z.object({
    id: z.string(),
    description: z.string().optional(),
    title: z.string().optional(),
    target_gap_id: z.string().optional(),
  }).passthrough()),
  summary: z.object({
    total_evidence_count: z.number().optional(),
    established_claims_count: z.number().optional(),
    unresolved_claims_count: z.number().optional(),
    conflicted_claims_count: z.number().optional(),
    user_reported_claims_count: z.number().optional(),
  }).passthrough().optional(),
  schema_version: z.undefined().or(z.literal('1.0.0').or(z.null())),
}).strict();

export type LegacyCaseDataShape = z.infer<typeof LegacyCaseDataSchema>;

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
  if (typeof input !== 'object' || input === null) {
    throw new Error('Unrecognized case record format. Cannot admit to canonical runtime.');
  }

  // Check for canonical shape first via schema_version field
  const obj = input as Record<string, unknown>;
  if (obj.schema_version === '2.0.0') {
    return parseCanonicalRecord(input);
  }

  // Attempt legacy check — requires all mandatory fields
  const legacyParse = LegacyCaseDataSchema.safeParse(input);
  if (legacyParse.success) {
    const upgraded = upgradeLegacyCaseToCanonical(legacyParse.data);
    return parseCanonicalRecord(upgraded);
  }

  throw new Error('Unrecognized case record format. Cannot admit to canonical runtime.');
}
