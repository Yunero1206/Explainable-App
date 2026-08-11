import { z } from 'zod';
import type * as T from './types';

function createBrandSchema<BrandT extends string>(pattern: RegExp) {
  return z.string().regex(pattern) as unknown as z.ZodType<T.Brand<string, BrandT>>;
}

export const CaseIdSchema = createBrandSchema<'CaseId'>(/^CASE_[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/);
export const RevisionIdSchema = createBrandSchema<'RevisionId'>(/^R[0-9]{2,}$/);
export const IntakeIdSchema = createBrandSchema<'IntakeId'>(/^IN[0-9]{2,}$/);
export const StatementIdSchema = createBrandSchema<'StatementId'>(/^U[0-9]{2,}$/);
export const EvidenceIdSchema = createBrandSchema<'EvidenceId'>(/^E[0-9]{2,}$/);
export const RelationshipIdSchema = createBrandSchema<'RelationshipId'>(/^REL[0-9]{2,}$/);
export const EventIdSchema = createBrandSchema<'EventId'>(/^EV[0-9]{2,}$/);
export const ClaimIdSchema = createBrandSchema<'ClaimId'>(/^C[0-9]{2,}$/);
export const GapIdSchema = createBrandSchema<'GapId'>(/^G[0-9]{2,}$/);
export const ActionIdSchema = createBrandSchema<'ActionId'>(/^A[0-9]{2,}$/);
export const InspectionIdSchema = createBrandSchema<'InspectionId'>(/^EI[0-9]{2,}$/);
export const ModelRunIdSchema = createBrandSchema<'ModelRunId'>(/^MR[0-9]{2,}$/);
export const BlobRefSchema = createBrandSchema<'BlobRef'>(/^BLOB_[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/);

export const CaseNumberSchema = z.string() as unknown as z.ZodType<T.CaseNumber>;
export const CaseTitleSchema = z.string() as unknown as z.ZodType<T.CaseTitle>;

export const StructuralInstantSchema = z.string().regex(
  /^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\.[0-9]{3}Z$/
).superRefine((val, ctx) => {
  const parts = val.split('T')[0].split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let maxDays = daysInMonth[month - 1];
  if (month === 2 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)) {
    maxDays = 29;
  }
  if (day > maxDays) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid day for month" });
  }
}) as unknown as z.ZodType<T.StructuralInstant>;

export const PreservedTextSchema = z.string();
export const PreservedNonBlankTextSchema = z.string().refine(v => v.trim().length > 0, { message: "Cannot be blank" }) as unknown as z.ZodType<T.PreservedNonBlankText>;
export const DomainTimeTextSchema = PreservedNonBlankTextSchema as unknown as z.ZodType<T.DomainTimeText>;
export const SemanticTextSchema = z.string().refine(v => {
  const trimmed = v.trim();
  if (trimmed.length === 0) return false;
  const lower = trimmed.toLowerCase();
  if (lower === 'unknown' || lower === 'tbd' || lower === 'n/a') return false;
  return true;
}, { message: "Invalid semantic text" }) as unknown as z.ZodType<T.SemanticText>;

export const Sha256Schema = z.string().regex(/^sha256:[0-9a-f]{64}$/) as unknown as z.ZodType<T.Sha256>;
export const MimeTypeSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*\/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*$/) as unknown as z.ZodType<T.MimeType>;
export const ByteSizeSchema = z.number().int().nonnegative().refine(n => Number.isSafeInteger(n)) as unknown as z.ZodType<T.ByteSize>;
export const NonNegativeIntegerSchema = z.number().int().nonnegative().refine(n => Number.isSafeInteger(n)) as unknown as z.ZodType<T.NonNegativeInteger>;

export const SourceIdSchema = z.union([StatementIdSchema, EvidenceIdSchema]);

export const AcquisitionMethodSchema = z.enum(['user_upload', 'pasted_text', 'file_drop', 'manual_entry']);
export const InputFormSchema = z.enum(['screenshot', 'image', 'email_text', 'pdf', 'receipt', 'chat_transcript', 'document', 'other']);
export const AssessmentStateSchema = z.enum(['Reported', 'Corroborated', 'Contested', 'Established within current record', 'Mutually acknowledged']);
export const EvidenceMatchStatusSchema = z.enum(['matched', 'mismatched', 'unclear', 'not_assessed']);
export const GapStatusSchema = z.enum(['open', 'resolved', 'superseded', 'unavailable', 'no_longer_material']);
export const ActionStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
export const PrioritySchema = z.enum(['high', 'medium', 'low']);

