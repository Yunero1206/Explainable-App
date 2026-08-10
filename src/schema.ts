import { z } from 'zod';

export const AssessmentStateEnum = z.enum([
  'Reported',
  'Corroborated',
  'Contested',
  'Established within current record',
  'Mutually acknowledged',
]);

export const GapStatusEnum = z.enum([
  'open',
  'narrowed',
  'resolved',
  'abandoned',
  'superseded',
  'unavailable',
  'no-longer-material',
]);

export const CausalRelationshipEnum = z.enum([
  'established',
  'unresolved',
  'not_supported',
  'none',
]);

export const PriorityEnum = z.enum(['high', 'medium', 'low']);

export const MatchStatusEnum = z.enum([
  'matched',
  'mismatched',
  'unclear',
  'not_assessed',
]);

// Gemini Structured Output Schema
export const EvidenceInspectionSchema = z.object({
  id: z.string().describe('Target Evidence ID e.g. E01, E02'),
  label: z.string().describe('Short label for the evidence artifact'),
  claimed_source: z.string().describe('Source or issuer claimed in artifact'),
  evidence_time: z.string().nullable().optional().describe('Date/time of event mentioned in document, if found'),
  subject_object_ids: z.array(z.string()).describe('Identifiers found e.g. Account: #123, Order: #456'),
  content_summary: z.string().optional().describe('Key facts extracted from artifact'),
  source_attribution: z.string().describe('Who supplied artifact and what it claims to be'),
  case_object_match: z.string().describe('Observation on how identifiers match the case record'),
  case_object_match_status: MatchStatusEnum,
  completeness_context: z.string().describe('Contextual completeness of artifact'),
  integrity_signals: z.string().describe('Observations on visual or technical format integrity'),
  limitations: z.array(z.string()).describe('Explicit boundaries or unverified aspects'),
});

export const CaseEventSchema = z.object({
  id: z.string().describe('Event ID e.g. EV01, EV02'),
  time: z.string().describe('Timestamp or date of real-world event'),
  actor: z.string().describe('Entity taking action'),
  action: z.string().describe('Verb / real-world action'),
  target: z.string().describe('Target or recipient of action'),
  effect: z.string().describe('Result or effect of action'),
  evidence_ids: z.array(z.string()).describe('Evidence IDs supporting this event'),
  user_statement_ids: z.array(z.string()).describe('User statement IDs supporting this event if user-reported'),
  assessment: AssessmentStateEnum,
  is_user_reported_only: z.boolean(),
});

export const ClaimSchema = z.object({
  id: z.string().describe('Claim ID e.g. C01, C02'),
  text: z.string().describe('Precise proposition statement'),
  actor: z.string().describe('Actor related to proposition'),
  action: z.string().describe('Action related to proposition'),
  target: z.string().describe('Target related to proposition'),
  time: z.string().describe('Timeframe of proposition'),
  supporting_evidence: z.array(z.string()).describe('Evidence IDs supporting proposition'),
  qualifying_evidence: z.array(z.string()).describe('Evidence IDs qualifying proposition'),
  conflicting_evidence: z.array(z.string()).describe('Evidence IDs conflicting with proposition'),
  user_statement_ids: z.array(z.string()).describe('User statement IDs asserting proposition'),
  assessment: AssessmentStateEnum,
  reasoning: z.string().describe('Epistemic rationale grounded in bounded record'),
  scope: z.string().describe('Scope of proposition'),
  limits: z.array(z.string()).describe('Boundaries of proposition'),
  causal_relationship: CausalRelationshipEnum,
});

export const EvidenceGapSchema = z.object({
  id: z.string().describe('Gap ID e.g. G01, G02'),
  what_is_unknown: z.string().describe('What essential fact is missing'),
  why_it_matters: z.string().describe('Relevance to case objective'),
  what_evidence_could_resolve_it: z.string().describe('What specific artifact would resolve gap'),
  where_how_to_obtain: z.string().describe('Specific step to obtain artifact'),
  what_not_to_over_collect: z.string().describe('Boundaries on data collection'),
  target_claim_ids: z.array(z.string()).describe('Claim IDs this gap relates to'),
  status: GapStatusEnum.default('open').describe('Lifecycle status of the gap'),
  resolution_reason: z.string().optional().describe('If resolved or superseded, the reason why'),
  resolution_evidence_ids: z.array(z.string()).optional().describe('Evidence IDs that resolved this gap'),
});

