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
  user_story: z.string().optional(),
  statements: z.array(z.object({
    id: z.string(),
    text: z.string(),
    submitted_at: z.string(), // Required for canonical upgrade without fallback
    attachment_ids: z.array(z.string()).optional(),
    disposition: z.enum(['supports_finding', 'challenges_finding', 'corrects_statement', 'supports_gap', 'irrelevant', 'not_yet_classified']).optional(),
    corrects_statement_ids: z.array(z.string()).optional(),
    disposition_reason: z.string().optional(),
  }).strict()),
  evidence: z.array(z.object({
    id: z.string(),
    label: z.string(),
    claimed_source: z.string(),
    acquisition_method: z.string(),
    input_form: z.string(),
    evidence_time: z.string().nullable().optional(),
    received_at: z.string(), // Required for canonical upgrade without fallback
    subject_object_ids: z.array(z.string()),
    content: z.string(),
    content_summary: z.string().optional(),
    raw_submission: z.any().optional(),
    disposition: z.enum(['supports_finding', 'challenges_finding', 'corrects_statement', 'supports_gap', 'irrelevant', 'not_yet_classified']).optional(),
    disposition_reason: z.string().optional(),
    source_attribution: z.string(),
    case_object_match: z.string(),
    case_object_match_status: z.enum(['matched', 'mismatched', 'unclear', 'not_assessed']).optional(),
    completeness_context: z.string(),
    integrity_signals: z.string(),
    corroborated_by: z.array(z.string()).optional(),
    qualified_by: z.array(z.string()).optional(),
    conflicted_by: z.array(z.string()).optional(),
    limitations: z.array(z.string()),
    file_name: z.string().optional(),
    file_type: z.string().optional(),
    file_data_url: z.string().optional(),
  }).strict()),
  events: z.array(z.object({
    id: z.string(),
    time: z.string(),
    actor: z.string(),
    action: z.string(),
    target: z.string(),
    effect: z.string(),
    evidence_ids: z.array(z.string()),
    user_statement_ids: z.array(z.string()).optional(),
    assessment: z.string(), // Required
    is_user_reported_only: z.boolean().optional(),
  }).strict()),
  claims: z.array(z.object({
    id: z.string(),
    text: z.string(),
    actor: z.string(),
    action: z.string(),
    target: z.string(),
    time: z.string(),
    supporting_evidence: z.array(z.string()),
    qualifying_evidence: z.array(z.string()),
    conflicting_evidence: z.array(z.string()),
    user_statement_ids: z.array(z.string()).optional(),
    assessment: z.string(), // Required
    reasoning: z.string(), // Required
    scope: z.string(),
    limits: z.array(z.string()),
    causal_relationship: z.enum(['established', 'unresolved', 'not_supported', 'none']),
  }).strict()),
  gaps: z.array(z.object({
    id: z.string(),
    what_is_unknown: z.string(),
    why_it_matters: z.string(),
    what_evidence_could_resolve_it: z.string(),
    where_how_to_obtain: z.string(),
    what_not_to_over_collect: z.string(),
    target_claim_ids: z.array(z.string()).optional(),
    status: z.enum(['open', 'narrowed', 'resolved', 'abandoned', 'superseded', 'unavailable', 'no-longer-material']).optional(),
    resolution_reason: z.string().optional(),
    resolution_evidence_ids: z.array(z.string()).optional(),
  }).strict()),
  actions: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    target_gap_id: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
  }).strict()),
  summary: z.object({
    epistemic_warning: z.string().optional(),
    total_evidence_count: z.number(),
    established_claims_count: z.number(),
    unresolved_claims_count: z.number(),
    conflicted_claims_count: z.number(),
    user_reported_claims_count: z.number(),
    timeline_span: z.string().optional(),
    unresolved_questions_count: z.number().optional(),
    revision_delta_summary: z.string().optional(),
  }).strict().optional(),
  schema_version: z.literal('1.0.0').nullable().optional(),
  is_archived: z.boolean().optional(),
  locale: z.string().optional(),
  current_revision_id: z.string().optional(),
  revisions: z.array(z.any()).optional(),
}).strict();

export type LegacyCaseDataShape = z.infer<typeof LegacyCaseDataSchema>;

/**
 * Strict canonical parser.
 * Rejects on any structural or semantic failure.
 * Never falls back to legacy upgrade.
 */
export function parseCanonicalRecord(input: unknown): CanonicalCaseRecord {
  if (typeof input !== 'object' || input === null) {
    throw Object.assign(new Error('Unrecognized canonical format.'), { stage: 'VALIDATION_FAILED' });
  }
  
  // Quick structural rejection before full deep parse
  const obj = input as Record<string, unknown>;
  if (obj.schema_version !== '2.0.0') {
    throw Object.assign(new Error('Structural validation failed: expected schema_version 2.0.0'), { stage: 'VALIDATION_FAILED' });
  }

  const parseResult = CanonicalCaseRecordSchema.safeParse(input);
  if (!parseResult.success) {
    // Collect specific structural failures
    const formattedErrors = JSON.stringify(parseResult.error.issues, null, 2);
    throw Object.assign(
      new Error(`Structural validation failed: ${formattedErrors}`),
      { stage: 'VALIDATION_FAILED' }
    );
  }

  // 2. Invariant validation
  const data = parseResult.data as CanonicalCaseRecord;
  const errors = validateCanonicalRecord(data);
  if (errors.length > 0) {
    throw Object.assign(
      new Error(`Invariant validation failed: ${errors.join('; ')}`),
      { stage: 'VALIDATION_FAILED' }
    );
  }

  return data;
}

/**
 * Admits a case record to the canonical runtime.
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

  const legacyParse = LegacyCaseDataSchema.safeParse(input);
  if (legacyParse.success) {
    const upgraded = upgradeLegacyCaseToCanonical(legacyParse.data);
    return parseCanonicalRecord(upgraded);
  }

  throw new Error('Unrecognized case record format. Cannot admit to canonical runtime.');
}