export const StatementIntakePartSchema = z.object({
  kind: z.literal('statement'),
  statement_id: StatementIdSchema,
  raw_text: PreservedNonBlankTextSchema,
}).strict();

export const EvidenceIntakePartSchema = z.object({
  kind: z.literal('evidence'),
  evidence_id: EvidenceIdSchema,
}).strict();

export const IntakePartSchema = z.discriminatedUnion('kind', [StatementIntakePartSchema, EvidenceIntakePartSchema]);

export const IntakeRecordSchema = z.object({
  id: IntakeIdSchema,
  received_at: StructuralInstantSchema,
  parts: z.array(IntakePartSchema).min(1),
}).strict();

export const CanonicalStatementSchema = z.object({
  id: StatementIdSchema,
  source_intake_id: IntakeIdSchema,
  text: PreservedNonBlankTextSchema,
}).strict();

export const BlobMetadataSchema = z.object({
  blob_ref: BlobRefSchema,
  submitted_filename: PreservedNonBlankTextSchema,
  mime_type: MimeTypeSchema,
  byte_size: ByteSizeSchema,
  sha256: Sha256Schema,
}).strict();

export const EvidenceContentSchema = z.object({
  raw_text: PreservedNonBlankTextSchema.nullable(),
  extracted_text: PreservedNonBlankTextSchema.nullable(),
  blob: BlobMetadataSchema.nullable(),
}).strict().superRefine((val, ctx) => {
  if (val.raw_text === null && val.blob === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "At least one of raw_text or blob must be non-null" });
  }
});

export const CanonicalEvidenceSchema = z.object({
  id: EvidenceIdSchema,
  source_intake_id: IntakeIdSchema,
  label: PreservedNonBlankTextSchema,
  claimed_source: PreservedNonBlankTextSchema,
  acquisition_method: AcquisitionMethodSchema,
  input_form: InputFormSchema,
  original_domain_time: DomainTimeTextSchema.nullable(),
  subject_object_ids: z.array(PreservedNonBlankTextSchema).refine(
    (arr) => new Set(arr).size === arr.length,
    { message: "Duplicate subject_object_ids" }
  ),
  content: EvidenceContentSchema,
}).strict().superRefine((val, ctx) => {
  if (val.acquisition_method === 'pasted_text' || val.acquisition_method === 'manual_entry') {
    if (val.content.raw_text === null) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "raw_text must be non-null for pasted_text/manual_entry" });
    if (val.content.blob !== null) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "blob must be null for pasted_text/manual_entry" });
  } else if (val.acquisition_method === 'user_upload' || val.acquisition_method === 'file_drop') {
    if (val.content.blob === null) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "blob must be non-null for user_upload/file_drop" });
  }
});

export const SupportsClaimRelationshipSchema = z.object({
  id: RelationshipIdSchema,
  relationship_type: z.literal('supports_claim'),
  source_id: SourceIdSchema,
  target_id: ClaimIdSchema,
  reason: SemanticTextSchema,
  created_in_revision_id: RevisionIdSchema,
}).strict();

export const QualifiesClaimRelationshipSchema = z.object({
  id: RelationshipIdSchema,
  relationship_type: z.literal('qualifies_claim'),
  source_id: SourceIdSchema,
  target_id: ClaimIdSchema,
  reason: SemanticTextSchema,
  created_in_revision_id: RevisionIdSchema,
}).strict();

export const ConflictsWithClaimRelationshipSchema = z.object({
  id: RelationshipIdSchema,
  relationship_type: z.literal('conflicts_with_claim'),
  source_id: SourceIdSchema,
  target_id: ClaimIdSchema,
  reason: SemanticTextSchema,
  created_in_revision_id: RevisionIdSchema,
}).strict();

export const GapSourceRelationshipSchema = z.object({
  id: RelationshipIdSchema,
  relationship_type: z.literal('raises_gap'),
  source_id: SourceIdSchema,
  target_id: GapIdSchema,
  reason: SemanticTextSchema,
  created_in_revision_id: RevisionIdSchema,
}).strict();