export const NextActionSchema = z.object({
  id: z.string().describe('Action ID e.g. A01, A02'),
  title: z.string().describe('Short action title'),
  description: z.string().describe('Detailed action instruction'),
  target_gap_id: z.string().describe('Required Gap ID this action aims to resolve'),
  priority: PriorityEnum,
});

export const SegmentedPastedEvidenceSchema = z.object({
  id: z.string().describe('The assigned Evidence ID e.g. E01, E02'),
  label: z.string().describe('Short label for the pasted evidence, e.g., "Pasted Adobe Receipt"'),
  claimed_source: z.string().describe('The claimed source, e.g., "Adobe"'),
  content: z.string().describe('The exact raw pasted text of the source artifact (e.g. email, receipt, log) without any added words or narration.'),
  evidence_time: z.string().nullable().optional().describe('Date/time of event mentioned in the document, if found'),
});

export const SegmentedIntakeSchema = z.object({
  narrative_statement: z.object({
    id: z.string().describe('The assigned Statement ID e.g. U01, U02'),
    text: z.string().describe('The user narrative/assertion/paraphrase portion, if present.'),
  }).nullable().optional().describe('The user narrative/assertion/paraphrase portion, if present. Null if the intake message is purely pasted documentary content.'),
  pasted_evidences: z.array(SegmentedPastedEvidenceSchema).describe('List of clearly supplied pasted source artifacts/records parsed from the intake message.'),
});

export const InputDispositionSchema = z.object({
  id: z.string().describe('The Statement ID (Uxx) or Evidence ID (Exx) being disposed'),
  disposition: z.enum(['supports_finding', 'challenges_finding', 'corrects_statement', 'supports_gap', 'irrelevant', 'not_yet_classified']),
  related_object_ids: z.array(z.string()).describe('IDs of claims, gaps, or prior statements this relates to'),
  reason: z.string().describe('Brief reason for this disposition')
});

export const CaseReconstructionOutputSchema = z.object({
  segmented_intake: SegmentedIntakeSchema.nullable().optional().describe('The segmented parts of the newly submitted intake message, if applicable'),
  evidence_inspection: z.array(EvidenceInspectionSchema),
  input_dispositions: z.array(InputDispositionSchema).optional().describe('Dispositions for all newly supplied statements and evidence in this turn'),
  events: z.array(CaseEventSchema),
  claims: z.array(ClaimSchema),
  gaps: z.array(EvidenceGapSchema),
  actions: z.array(NextActionSchema),
  revision_delta_summary: z.string().optional().describe('Concise 1-2 sentence human explanation of what changed in this revision.'),
  epistemic_warning: z.string().optional().describe('High-level summary warning regarding uncertainties'),
});

export type CaseReconstructionOutput = z.infer<typeof CaseReconstructionOutputSchema>;

export interface InvariantValidationResult {
  valid: boolean;
  errors: string[];
  deterministicSummary?: {
    total_evidence_count: number;
    established_claims_count: number;
    unresolved_claims_count: number;
    conflicted_claims_count: number;
    user_reported_claims_count: number;
    epistemic_warning?: string;
  };
}

/**
 * Validates domain and graph invariants for Gemini reconstruction output
 */
