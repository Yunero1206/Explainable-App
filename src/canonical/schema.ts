import { z } from 'zod';
import { SCHEMA_VERSION, CANONICAL_ASSESSMENT_VALUES, CANONICAL_GAP_STATUSES, DELTA_ENTITY_TYPES, DELTA_OPERATIONS } from './types.js';

const StatementIdSchema = z.string().regex(/^U\d+$/);
const EvidenceIdSchema = z.string().regex(/^E\d+$/);
const ClaimIdSchema = z.string().regex(/^C\d+$/);
const GapIdSchema = z.string().regex(/^G\d+$/);
const ActionIdSchema = z.string().regex(/^A\d+$/);
const RevisionIdSchema = z.string().regex(/^R\d+$/);
const RelationshipIdSchema = z.string().min(1);
const IntakeIdSchema = z.string().min(1);
const IsoDateSchema = z.string().datetime();

const StorageKeySchema = z.string().refine(val => {
  return !val.trimStart().toLowerCase().startsWith('data:');
}, { message: "Data URLs are not permitted in storage_key" });

export const CanonicalStatementSchema = z.object({
  id: StatementIdSchema,
  text: z.string(),
  submitted_at: IsoDateSchema,
  source_intake_id: IntakeIdSchema
}).strict();

export const CanonicalEvidenceSchema = z.object({
  id: EvidenceIdSchema,
  label: z.string(),
  origin_type: z.string(),
  input_form: z.string(),
  byte_size: z.number().optional(),
  sha256: z.string().optional(),
  storage_key: StorageKeySchema.optional(),
  mime_type: z.string().optional(),
  submitted_at: IsoDateSchema,
  source_intake_id: IntakeIdSchema
}).strict();

export const DispositionRelationshipSchema = z.discriminatedUnion('relationship_type', [
  z.object({
    id: RelationshipIdSchema,
    source_id: z.union([StatementIdSchema, EvidenceIdSchema]),
    target_id: ClaimIdSchema,
    relationship_type: z.enum(['supports_claim', 'qualifies_claim', 'conflicts_with_claim']),
    reason: z.string().min(1).trim(),
    created_in_revision_id: RevisionIdSchema
  }).strict(),
  z.object({
    id: RelationshipIdSchema,
    source_id: z.union([StatementIdSchema, EvidenceIdSchema]),
    target_id: GapIdSchema,
    relationship_type: z.literal('raises_gap'),
    reason: z.string().min(1).trim(),
    created_in_revision_id: RevisionIdSchema
  }).strict(),
  z.object({
    id: RelationshipIdSchema,
    source_id: StatementIdSchema,
    target_id: StatementIdSchema,
    relationship_type: z.literal('corrects_statement'),
    reason: z.string().min(1).trim(),
    created_in_revision_id: RevisionIdSchema
  }).strict(),
  z.object({
    id: RelationshipIdSchema,
    source_id: z.union([StatementIdSchema, EvidenceIdSchema]),
    target_id: z.null(),
    relationship_type: z.literal('not_yet_classified'),
    reason: z.string().min(1).trim(),
    created_in_revision_id: RevisionIdSchema
  }).strict()
]);

export const IntakePartSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('statement'),
    statement_id: StatementIdSchema,
    raw_text: z.string()
  }).strict(),
  z.object({
    kind: z.literal('evidence'),
    evidence_id: EvidenceIdSchema,
    submitted_name: z.string(),
    mime_type: z.string().optional(),
    byte_size: z.number().optional(),
    storage_key: StorageKeySchema.optional()
  }).strict()
]);

export const IntakeRecordSchema = z.object({
  id: IntakeIdSchema,
  received_at: IsoDateSchema,
  resulting_revision_id: RevisionIdSchema,
  parts: z.array(IntakePartSchema)
}).strict();

export const CaseEventSchema = z.object({
  id: z.string(),
  time: z.string(),
  actor: z.string(),
  action: z.string(),
  target: z.string(),
  effect: z.string().optional(),
  evidence_ids: z.array(z.union([StatementIdSchema, EvidenceIdSchema])),
  assessment: z.enum(CANONICAL_ASSESSMENT_VALUES)
}).strict();

export const CanonicalClaimSchema = z.object({
  id: ClaimIdSchema,
  text: z.string(),
  assessment: z.enum(CANONICAL_ASSESSMENT_VALUES),
  reasoning: z.string(),
  supporting_evidence: z.array(z.union([StatementIdSchema, EvidenceIdSchema])),
  qualifying_evidence: z.array(z.union([StatementIdSchema, EvidenceIdSchema])),
  conflicting_evidence: z.array(z.union([StatementIdSchema, EvidenceIdSchema]))
}).strict();

export const CanonicalGapSchema = z.object({
  id: GapIdSchema,
  question_key: z.string(),
  status: z.enum(CANONICAL_GAP_STATUSES),
  status_revision_id: RevisionIdSchema.optional(),
  status_reason: z.string().optional(),
  status_source_ids: z.array(z.union([StatementIdSchema, EvidenceIdSchema])).optional(),
  target_claim_ids: z.array(ClaimIdSchema)
}).strict();

export const CanonicalActionSchema = z.object({
  id: ActionIdSchema,
  target_gap_ids: z.array(GapIdSchema),
  description: z.string()
}).strict();

export const CanonicalEvidenceInspectionSchema = z.object({
  id: z.string(),
  evidence_id: EvidenceIdSchema,
  limitations: z.array(z.string())
}).strict();

export const RevisionDeltaEntrySchema = z.object({
  entity_type: z.enum(DELTA_ENTITY_TYPES),
  entity_id: z.string(),
  operation: z.enum(DELTA_OPERATIONS),
  reason: z.string().min(1).trim(),
  source_ids: z.array(z.union([StatementIdSchema, EvidenceIdSchema]))
}).strict();

export const RevisionDeltaSchema = z.object({
  changes: z.array(RevisionDeltaEntrySchema)
}).strict();

export const AnalysisSummarySchema = z.object({
  total_evidence_count: z.number(),
  established_claims_count: z.number(),
  unresolved_claims_count: z.number(),
  conflicted_claims_count: z.number(),
  user_reported_claims_count: z.number()
}).strict();

export const CaseRevisionSchema = z.object({
  revision_id: RevisionIdSchema,
  created_at: IsoDateSchema,
  title: z.string(),
  objective: z.string(),
  parent_revision_id: RevisionIdSchema.optional(),
  triggering_intake_id: IntakeIdSchema.optional(),
  
  input_statement_ids: z.array(StatementIdSchema),
  input_evidence_ids: z.array(EvidenceIdSchema),
  
  events: z.array(CaseEventSchema),
  claims: z.array(CanonicalClaimSchema),
  gaps: z.array(CanonicalGapSchema),
  actions: z.array(CanonicalActionSchema),
  evidence_inspections: z.array(CanonicalEvidenceInspectionSchema),
  
  delta: RevisionDeltaSchema,
  summary: AnalysisSummarySchema
}).strict();

export const CanonicalCaseRecordSchema = z.object({
  id: z.string(),
  schema_version: z.literal(SCHEMA_VERSION),
  case_number: z.string(),
  created_at: IsoDateSchema,
  updated_at: IsoDateSchema,
  current_revision_id: RevisionIdSchema,
  
  intake_ledger: z.array(IntakeRecordSchema),
  statements: z.array(CanonicalStatementSchema),
  evidence: z.array(CanonicalEvidenceSchema),
  relationships: z.array(DispositionRelationshipSchema),
  revisions: z.array(CaseRevisionSchema)
}).strict();