export const StatementCorrectionRelationshipSchema = z.object({
  id: RelationshipIdSchema,
  relationship_type: z.literal('corrects_statement'),
  source_id: StatementIdSchema,
  target_id: StatementIdSchema,
  reason: SemanticTextSchema,
  created_in_revision_id: RevisionIdSchema,
}).strict();

export const UnclassifiedSourceRelationshipSchema = z.object({
  id: RelationshipIdSchema,
  relationship_type: z.literal('not_yet_classified'),
  source_id: SourceIdSchema,
  target_id: z.null(),
  reason: SemanticTextSchema,
  created_in_revision_id: RevisionIdSchema,
}).strict();

export const AcceptedRelationshipSchema = z.discriminatedUnion('relationship_type', [
  SupportsClaimRelationshipSchema,
  QualifiesClaimRelationshipSchema,
  ConflictsWithClaimRelationshipSchema,
  GapSourceRelationshipSchema,
  StatementCorrectionRelationshipSchema,
  UnclassifiedSourceRelationshipSchema,
]);

export const EventSchema = z.object({
  id: EventIdSchema,
  domain_time: DomainTimeTextSchema,
  actor: SemanticTextSchema,
  action: SemanticTextSchema,
  target: SemanticTextSchema,
  effect: SemanticTextSchema,
  source_support_ids: z.array(SourceIdSchema).min(1).refine(
    (arr) => new Set(arr).size === arr.length,
    { message: "Duplicate source_support_ids" }
  ),
  assessment: AssessmentStateSchema,
}).strict();

export const ClaimSchema = z.object({
  id: ClaimIdSchema,
  proposition: SemanticTextSchema,
  actor: SemanticTextSchema,
  action: SemanticTextSchema,
  target: SemanticTextSchema,
  domain_time: DomainTimeTextSchema,
  assessment: AssessmentStateSchema,
  reasoning: SemanticTextSchema,
  scope: SemanticTextSchema,
  limits: z.array(SemanticTextSchema).refine(
    (arr) => new Set(arr).size === arr.length,
    { message: "Duplicate limits" }
  ),
  supporting_source_ids: z.array(SourceIdSchema).refine(arr => new Set(arr).size === arr.length, { message: "Duplicates" }),
  qualifying_source_ids: z.array(SourceIdSchema).refine(arr => new Set(arr).size === arr.length, { message: "Duplicates" }),
  conflicting_source_ids: z.array(SourceIdSchema).refine(arr => new Set(arr).size === arr.length, { message: "Duplicates" }),
}).strict().superRefine((val, ctx) => {
  const combined = [...val.supporting_source_ids, ...val.qualifying_source_ids, ...val.conflicting_source_ids];
  if (combined.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Claim must have at least one source" });
  }
  if (new Set(combined).size !== combined.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Source ID overlaps across claim categories" });
  }
});

export const GapTransitionSchema = z.object({
  previous_status: GapStatusSchema,
  resulting_status: GapStatusSchema,
  transition_revision_id: RevisionIdSchema,
  reason: SemanticTextSchema,
  supporting_source_ids: z.array(SourceIdSchema).min(1).refine(arr => new Set(arr).size === arr.length, { message: "Duplicates" }),
}).strict();

export const GapSchema = z.object({
  id: GapIdSchema,
  question: SemanticTextSchema,
  relevance: SemanticTextSchema,
  resolving_evidence: SemanticTextSchema,
  acquisition_guidance: SemanticTextSchema,
  collection_boundary: SemanticTextSchema,
  target_claim_ids: z.array(ClaimIdSchema).min(1).refine(arr => new Set(arr).size === arr.length, { message: "Duplicates" }),
  status: GapStatusSchema,
  transition: GapTransitionSchema.nullable(),
}).strict().superRefine((val, ctx) => {
  if (val.transition === null) {
    if (val.status !== 'open') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "New gap must be open" });
    }
  } else {
    if (val.transition.resulting_status !== val.status) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "resulting_status mismatch" });
    }
  }
});