export function validateReconstructionInvariants(
  output: CaseReconstructionOutput,
  inputEvidenceIds: string[],
  inputStatementIds: string[],
  newEvidenceIds: string[] = []
): InvariantValidationResult {
  const errors: string[] = [];
  const validEvSet = new Set(inputEvidenceIds);
  const validStmtSet = new Set(inputStatementIds);

  // Check 0: Duplicate ID checks
  const seenEventIds = new Set<string>();
  for (const ev of output.events) {
    if (seenEventIds.has(ev.id)) {
      errors.push(`Duplicate event ID "${ev.id}" found.`);
    }
    seenEventIds.add(ev.id);
  }

  const seenClaimIds = new Set<string>();
  for (const c of output.claims) {
    if (seenClaimIds.has(c.id)) {
      errors.push(`Duplicate claim ID "${c.id}" found.`);
    }
    seenClaimIds.add(c.id);
  }

  const seenGapIds = new Set<string>();
  for (const g of output.gaps) {
    if (seenGapIds.has(g.id)) {
      errors.push(`Duplicate gap ID "${g.id}" found.`);
    }
    seenGapIds.add(g.id);
  }

  const seenActionIds = new Set<string>();
  for (const a of output.actions) {
    if (seenActionIds.has(a.id)) {
      errors.push(`Duplicate action ID "${a.id}" found.`);
    }
    seenActionIds.add(a.id);
  }

  const seenInspectionIds = new Set<string>();
  for (const e of output.evidence_inspection) {
    if (seenInspectionIds.has(e.id)) {
      errors.push(`Duplicate evidence inspection ID "${e.id}" found.`);
    }
    seenInspectionIds.add(e.id);
  }

  // Check newly uploaded evidence inspection coverage
  const inspectionSet = new Set(output.evidence_inspection.map((e) => e.id));
  for (const newEId of newEvidenceIds) {
    if (!inspectionSet.has(newEId)) {
      errors.push(`Newly uploaded evidence "${newEId}" is missing an inspection result.`);
    }
  }

  // Check 1: Evidence IDs in inspection match known input evidence
  const inspectedIds = new Set(output.evidence_inspection.map((e) => e.id));
  for (const eId of inspectedIds) {
    if (!validEvSet.has(eId)) {
      errors.push(`Inspected evidence ID "${eId}" is not in canonical evidence list.`);
    }
  }

  // Check 2: Event evidence_ids must be valid
  for (const ev of output.events) {
    for (const refId of ev.evidence_ids) {
      if (!validEvSet.has(refId)) {
        errors.push(`Event ${ev.id} references non-existent evidence ID "${refId}".`);
      }
    }
    for (const uId of ev.user_statement_ids || []) {
      if (!validStmtSet.has(uId)) {
        errors.push(`Event ${ev.id} references non-existent statement ID "${uId}".`);
      }
    }
  }

  // Check 3: Claim references and Established claim documentary rule
  const validClaimSet = new Set(output.claims.map((c) => c.id));
  for (const c of output.claims) {
    for (const uId of c.user_statement_ids || []) {
      if (!validStmtSet.has(uId)) {
        errors.push(`Claim ${c.id} references non-existent statement ID "${uId}".`);
      }
    }
    for (const refId of c.supporting_evidence) {
      if (!validEvSet.has(refId)) {
        errors.push(`Claim ${c.id} references non-existent supporting evidence ID "${refId}".`);
      }
    }
    for (const refId of c.qualifying_evidence) {
      if (!validEvSet.has(refId)) {
        errors.push(`Claim ${c.id} references non-existent qualifying evidence ID "${refId}".`);
      }
    }
    for (const refId of c.conflicting_evidence) {
      if (!validEvSet.has(refId)) {
        errors.push(`Claim ${c.id} references non-existent conflicting evidence ID "${refId}".`);
      }
    }

    // EPISTEMIC RULE: Established within current record MUST have supporting documentary evidence
    if (c.assessment === 'Established within current record' && c.supporting_evidence.length === 0) {
      errors.push(
        `Claim ${c.id} is marked "${c.assessment}" but has zero supporting evidence IDs.`
      );
    }
  }

  // Check 4: Gap target_claim_ids exist
  const validGapSet = new Set(output.gaps.map((g) => g.id));
  for (const g of output.gaps) {
    for (const targetClaimId of g.target_claim_ids || []) {
      if (!validClaimSet.has(targetClaimId)) {
        errors.push(`Gap ${g.id} references non-existent claim ID "${targetClaimId}".`);
      }
    }
  }

  // Check 5: Action target_gap_id exists
  for (const a of output.actions) {
    if (!a.target_gap_id) {
      errors.push(`Action ${a.id} is missing required target_gap_id.`);
    } else if (!validGapSet.has(a.target_gap_id)) {
      errors.push(`Action ${a.id} references non-existent gap ID "${a.target_gap_id}".`);
    }
  }

  const establishedCount = output.claims.filter((c) => c.assessment === 'Established within current record').length;
  const reportedCount = output.claims.filter((c) => c.assessment === 'Reported').length;
  const contestedCount = output.claims.filter((c) => c.assessment === 'Contested').length;

  return {
    valid: errors.length === 0,
    errors,
    deterministicSummary: {
      total_evidence_count: inputEvidenceIds.length,
      established_claims_count: establishedCount,
      unresolved_claims_count: reportedCount,
      conflicted_claims_count: contestedCount,
      user_reported_claims_count: reportedCount,
      epistemic_warning: output.epistemic_warning,
    },
  };
}
