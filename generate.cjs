const fs = require('fs');
const path = require('path');

const code = `import { z } from 'zod';
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
  /^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\\.[0-9]{3}Z$/
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
export const MimeTypeSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*\\/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*$/) as unknown as z.ZodType<T.MimeType>;
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

export function parseCaseId(raw: unknown): T.CaseId { return CaseIdSchema.parse(raw); }
export function parseCaseNumber(raw: unknown): T.CaseNumber { return CaseNumberSchema.parse(raw); }
export function parseCaseTitle(raw: unknown): T.CaseTitle { return CaseTitleSchema.parse(raw); }
export function parseStructuralInstant(raw: unknown): T.StructuralInstant { return StructuralInstantSchema.parse(raw); }

export function parseLedgerV3(raw: unknown): T.LedgerV3Case {
  const c = LedgerV3CaseSchema.parse(raw) as T.LedgerV3Case;

  if (c.revisions.length === 0) {
    if (c.current_revision_id !== null) throw new Error("Empty case must have null current_revision_id");
    if (c.intake_ledger.length > 0) throw new Error("Empty case must have no intake");
    if (c.statements.length > 0) throw new Error("Empty case must have no statements");
    if (c.evidence.length > 0) throw new Error("Empty case must have no evidence");
    if (c.relationships.length > 0) throw new Error("Empty case must have no relationships");
    return c;
  }

  if (c.current_revision_id !== c.revisions[c.revisions.length - 1].id) {
    throw new Error("current_revision_id must equal the final revision id");
  }

  const allIntakes = new Map(c.intake_ledger.map(i => [i.id, i]));
  const allStmts = new Map(c.statements.map(s => [s.id, s]));
  const allEvs = new Map(c.evidence.map(e => [e.id, e]));

  // Timestamps
  for (const i of c.intake_ledger) {
    if (i.received_at < c.created_at) throw new Error("Intake receipt before case creation");
  }
  for (let i = 0; i < c.revisions.length; i++) {
    const r = c.revisions[i];
    if (r.created_at < c.created_at) throw new Error("Revision creation before case creation");
    if (i > 0 && r.created_at < c.revisions[i-1].created_at) throw new Error("Revision timestamps decreasing");
    if (i === 0 && r.parent_id !== null) throw new Error("Genesis revision must have null parent");
    if (i > 0 && r.parent_id !== c.revisions[i-1].id) throw new Error("Invalid parent link");
  }

  // Intake Bijection
  const triggeredIntakes = new Set<string>();
  const stmtParts = new Map<string, T.StatementIntakePart>();
  const evParts = new Map<string, T.EvidenceIntakePart>();
  
  for (const r of c.revisions) {
    for (const tid of r.triggering_intake_ids) {
      if (!allIntakes.has(tid)) throw new Error("Dangling intake ID in revision");
      if (triggeredIntakes.has(tid)) throw new Error("Intake triggered multiple times");
      triggeredIntakes.add(tid);
      const intake = allIntakes.get(tid)!;
      if (intake.received_at > r.created_at) throw new Error("Intake received after introduction revision");
      for (const p of intake.parts) {
        if (p.kind === 'statement') {
          if (stmtParts.has(p.statement_id)) throw new Error("Duplicate statement in parts");
          stmtParts.set(p.statement_id, p);
        } else {
          if (evParts.has(p.evidence_id)) throw new Error("Duplicate evidence in parts");
          evParts.set(p.evidence_id, p);
        }
      }
    }
  }

  if (triggeredIntakes.size !== c.intake_ledger.length) throw new Error("Orphan intake not triggered by any revision");

  if (stmtParts.size !== c.statements.length) throw new Error("Statement count mismatch with parts");
  if (evParts.size !== c.evidence.length) throw new Error("Evidence count mismatch with parts");

  const expectedStmtOrder: string[] = [];
  const expectedEvOrder: string[] = [];
  for (const i of c.intake_ledger) {
    for (const p of i.parts) {
      if (p.kind === 'statement') expectedStmtOrder.push(p.statement_id);
      else expectedEvOrder.push(p.evidence_id);
    }
  }
  
  for (let i = 0; i < c.statements.length; i++) {
    const s = c.statements[i];
    if (s.id !== expectedStmtOrder[i]) throw new Error("Statement order mismatch");
    const p = stmtParts.get(s.id)!;
    if (s.text !== p.raw_text) throw new Error("Statement text mismatch");
    if (s.source_intake_id !== [...allIntakes.values()].find(int => int.parts.includes(p))!.id) throw new Error("Statement source_intake_id mismatch");
  }

  for (let i = 0; i < c.evidence.length; i++) {
    const e = c.evidence[i];
    if (e.id !== expectedEvOrder[i]) throw new Error("Evidence order mismatch");
    const p = evParts.get(e.id)!;
    if (e.source_intake_id !== [...allIntakes.values()].find(int => int.parts.includes(p))!.id) throw new Error("Evidence source_intake_id mismatch");
  }

  // Blob Ref uniqueness
  const blobRefs = new Set();
  for (const e of c.evidence) {
    if (e.content.blob) {
      if (blobRefs.has(e.content.blob.blob_ref)) throw new Error("Duplicate blob_ref");
      blobRefs.add(e.content.blob.blob_ref);
    }
  }

  // Verify revisions
  const knownRels = new Map<string, T.AcceptedRelationship>();
  for (const rel of c.relationships) {
    knownRels.set(rel.id, rel);
  }

  let prevRev: T.Revision | null = null;
  const introducedIntakesSoFar = new Set<string>();

  const acceptedModelRuns = new Set<string>();

  for (let revIdx = 0; revIdx < c.revisions.length; revIdx++) {
    const r = c.revisions[revIdx];
    
    if (acceptedModelRuns.has(r.accepted_model_run_id)) throw new Error("Model run already accepted");
    acceptedModelRuns.add(r.accepted_model_run_id);

    for (const tid of r.triggering_intake_ids) introducedIntakesSoFar.add(tid);

    const expectedInputStmts = c.statements.filter(s => introducedIntakesSoFar.has(s.source_intake_id)).map(s => s.id);
    const expectedInputEvs = c.evidence.filter(e => introducedIntakesSoFar.has(e.source_intake_id)).map(e => e.id);
    
    if (JSON.stringify(r.input_statement_ids) !== JSON.stringify(expectedInputStmts)) throw new Error("input_statement_ids mismatch");
    if (JSON.stringify(r.input_evidence_ids) !== JSON.stringify(expectedInputEvs)) throw new Error("input_evidence_ids mismatch");

    const availSources = new Set([...r.input_statement_ids, ...r.input_evidence_ids]);

    // Check rels creation
    for (const rel of c.relationships) {
      if (rel.created_in_revision_id === r.id) {
        if (!availSources.has(rel.source_id)) throw new Error("Relationship source unavailable at creation");
        if (rel.relationship_type === 'corrects_statement') {
          if (!availSources.has(rel.target_id!)) throw new Error("Correction target unavailable");
          if (rel.source_id === rel.target_id) throw new Error("Self-correction not allowed");
          if (!expectedInputStmts.includes(rel.source_id as any)) throw new Error("Evidence cannot correct statement");
          const srcIdx = expectedInputStmts.indexOf(rel.source_id as any);
          const tgtIdx = expectedInputStmts.indexOf(rel.target_id as any);
          if (srcIdx <= tgtIdx) throw new Error("Correction target must be introduced earlier");
        }
        if (rel.target_id) {
          if (rel.relationship_type === 'supports_claim' || rel.relationship_type === 'qualifies_claim' || rel.relationship_type === 'conflicts_with_claim') {
            if (!r.claims.find(c => c.id === rel.target_id)) throw new Error("Claim target not in snapshot");
          } else if (rel.relationship_type === 'raises_gap') {
            if (!r.gaps.find(g => g.id === rel.target_id)) throw new Error("Gap target not in snapshot");
          }
        }
      }
    }

    // Effective rel batches
    const effectiveRelsBySource = new Map<string, T.AcceptedRelationship[]>();
    for (const src of availSources) {
      const srcRels = c.relationships.filter(rel => rel.source_id === src && c.revisions.findIndex(rx => rx.id === rel.created_in_revision_id) <= revIdx);
      if (srcRels.length === 0) throw new Error("New source missing relationship batch");
      let maxRevIdx = -1;
      for (const rel of srcRels) {
        const ridx = c.revisions.findIndex(rx => rx.id === rel.created_in_revision_id);
        if (ridx > maxRevIdx) maxRevIdx = ridx;
      }
      const effective = srcRels.filter(rel => c.revisions.findIndex(rx => rx.id === rel.created_in_revision_id) === maxRevIdx);
      
      const seenTgt = new Set();
      let hasNotYetClassified = false;
      for (const rel of effective) {
        const key = rel.relationship_type + ':' + rel.target_id;
        if (seenTgt.has(key)) throw new Error("Duplicate relationship tuple in batch");
        seenTgt.add(key);
        if (rel.relationship_type === 'not_yet_classified') hasNotYetClassified = true;
      }
      if (hasNotYetClassified && effective.length > 1) throw new Error("not_yet_classified must be alone in batch");
      effectiveRelsBySource.set(src, effective);
    }

    // Check claims sources matches effective rels
    for (const clm of r.claims) {
      const expectedSupp = [];
      const expectedQual = [];
      const expectedConf = [];
      for (const src of r.input_statement_ids) {
        const batch = effectiveRelsBySource.get(src) || [];
        if (batch.find(rel => rel.relationship_type === 'supports_claim' && rel.target_id === clm.id)) expectedSupp.push(src);
        if (batch.find(rel => rel.relationship_type === 'qualifies_claim' && rel.target_id === clm.id)) expectedQual.push(src);
        if (batch.find(rel => rel.relationship_type === 'conflicts_with_claim' && rel.target_id === clm.id)) expectedConf.push(src);
      }
      for (const src of r.input_evidence_ids) {
        const batch = effectiveRelsBySource.get(src) || [];
        if (batch.find(rel => rel.relationship_type === 'supports_claim' && rel.target_id === clm.id)) expectedSupp.push(src);
        if (batch.find(rel => rel.relationship_type === 'qualifies_claim' && rel.target_id === clm.id)) expectedQual.push(src);
        if (batch.find(rel => rel.relationship_type === 'conflicts_with_claim' && rel.target_id === clm.id)) expectedConf.push(src);
      }
      if (JSON.stringify(clm.supporting_source_ids) !== JSON.stringify(expectedSupp)) throw new Error("Claim supporting_source_ids mismatch with effective rels");
      if (JSON.stringify(clm.qualifying_source_ids) !== JSON.stringify(expectedQual)) throw new Error("Claim qualifying_source_ids mismatch with effective rels");
      if (JSON.stringify(clm.conflicting_source_ids) !== JSON.stringify(expectedConf)) throw new Error("Claim conflicting_source_ids mismatch with effective rels");
    }

    // Continuity checks
    if (prevRev) {
      const checkOmission = (arrName, ident) => {
        const prevArr = prevRev[arrName];
        const currArr = r[arrName];
        for (let i = 0; i < prevArr.length; i++) {
          if (i >= currArr.length || prevArr[i].id !== currArr[i].id) throw new Error(\`Omission or reorder in \${arrName}\`);
          const p = prevArr[i];
          const c = currArr[i];
          for (const key of ident) {
            if (JSON.stringify(p[key]) !== JSON.stringify(c[key])) throw new Error(\`Immutable field \${key} changed in \${arrName}\`);
          }
        }
      };
      checkOmission('events', ['domain_time', 'actor', 'action', 'target']);
      checkOmission('claims', ['proposition', 'actor', 'action', 'target', 'domain_time']);
      checkOmission('gaps', ['question', 'target_claim_ids']);
      checkOmission('actions', ['title', 'target_gap_ids']);
      checkOmission('inspections', ['evidence_id']);
    }

    // Event targets
    for (const ev of r.events) {
      for (const src of ev.source_support_ids) {
        if (!availSources.has(src)) throw new Error("Event source unavailable");
      }
    }
    for (const g of r.gaps) {
      for (const tid of g.target_claim_ids) {
        if (!r.claims.find(c => c.id === tid)) throw new Error("Gap target claim unavailable");
      }
      if (g.transition) {
        if (g.transition.resulting_status !== g.status) throw new Error("Gap transition resulting_status mismatch");
        if (g.transition.transition_revision_id === r.id) {
          for (const src of g.transition.supporting_source_ids) {
            if (!availSources.has(src)) throw new Error("Gap transition source unavailable");
          }
        }
        if (prevRev) {
          const pg = prevRev.gaps.find(pg => pg.id === g.id);
          if (pg) {
            if (pg.status === g.status && JSON.stringify(pg.transition) !== JSON.stringify(g.transition)) throw new Error("Unchanged gap altered transition");
            if (pg.status !== g.status && g.transition.previous_status !== pg.status) throw new Error("Gap transition previous_status mismatch");
          }
        }
      }
    }

    for (const a of r.actions) {
      for (const tid of a.target_gap_ids) {
        if (!r.gaps.find(g => g.id === tid)) throw new Error("Action target gap unavailable");
      }
      if (a.transition) {
        if (a.transition.resulting_status !== a.status) throw new Error("Action transition resulting_status mismatch");
        if (a.transition.transition_revision_id === r.id) {
          for (const src of a.transition.supporting_source_ids) {
            if (!availSources.has(src)) throw new Error("Action transition source unavailable");
          }
        }
        if (prevRev) {
          const pa = prevRev.actions.find(pa => pa.id === a.id);
          if (pa) {
            if (pa.status === a.status && JSON.stringify(pa.transition) !== JSON.stringify(a.transition)) throw new Error("Unchanged action altered transition");
            if (pa.status !== a.status && a.transition.previous_status !== pa.status) throw new Error("Action transition previous_status mismatch");
          }
        }
      }
    }

    if (JSON.stringify(r.inspections.map(i => i.evidence_id)) !== JSON.stringify(expectedInputEvs)) {
      throw new Error("Inspections must exactly cover input_evidence_ids");
    }

    const validateAllowedTrans = (t, allowed) => {
      if (!allowed[t.previous_status]?.includes(t.resulting_status)) throw new Error("Forbidden transition");
    };
    for (const g of r.gaps) {
      if (g.transition && g.transition.transition_revision_id === r.id) {
        validateAllowedTrans(g.transition, {
          'open': ['resolved', 'superseded', 'unavailable', 'no_longer_material'],
          'resolved': ['open'],
          'unavailable': ['open', 'resolved', 'no_longer_material'],
          'no_longer_material': ['open'],
          'superseded': []
        });
      }
    }
    for (const a of r.actions) {
      if (a.transition && a.transition.transition_revision_id === r.id) {
        validateAllowedTrans(a.transition, {
          'pending': ['in_progress', 'completed', 'cancelled'],
          'in_progress': ['pending', 'completed', 'cancelled'],
          'completed': [],
          'cancelled': ['pending']
        });
      }
    }

    // Delta validation
    const expectedDeltas: any[] = [];
    for (const tid of r.triggering_intake_ids) {
      const intk = allIntakes.get(tid)!;
      const srcIds = [];
      for (const p of intk.parts) if(p.kind==='statement') srcIds.push(p.statement_id);
      for (const p of intk.parts) if(p.kind==='evidence') srcIds.push(p.evidence_id);
      
      expectedDeltas.push({ entity_type: 'intake', entity_id: tid, operation: 'add', reason: 'Accepted intake', source_ids: srcIds });
    }
    for (const tid of r.triggering_intake_ids) {
      const intk = allIntakes.get(tid)!;
      for (const p of intk.parts) {
        if (p.kind === 'statement') expectedDeltas.push({ entity_type: 'statement', entity_id: p.statement_id, operation: 'add', reason: 'Accepted source statement', source_ids: [p.statement_id] });
      }
    }
    for (const tid of r.triggering_intake_ids) {
      const intk = allIntakes.get(tid)!;
      for (const p of intk.parts) {
        if (p.kind === 'evidence') expectedDeltas.push({ entity_type: 'evidence', entity_id: p.evidence_id, operation: 'add', reason: 'Accepted evidence source', source_ids: [p.evidence_id] });
      }
    }
    const newRels = c.relationships.filter(rel => rel.created_in_revision_id === r.id);
    for (const rel of newRels) {
      expectedDeltas.push({ entity_type: 'relationship', entity_id: rel.id, operation: 'add', reason: rel.reason, source_ids: [rel.source_id] });
    }

    const checkDeltaObj = (type, arrName) => {
      const curr = r[arrName];
      const prev = prevRev ? prevRev[arrName] : [];
      for (let i = 0; i < curr.length; i++) {
        if (i >= prev.length) {
          const entry = r.delta.entries.find(e => e.entity_type === type && e.entity_id === curr[i].id && e.operation === 'add');
          if (!entry) throw new Error(\`Missing \${type}/add delta entry\`);
          expectedDeltas.push(entry);
        } else {
          if (JSON.stringify(curr[i]) !== JSON.stringify(prev[i])) {
            const isTrans = ['gap', 'action'].includes(type) && curr[i].status !== prev[i].status;
            const op = isTrans ? 'transition' : 'update';
            const entry = r.delta.entries.find(e => e.entity_type === type && e.entity_id === curr[i].id && e.operation === op);
            if (!entry) throw new Error(\`Missing \${type}/\${op} delta entry\`);
            expectedDeltas.push(entry);
          }
        }
      }
    };
    checkDeltaObj('event', 'events');
    checkDeltaObj('claim', 'claims');
    checkDeltaObj('gap', 'gaps');
    checkDeltaObj('action', 'actions');
    checkDeltaObj('inspection', 'inspections');

    if (r.delta.entries.length !== expectedDeltas.length) throw new Error("Delta entries mismatch");
    for (let i = 0; i < expectedDeltas.length; i++) {
      if (r.delta.entries[i].entity_type !== expectedDeltas[i].entity_type || r.delta.entries[i].entity_id !== expectedDeltas[i].entity_id || r.delta.entries[i].operation !== expectedDeltas[i].operation) {
        throw new Error("Delta order mismatch");
      }
      if (r.delta.entries[i].reason !== expectedDeltas[i].reason) {
        if (expectedDeltas[i].entity_type === 'intake' || expectedDeltas[i].entity_type === 'statement' || expectedDeltas[i].entity_type === 'evidence' || expectedDeltas[i].entity_type === 'relationship') {
           throw new Error("Delta reason mismatch");
        }
      }
      for (const src of r.delta.entries[i].source_ids) {
        if (!availSources.has(src)) throw new Error("Delta source unavailable");
      }
      if (r.delta.entries[i].operation === 'transition' && (expectedDeltas[i].entity_type === 'gap' || expectedDeltas[i].entity_type === 'action')) {
         const obj = r[expectedDeltas[i].entity_type + 's'].find(x => x.id === expectedDeltas[i].entity_id);
         if (JSON.stringify(r.delta.entries[i].source_ids) !== JSON.stringify(obj.transition.supporting_source_ids)) throw new Error("Transition delta source mismatch");
         if (r.delta.entries[i].reason !== obj.transition.reason) throw new Error("Transition delta reason mismatch");
      }
    }

    // Summary validation
    if (r.summary.total_evidence_count !== expectedInputEvs.length) throw new Error("summary total_evidence_count mismatch");
    if (r.summary.established_claims_count !== r.claims.filter(c => c.assessment === 'Established within current record').length) throw new Error("summary established mismatch");
    if (r.summary.unresolved_claims_count !== r.claims.filter(c => ['Reported', 'Corroborated', 'Contested'].includes(c.assessment)).length) throw new Error("summary unresolved mismatch");
    if (r.summary.conflicted_claims_count !== r.claims.filter(c => c.assessment === 'Contested').length) throw new Error("summary conflicted mismatch");
    if (r.summary.user_reported_claims_count !== r.claims.filter(c => c.assessment === 'Reported').length) throw new Error("summary user_reported mismatch");

    prevRev = r;
  }

  return c;
}
`;

fs.writeFileSync(path.join('c:\\Users\\VTD\\Downloads\\Explainable-Trust--main', 'src', 'ledger', 'schema.ts'), code);