export const ActionTransitionSchema = z.object({
  previous_status: ActionStatusSchema,
  resulting_status: ActionStatusSchema,
  transition_revision_id: RevisionIdSchema,
  reason: SemanticTextSchema,
  supporting_source_ids: z.array(SourceIdSchema).min(1).refine(arr => new Set(arr).size === arr.length, { message: "Duplicates" }),
}).strict();

export const ActionSchema = z.object({
  id: ActionIdSchema,
  title: SemanticTextSchema,
  description: SemanticTextSchema,
  target_gap_ids: z.array(GapIdSchema).min(1).refine(arr => new Set(arr).size === arr.length, { message: "Duplicates" }),
  priority: PrioritySchema,
  status: ActionStatusSchema,
  transition: ActionTransitionSchema.nullable(),
}).strict().superRefine((val, ctx) => {
  if (val.transition === null) {
    if (val.status !== 'pending') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "New action must be pending" });
    }
  } else {
    if (val.transition.resulting_status !== val.status) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "resulting_status mismatch" });
    }
  }
});

export const EvidenceInspectionSchema = z.object({
  id: InspectionIdSchema,
  evidence_id: EvidenceIdSchema,
  source_attribution: SemanticTextSchema,
  case_object_match: SemanticTextSchema,
  match_status: EvidenceMatchStatusSchema,
  completeness_context: SemanticTextSchema,
  integrity_signals: SemanticTextSchema,
  limitations: z.array(SemanticTextSchema).refine(arr => new Set(arr).size === arr.length, { message: "Duplicates" }),
}).strict();


export const IntakeDeltaEntrySchema = z.object({
  entity_type: z.literal('intake'),
  entity_id: IntakeIdSchema,
  operation: z.literal('add'),
  reason: SemanticTextSchema,
  source_ids: z.array(SourceIdSchema).refine(arr => new Set(arr).size === arr.length, { message: "Duplicates" }),
}).strict();

export const StatementDeltaEntrySchema = z.object({
  entity_type: z.literal('statement'),
  entity_id: StatementIdSchema,
  operation: z.literal('add'),
  reason: SemanticTextSchema,
  source_ids: z.array(SourceIdSchema).refine(arr => new Set(arr).size === arr.length, { message: "Duplicates" }),
}).strict();

export const EvidenceDeltaEntrySchema = z.object({
  entity_type: z.literal('evidence'),
  entity_id: EvidenceIdSchema,
  operation: z.literal('add'),
  reason: SemanticTextSchema,
  source_ids: z.array(SourceIdSchema).refine(arr => new Set(arr).size === arr.length, { message: "Duplicates" }),
}).strict();

export const RelationshipDeltaEntrySchema = z.object({
  entity_type: z.literal('relationship'),
  entity_id: RelationshipIdSchema,
  operation: z.literal('add'),
  reason: SemanticTextSchema,
  source_ids: z.array(SourceIdSchema).refine(arr => new Set(arr).size === arr.length, { message: "Duplicates" }),
}).strict();

export const EventDeltaEntrySchema = z.object({
  entity_type: z.literal('event'),
  entity_id: EventIdSchema,
  operation: z.enum(['add', 'update']),
  reason: SemanticTextSchema,
  source_ids: z.array(SourceIdSchema).min(1).refine(arr => new Set(arr).size === arr.length, { message: "Duplicates" }),
}).strict();

export const ClaimDeltaEntrySchema = z.object({
  entity_type: z.literal('claim'),
  entity_id: ClaimIdSchema,
  operation: z.enum(['add', 'update']),
  reason: SemanticTextSchema,
  source_ids: z.array(SourceIdSchema).min(1).refine(arr => new Set(arr).size === arr.length, { message: "Duplicates" }),
}).strict();

export const GapDeltaEntrySchema = z.object({
  entity_type: z.literal('gap'),
  entity_id: GapIdSchema,
  operation: z.enum(['add', 'update', 'transition']),
  reason: SemanticTextSchema,
  source_ids: z.array(SourceIdSchema).min(1).refine(arr => new Set(arr).size === arr.length, { message: "Duplicates" }),
}).strict();

export const ActionDeltaEntrySchema = z.object({
  entity_type: z.literal('action'),
  entity_id: ActionIdSchema,
  operation: z.enum(['add', 'update', 'transition']),
  reason: SemanticTextSchema,
  source_ids: z.array(SourceIdSchema).min(1).refine(arr => new Set(arr).size === arr.length, { message: "Duplicates" }),
}).strict();

export const InspectionDeltaEntrySchema = z.object({
  entity_type: z.literal('inspection'),
  entity_id: InspectionIdSchema,
  operation: z.enum(['add', 'update']),
  reason: SemanticTextSchema,
  source_ids: z.array(SourceIdSchema).min(1).refine(arr => new Set(arr).size === arr.length, { message: "Duplicates" }),
}).strict();

export const DeltaEntrySchema = z.discriminatedUnion('entity_type', [
  IntakeDeltaEntrySchema,
  StatementDeltaEntrySchema,
  EvidenceDeltaEntrySchema,
  RelationshipDeltaEntrySchema,
  EventDeltaEntrySchema,
  ClaimDeltaEntrySchema,
  GapDeltaEntrySchema,
  ActionDeltaEntrySchema,
  InspectionDeltaEntrySchema,
]);

export const RevisionDeltaSchema = z.object({
  entries: z.array(DeltaEntrySchema),
}).strict();

export const DeterministicSummarySchema = z.object({
  total_evidence_count: NonNegativeIntegerSchema,
  established_claims_count: NonNegativeIntegerSchema,
  unresolved_claims_count: NonNegativeIntegerSchema,
  conflicted_claims_count: NonNegativeIntegerSchema,
  user_reported_claims_count: NonNegativeIntegerSchema,
}).strict();

export const RevisionSchema = z.object({
  id: RevisionIdSchema,
  parent_id: RevisionIdSchema.nullable(),
  created_at: StructuralInstantSchema,
  objective: SemanticTextSchema,
  explanation: SemanticTextSchema,
  assistant_message: SemanticTextSchema,
  accepted_model_run_id: ModelRunIdSchema,
  triggering_intake_ids: z.array(IntakeIdSchema).min(1).refine(arr => new Set(arr).size === arr.length, { message: "Duplicates" }),
  input_statement_ids: z.array(StatementIdSchema).refine(arr => new Set(arr).size === arr.length, { message: "Duplicates" }),
  input_evidence_ids: z.array(EvidenceIdSchema).refine(arr => new Set(arr).size === arr.length, { message: "Duplicates" }),
  events: z.array(EventSchema).refine(arr => new Set(arr.map(x=>x.id)).size === arr.length, { message: "Duplicates" }),
  claims: z.array(ClaimSchema).refine(arr => new Set(arr.map(x=>x.id)).size === arr.length, { message: "Duplicates" }),
  gaps: z.array(GapSchema).refine(arr => new Set(arr.map(x=>x.id)).size === arr.length, { message: "Duplicates" }),
  actions: z.array(ActionSchema).refine(arr => new Set(arr.map(x=>x.id)).size === arr.length, { message: "Duplicates" }),
  inspections: z.array(EvidenceInspectionSchema).refine(arr => new Set(arr.map(x=>x.id)).size === arr.length, { message: "Duplicates" }),
  delta: RevisionDeltaSchema,
  summary: DeterministicSummarySchema,
}).strict();

export const LedgerV3CaseSchema = z.object({
  id: CaseIdSchema,
  schema_version: z.literal('3.0.0'),
  case_number: CaseNumberSchema,
  title: CaseTitleSchema,
  created_at: StructuralInstantSchema,
  current_revision_id: RevisionIdSchema.nullable(),
  intake_ledger: z.array(IntakeRecordSchema).refine(arr => new Set(arr.map(x=>x.id)).size === arr.length, { message: "Duplicates" }),
  statements: z.array(CanonicalStatementSchema).refine(arr => new Set(arr.map(x=>x.id)).size === arr.length, { message: "Duplicates" }),
  evidence: z.array(CanonicalEvidenceSchema).refine(arr => new Set(arr.map(x=>x.id)).size === arr.length, { message: "Duplicates" }),
  relationships: z.array(AcceptedRelationshipSchema).refine(arr => new Set(arr.map(x=>x.id)).size === arr.length, { message: "Duplicates" }),
  revisions: z.array(RevisionSchema).refine(arr => new Set(arr.map(x=>x.id)).size === arr.length, { message: "Duplicates" }),
}).strict();
