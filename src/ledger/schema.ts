import { z } from 'zod';
import type * as T from './types';
import { isAuthoritativeSourceUrl } from '../retrieval/sourcePolicy';

// ---------------------------------------------------------------------------
// Branded ID schemas – use .transform() to produce the branded type without
// using `as unknown as` or `z.any()`.
// ---------------------------------------------------------------------------

function brandId<Name extends string>(pattern: RegExp) {
  return z.string().regex(pattern).transform((v) => v as T.Brand<string, Name>);
}

export const CaseIdSchema = brandId<'CaseId'>(
  /^CASE_[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
);
export const RevisionIdSchema = brandId<'RevisionId'>(/^R[0-9]{2,}$/);
export const IntakeIdSchema = brandId<'IntakeId'>(/^IN[0-9]{2,}$/);
export const StatementIdSchema = brandId<'StatementId'>(/^U[0-9]{2,}$/);
export const EvidenceIdSchema = brandId<'EvidenceId'>(/^E[0-9]{2,}$/);
export const RelationshipIdSchema = brandId<'RelationshipId'>(/^REL[0-9]{2,}$/);
export const EventIdSchema = brandId<'EventId'>(/^EV[0-9]{2,}$/);
export const ClaimIdSchema = brandId<'ClaimId'>(/^C[0-9]{2,}$/);
export const GapIdSchema = brandId<'GapId'>(/^G[0-9]{2,}$/);
export const ActionIdSchema = brandId<'ActionId'>(/^A[0-9]{2,}$/);
export const InspectionIdSchema = brandId<'InspectionId'>(/^EI[0-9]{2,}$/);
export const ModelRunIdSchema = brandId<'ModelRunId'>(/^MR[0-9]{2,}$/);
export const BlobRefSchema = brandId<'BlobRef'>(
  /^BLOB_[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/
);

// ---------------------------------------------------------------------------
// Primitive text schemas – same transform pattern for branded text types.
// ---------------------------------------------------------------------------

export const CaseNumberSchema = z
  .string()
  .transform((v) => v as T.CaseNumber);

export const CaseTitleSchema = z
  .string()
  .transform((v) => v as T.CaseTitle);

export const StructuralInstantSchema = z
  .string()
  .regex(
    /^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\.[0-9]{3}Z$/
  )
  .superRefine((val, ctx) => {
    const datePart = val.split('T')[0];
    const [yearStr, monthStr, dayStr] = datePart.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let maxDays = daysInMonth[month - 1];
    if (
      month === 2 &&
      ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)
    ) {
      maxDays = 29;
    }
    if (day > maxDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid day for month',
      });
    }
  })
  .transform((v) => v as T.StructuralInstant);

export const PreservedNonBlankTextSchema = z
  .string()
  .refine((v) => v.trim().length > 0, { message: 'Cannot be blank' })
  .transform((v) => v as T.PreservedNonBlankText);

export const DomainTimeTextSchema = z
  .string()
  .refine((v) => v.trim().length > 0, { message: 'Cannot be blank' })
  .transform((v) => v as T.DomainTimeText);

const SEMANTIC_SENTINELS = new Set(['unknown', 'tbd', 'n/a']);
export const SemanticTextSchema = z
  .string()
  .refine(
    (v) => {
      const trimmed = v.trim();
      return (
        trimmed.length > 0 && !SEMANTIC_SENTINELS.has(trimmed.toLowerCase())
      );
    },
    { message: 'Invalid semantic text' }
  )
  .transform((v) => v as T.SemanticText);

export const Sha256Schema = z
  .string()
  .regex(/^sha256:[0-9a-f]{64}$/)
  .transform((v) => v as T.Sha256);

export const MimeTypeSchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*\/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*$/)
  .transform((v) => v as T.MimeType);

export const ByteSizeSchema = z
  .number()
  .int()
  .nonnegative()
  .refine((n) => Number.isSafeInteger(n), {
    message: 'Unsafe byte size integer',
  })
  .transform((v) => v as T.ByteSize);

export const NonNegativeIntegerSchema = z
  .number()
  .int()
  .nonnegative()
  .refine((n) => Number.isSafeInteger(n), {
    message: 'Unsafe non-negative integer',
  })
  .transform((v) => v as T.NonNegativeInteger);

export const SourceIdSchema: z.ZodType<T.SourceId> = z.union([
  StatementIdSchema,
  EvidenceIdSchema,
]);

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const AcquisitionMethodSchema = z.enum([
  'user_upload',
  'pasted_text',
  'file_drop',
  'manual_entry',
  'authoritative_web_retrieval',
]);
export const InputFormSchema = z.enum([
  'screenshot',
  'image',
  'email_text',
  'pdf',
  'receipt',
  'chat_transcript',
  'document',
  'web_excerpt',
  'other',
]);
export const AssessmentStateSchema = z.enum([
  'Reported',
  'Corroborated',
  'Contested',
  'Established within current record',
  'Mutually acknowledged',
]);
export const EvidenceMatchStatusSchema = z.enum([
  'matched',
  'mismatched',
  'unclear',
  'not_assessed',
]);
export const GapStatusSchema = z.enum([
  'open',
  'resolved',
  'superseded',
  'unavailable',
  'no_longer_material',
]);
export const ActionStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'cancelled',
]);
export const PrioritySchema = z.enum(['high', 'medium', 'low']);

// ---------------------------------------------------------------------------
// Intake
// ---------------------------------------------------------------------------

export const StatementIntakePartSchema = z
  .object({
    kind: z.literal('statement'),
    statement_id: StatementIdSchema,
    raw_text: PreservedNonBlankTextSchema,
  })
  .strict();

export const EvidenceIntakePartSchema = z
  .object({
    kind: z.literal('evidence'),
    evidence_id: EvidenceIdSchema,
  })
  .strict();

export const IntakePartSchema = z.discriminatedUnion('kind', [
  StatementIntakePartSchema,
  EvidenceIntakePartSchema,
]);

export const IntakeRecordSchema = z
  .object({
    id: IntakeIdSchema,
    received_at: StructuralInstantSchema,
    parts: z.array(IntakePartSchema).min(1),
  })
  .strict();

// ---------------------------------------------------------------------------
// Statement / Evidence
// ---------------------------------------------------------------------------

export const CanonicalStatementSchema = z
  .object({
    id: StatementIdSchema,
    source_intake_id: IntakeIdSchema,
    text: PreservedNonBlankTextSchema,
  })
  .strict();

export const BlobMetadataSchema = z
  .object({
    blob_ref: BlobRefSchema,
    submitted_filename: PreservedNonBlankTextSchema,
    mime_type: MimeTypeSchema,
    byte_size: ByteSizeSchema,
    sha256: Sha256Schema,
  })
  .strict();

export const EvidenceContentSchema = z
  .object({
    raw_text: PreservedNonBlankTextSchema.nullable(),
    extracted_text: PreservedNonBlankTextSchema.nullable(),
    blob: BlobMetadataSchema.nullable(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.raw_text === null && val.blob === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one of raw_text or blob must be non-null',
      });
    }
  });

export const WebEvidenceProvenanceSchema = z.object({
  publisher: PreservedNonBlankTextSchema,
  page_title: PreservedNonBlankTextSchema,
  source_url: z.string().url().max(2048).refine((value) => value.startsWith('https://'), {
    message: 'Web evidence source_url must use HTTPS',
  }),
  published_or_updated_at: DomainTimeTextSchema.nullable(),
  retrieved_at: StructuralInstantSchema,
  authority_kind: z.enum(['first_party_official', 'public_authority']),
  authority_entity: PreservedNonBlankTextSchema,
  authority_scope: PreservedNonBlankTextSchema,
  search_query: PreservedNonBlankTextSchema,
}).strict().superRefine((value, context) => {
  if (!isAuthoritativeSourceUrl(value.source_url, value.authority_entity, value.authority_kind)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Web evidence URL does not match the declared first-party/public authority',
      path: ['source_url'],
    });
  }
});

export const CanonicalEvidenceSchema = z
  .object({
    id: EvidenceIdSchema,
    source_intake_id: IntakeIdSchema,
    label: PreservedNonBlankTextSchema,
    claimed_source: PreservedNonBlankTextSchema,
    acquisition_method: AcquisitionMethodSchema,
    input_form: InputFormSchema,
    original_domain_time: DomainTimeTextSchema.nullable(),
    subject_object_ids: z
      .array(PreservedNonBlankTextSchema)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate subject_object_ids',
      }),
    content: EvidenceContentSchema,
    web_provenance: WebEvidenceProvenanceSchema.optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    const m = val.acquisition_method;
    if (m === 'pasted_text' || m === 'manual_entry') {
      if (val.content.raw_text === null)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'raw_text required for pasted_text/manual_entry',
        });
      if (val.content.blob !== null)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'blob must be null for pasted_text/manual_entry',
        });
    } else if (m === 'user_upload' || m === 'file_drop') {
      if (val.content.blob === null)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'blob required for user_upload/file_drop',
        });
    } else if (m === 'authoritative_web_retrieval') {
      if (val.input_form !== 'web_excerpt')
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'authoritative_web_retrieval requires web_excerpt input form',
        });
      if (val.content.raw_text === null || val.content.extracted_text !== null || val.content.blob !== null)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'authoritative web evidence must preserve one raw excerpt without extracted text or blob',
        });
      if (val.web_provenance === undefined)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'authoritative web evidence requires web_provenance',
        });
    }
    if (m !== 'authoritative_web_retrieval' && val.web_provenance !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'web_provenance is allowed only for authoritative_web_retrieval',
      });
    }
    if (m !== 'authoritative_web_retrieval' && val.input_form === 'web_excerpt') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'web_excerpt is allowed only for authoritative_web_retrieval',
      });
    }
  });

// ---------------------------------------------------------------------------
// Relationships – discriminated union with exact family enforcement
// ---------------------------------------------------------------------------

export const SupportsClaimRelationshipSchema = z
  .object({
    id: RelationshipIdSchema,
    relationship_type: z.literal('supports_claim'),
    source_id: SourceIdSchema,
    target_id: ClaimIdSchema,
    reason: SemanticTextSchema,
    created_in_revision_id: RevisionIdSchema,
  })
  .strict();

export const QualifiesClaimRelationshipSchema = z
  .object({
    id: RelationshipIdSchema,
    relationship_type: z.literal('qualifies_claim'),
    source_id: SourceIdSchema,
    target_id: ClaimIdSchema,
    reason: SemanticTextSchema,
    created_in_revision_id: RevisionIdSchema,
  })
  .strict();

export const ConflictsWithClaimRelationshipSchema = z
  .object({
    id: RelationshipIdSchema,
    relationship_type: z.literal('conflicts_with_claim'),
    source_id: SourceIdSchema,
    target_id: ClaimIdSchema,
    reason: SemanticTextSchema,
    created_in_revision_id: RevisionIdSchema,
  })
  .strict();

export const GapSourceRelationshipSchema = z
  .object({
    id: RelationshipIdSchema,
    relationship_type: z.literal('raises_gap'),
    source_id: SourceIdSchema,
    target_id: GapIdSchema,
    reason: SemanticTextSchema,
    created_in_revision_id: RevisionIdSchema,
  })
  .strict();

export const StatementCorrectionRelationshipSchema = z
  .object({
    id: RelationshipIdSchema,
    relationship_type: z.literal('corrects_statement'),
    source_id: StatementIdSchema,
    target_id: StatementIdSchema,
    reason: SemanticTextSchema,
    created_in_revision_id: RevisionIdSchema,
  })
  .strict();

export const UnclassifiedSourceRelationshipSchema = z
  .object({
    id: RelationshipIdSchema,
    relationship_type: z.literal('not_yet_classified'),
    source_id: SourceIdSchema,
    target_id: z.null(),
    reason: SemanticTextSchema,
    created_in_revision_id: RevisionIdSchema,
  })
  .strict();

export const AcceptedRelationshipSchema = z.discriminatedUnion(
  'relationship_type',
  [
    SupportsClaimRelationshipSchema,
    QualifiesClaimRelationshipSchema,
    ConflictsWithClaimRelationshipSchema,
    GapSourceRelationshipSchema,
    StatementCorrectionRelationshipSchema,
    UnclassifiedSourceRelationshipSchema,
  ]
);

// ---------------------------------------------------------------------------
// Snapshot entities
// ---------------------------------------------------------------------------

export const EventSchema = z
  .object({
    id: EventIdSchema,
    domain_time: DomainTimeTextSchema,
    actor: SemanticTextSchema,
    action: SemanticTextSchema,
    target: SemanticTextSchema,
    effect: SemanticTextSchema,
    source_support_ids: z
      .array(SourceIdSchema)
      .min(1)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate source_support_ids',
      }),
    finding_ids: z
      .array(ClaimIdSchema)
      .min(1)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate finding_ids',
      })
      .optional(),
    assessment: AssessmentStateSchema,
  })
  .strict();

export const ClaimSchema = z
  .object({
    id: ClaimIdSchema,
    proposition: SemanticTextSchema,
    actor: SemanticTextSchema,
    action: SemanticTextSchema,
    target: SemanticTextSchema,
    domain_time: DomainTimeTextSchema,
    assessment: AssessmentStateSchema,
    reasoning: SemanticTextSchema,
    scope: SemanticTextSchema,
    limits: z
      .array(SemanticTextSchema)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate limits',
      }),
    supporting_source_ids: z
      .array(SourceIdSchema)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicates in supporting_source_ids',
      }),
    qualifying_source_ids: z
      .array(SourceIdSchema)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicates in qualifying_source_ids',
      }),
    conflicting_source_ids: z
      .array(SourceIdSchema)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicates in conflicting_source_ids',
      }),
  })
  .strict()
  .superRefine((val, ctx) => {
    const combined = [
      ...val.supporting_source_ids,
      ...val.qualifying_source_ids,
      ...val.conflicting_source_ids,
    ];
    if (combined.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Claim must have at least one source across all categories',
      });
    }
    if (new Set(combined).size !== combined.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Source ID appears in more than one claim category',
      });
    }
  });

export const GapTransitionSchema = z
  .object({
    previous_status: GapStatusSchema,
    resulting_status: GapStatusSchema,
    transition_revision_id: RevisionIdSchema,
    reason: SemanticTextSchema,
    supporting_source_ids: z
      .array(SourceIdSchema)
      .min(1)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate transition sources',
      }),
  })
  .strict();

export const GapSchema = z
  .object({
    id: GapIdSchema,
    question: SemanticTextSchema,
    relevance: SemanticTextSchema,
    resolving_evidence: SemanticTextSchema,
    acquisition_guidance: SemanticTextSchema,
    collection_boundary: SemanticTextSchema,
    target_claim_ids: z
      .array(ClaimIdSchema)
      .min(1)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate target_claim_ids',
      }),
    status: GapStatusSchema,
    transition: GapTransitionSchema.nullable(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.transition !== null) {
      if (val.transition.resulting_status !== val.status) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Gap transition resulting_status must equal gap status',
        });
      }
    }
  });

export const ActionTransitionSchema = z
  .object({
    previous_status: ActionStatusSchema,
    resulting_status: ActionStatusSchema,
    transition_revision_id: RevisionIdSchema,
    reason: SemanticTextSchema,
    supporting_source_ids: z
      .array(SourceIdSchema)
      .min(1)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate transition sources',
      }),
  })
  .strict();

export const ActionSchema = z
  .object({
    id: ActionIdSchema,
    title: SemanticTextSchema,
    description: SemanticTextSchema,
    target_gap_ids: z
      .array(GapIdSchema)
      .min(1)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate target_gap_ids',
      }),
    priority: PrioritySchema,
    status: ActionStatusSchema,
    transition: ActionTransitionSchema.nullable(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.transition !== null) {
      if (val.transition.resulting_status !== val.status) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Action transition resulting_status must equal action status',
        });
      }
    }
  });

export const EvidenceInspectionSchema = z
  .object({
    id: InspectionIdSchema,
    evidence_id: EvidenceIdSchema,
    source_attribution: SemanticTextSchema,
    case_object_match: SemanticTextSchema,
    match_status: EvidenceMatchStatusSchema,
    completeness_context: SemanticTextSchema,
    integrity_signals: SemanticTextSchema,
    limitations: z
      .array(SemanticTextSchema)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate limitations',
      }),
  })
  .strict();

// ---------------------------------------------------------------------------
// Delta entries – discriminated union, exact per-entity-type operation sets
// ---------------------------------------------------------------------------

export const IntakeDeltaEntrySchema = z
  .object({
    entity_type: z.literal('intake'),
    entity_id: IntakeIdSchema,
    operation: z.literal('add'),
    reason: SemanticTextSchema,
    source_ids: z
      .array(SourceIdSchema)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate source_ids',
      }),
  })
  .strict();

export const StatementDeltaEntrySchema = z
  .object({
    entity_type: z.literal('statement'),
    entity_id: StatementIdSchema,
    operation: z.literal('add'),
    reason: SemanticTextSchema,
    source_ids: z
      .array(SourceIdSchema)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate source_ids',
      }),
  })
  .strict();

export const EvidenceDeltaEntrySchema = z
  .object({
    entity_type: z.literal('evidence'),
    entity_id: EvidenceIdSchema,
    operation: z.literal('add'),
    reason: SemanticTextSchema,
    source_ids: z
      .array(SourceIdSchema)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate source_ids',
      }),
  })
  .strict();

export const RelationshipDeltaEntrySchema = z
  .object({
    entity_type: z.literal('relationship'),
    entity_id: RelationshipIdSchema,
    operation: z.literal('add'),
    reason: SemanticTextSchema,
    source_ids: z
      .array(SourceIdSchema)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate source_ids',
      }),
  })
  .strict();

export const EventDeltaEntrySchema = z
  .object({
    entity_type: z.literal('event'),
    entity_id: EventIdSchema,
    operation: z.enum(['add', 'update']),
    reason: SemanticTextSchema,
    source_ids: z
      .array(SourceIdSchema)
      .min(1)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate source_ids',
      }),
  })
  .strict();

export const ClaimDeltaEntrySchema = z
  .object({
    entity_type: z.literal('claim'),
    entity_id: ClaimIdSchema,
    operation: z.enum(['add', 'update']),
    reason: SemanticTextSchema,
    source_ids: z
      .array(SourceIdSchema)
      .min(1)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate source_ids',
      }),
  })
  .strict();

export const GapDeltaEntrySchema = z
  .object({
    entity_type: z.literal('gap'),
    entity_id: GapIdSchema,
    operation: z.enum(['add', 'update', 'transition']),
    reason: SemanticTextSchema,
    source_ids: z
      .array(SourceIdSchema)
      .min(1)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate source_ids',
      }),
  })
  .strict();

export const ActionDeltaEntrySchema = z
  .object({
    entity_type: z.literal('action'),
    entity_id: ActionIdSchema,
    operation: z.enum(['add', 'update', 'transition']),
    reason: SemanticTextSchema,
    source_ids: z
      .array(SourceIdSchema)
      .min(1)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate source_ids',
      }),
  })
  .strict();

export const InspectionDeltaEntrySchema = z
  .object({
    entity_type: z.literal('inspection'),
    entity_id: InspectionIdSchema,
    operation: z.enum(['add', 'update']),
    reason: SemanticTextSchema,
    source_ids: z
      .array(SourceIdSchema)
      .min(1)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate source_ids',
      }),
  })
  .strict();

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

export const RevisionDeltaSchema = z
  .object({
    entries: z.array(DeltaEntrySchema),
  })
  .strict();

export const DeterministicSummarySchema = z
  .object({
    total_evidence_count: NonNegativeIntegerSchema,
    established_claims_count: NonNegativeIntegerSchema,
    unresolved_claims_count: NonNegativeIntegerSchema,
    conflicted_claims_count: NonNegativeIntegerSchema,
    user_reported_claims_count: NonNegativeIntegerSchema,
  })
  .strict();

export const RevisionSchema = z
  .object({
    id: RevisionIdSchema,
    parent_id: RevisionIdSchema.nullable(),
    created_at: StructuralInstantSchema,
    objective: SemanticTextSchema,
    explanation: SemanticTextSchema,
    assistant_message: SemanticTextSchema,
    accepted_model_run_id: ModelRunIdSchema,
    triggering_intake_ids: z
      .array(IntakeIdSchema)
      .min(1)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate triggering_intake_ids',
      }),
    input_statement_ids: z
      .array(StatementIdSchema)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate input_statement_ids',
      }),
    input_evidence_ids: z
      .array(EvidenceIdSchema)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate input_evidence_ids',
      }),
    events: z
      .array(EventSchema)
      .refine((arr) => new Set(arr.map((x) => x.id)).size === arr.length, {
        message: 'Duplicate event IDs',
      }),
    claims: z
      .array(ClaimSchema)
      .refine((arr) => new Set(arr.map((x) => x.id)).size === arr.length, {
        message: 'Duplicate claim IDs',
      }),
    gaps: z
      .array(GapSchema)
      .refine((arr) => new Set(arr.map((x) => x.id)).size === arr.length, {
        message: 'Duplicate gap IDs',
      }),
    actions: z
      .array(ActionSchema)
      .refine((arr) => new Set(arr.map((x) => x.id)).size === arr.length, {
        message: 'Duplicate action IDs',
      }),
    inspections: z
      .array(EvidenceInspectionSchema)
      .refine((arr) => new Set(arr.map((x) => x.id)).size === arr.length, {
        message: 'Duplicate inspection IDs',
      }),
    delta: RevisionDeltaSchema,
    summary: DeterministicSummarySchema,
  })
  .strict();

export const LedgerV3CaseSchema = z
  .object({
    id: CaseIdSchema,
    schema_version: z.literal('3.0.0'),
    case_number: CaseNumberSchema,
    title: CaseTitleSchema,
    created_at: StructuralInstantSchema,
    current_revision_id: RevisionIdSchema.nullable(),
    intake_ledger: z
      .array(IntakeRecordSchema)
      .refine((arr) => new Set(arr.map((x) => x.id)).size === arr.length, {
        message: 'Duplicate intake IDs',
      }),
    statements: z
      .array(CanonicalStatementSchema)
      .refine((arr) => new Set(arr.map((x) => x.id)).size === arr.length, {
        message: 'Duplicate statement IDs',
      }),
    evidence: z
      .array(CanonicalEvidenceSchema)
      .refine((arr) => new Set(arr.map((x) => x.id)).size === arr.length, {
        message: 'Duplicate evidence IDs',
      }),
    relationships: z
      .array(AcceptedRelationshipSchema)
      .refine((arr) => new Set(arr.map((x) => x.id)).size === arr.length, {
        message: 'Duplicate relationship IDs',
      }),
    revisions: z
      .array(RevisionSchema)
      .refine((arr) => new Set(arr.map((x) => x.id)).size === arr.length, {
        message: 'Duplicate revision IDs',
      }),
  })
  .strict();

// ---------------------------------------------------------------------------
// Primitive constructors (public API)
// ---------------------------------------------------------------------------

export function parseCaseId(raw: unknown): T.CaseId {
  return CaseIdSchema.parse(raw);
}
export function parseCaseNumber(raw: unknown): T.CaseNumber {
  return CaseNumberSchema.parse(raw);
}
export function parseCaseTitle(raw: unknown): T.CaseTitle {
  return CaseTitleSchema.parse(raw);
}
export function parseStructuralInstant(raw: unknown): T.StructuralInstant {
  return StructuralInstantSchema.parse(raw);
}

// ---------------------------------------------------------------------------
// Typed helpers used only within parseLedgerV3
// ---------------------------------------------------------------------------

interface ExpectedDelta {
  entity_type: T.DeltaEntry['entity_type'];
  entity_id: string;
  operation: string;
  reason: string;
  source_ids: string[];
}

const GAP_ALLOWED_TRANSITIONS: Record<T.GapStatus, T.GapStatus[]> = {
  open: ['resolved', 'superseded', 'unavailable', 'no_longer_material'],
  resolved: ['open'],
  unavailable: ['open', 'resolved', 'no_longer_material'],
  no_longer_material: ['open'],
  superseded: [],
};

const ACTION_ALLOWED_TRANSITIONS: Record<T.ActionStatus, T.ActionStatus[]> = {
  pending: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['pending', 'completed', 'cancelled'],
  completed: [],
  cancelled: ['pending'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isDuplicateFreeSubsequence(sub: string[], full: string[]): boolean {
  if (new Set(sub).size !== sub.length) return false;
  let fullIdx = 0;
  for (const item of sub) {
    while (fullIdx < full.length && full[fullIdx] !== item) {
      fullIdx++;
    }
    if (fullIdx === full.length) return false;
    fullIdx++;
  }
  return true;
}

// ---------------------------------------------------------------------------
// parseLedgerV3 – the sole public admission function
// ---------------------------------------------------------------------------

export function parseLedgerV3(raw: unknown): T.LedgerV3Case {
  // Step 1: strict structural parse at every boundary
  const c = LedgerV3CaseSchema.parse(raw) as T.LedgerV3Case;

  // Step 2: empty-case invariants
  if (c.revisions.length === 0) {
    if (c.current_revision_id !== null)
      throw new Error('Empty case must have null current_revision_id');
    if (c.intake_ledger.length > 0)
      throw new Error('Empty case must have no intake');
    if (c.statements.length > 0)
      throw new Error('Empty case must have no statements');
    if (c.evidence.length > 0)
      throw new Error('Empty case must have no evidence');
    if (c.relationships.length > 0)
      throw new Error('Empty case must have no relationships');
    return c;
  }

  // Step 3: current_revision_id
  if (c.current_revision_id !== c.revisions[c.revisions.length - 1].id) {
    throw new Error('current_revision_id must equal the final revision id');
  }

  // Step 4: index top-level collections
  const allIntakes = new Map<string, T.IntakeRecord>(
    c.intake_ledger.map((i) => [i.id, i])
  );
  const allRevisions = new Map<string, number>(
    c.revisions.map((r, idx) => [r.id, idx])
  );

  // Step 5: chronology
  for (const intake of c.intake_ledger) {
    if (intake.received_at < c.created_at)
      throw new Error('Intake received_at before case created_at');
  }
  for (let i = 0; i < c.revisions.length; i++) {
    const r = c.revisions[i];
    if (r.created_at < c.created_at)
      throw new Error('Revision created_at before case created_at');
    if (i > 0 && r.created_at < c.revisions[i - 1].created_at)
      throw new Error('Revision timestamps must be non-decreasing');
    if (i === 0 && r.parent_id !== null)
      throw new Error('Genesis revision must have null parent_id');
    if (i > 0 && r.parent_id !== c.revisions[i - 1].id)
      throw new Error('Revision parent_id must equal previous revision id');
  }

  // Step 6: model run uniqueness
  const acceptedModelRuns = new Set<string>();
  for (const r of c.revisions) {
    if (acceptedModelRuns.has(r.accepted_model_run_id))
      throw new Error('accepted_model_run_id reused across revisions');
    acceptedModelRuns.add(r.accepted_model_run_id);
  }

  // Step 7: intake ordering — intake_ledger order must equal flattened triggering_intake_ids in revision order
  const flatTriggeredIds: string[] = [];
  for (const r of c.revisions) {
    for (const tid of r.triggering_intake_ids) {
      flatTriggeredIds.push(tid);
    }
  }
  if (c.intake_ledger.length !== flatTriggeredIds.length)
    throw new Error(
      'intake_ledger length does not match sum of triggering_intake_ids'
    );
  for (let i = 0; i < c.intake_ledger.length; i++) {
    if (c.intake_ledger[i].id !== flatTriggeredIds[i])
      throw new Error(
        `intake_ledger order must equal flattened triggering_intake_ids: position ${i}`
      );
  }

  // Step 8: intake triggering uniqueness and existence
  const triggeredOnce = new Set<string>();
  for (const r of c.revisions) {
    for (const tid of r.triggering_intake_ids) {
      if (!allIntakes.has(tid))
        throw new Error(`Dangling triggering_intake_id: ${tid}`);
      if (triggeredOnce.has(tid))
        throw new Error(`Intake triggered multiple times: ${tid}`);
      triggeredOnce.add(tid);
      const intake = allIntakes.get(tid)!;
      if (intake.received_at > r.created_at)
        throw new Error('Intake received_at after introduction revision created_at');
    }
  }
  if (triggeredOnce.size !== c.intake_ledger.length)
    throw new Error('Orphan intake not triggered by any revision');

  // Step 9: intake-to-source bijection
  // Build part maps in intake-ledger order
  const stmtPartIntake = new Map<string, string>(); // statementId -> intakeId
  const evPartIntake = new Map<string, string>(); // evidenceId -> intakeId
  const stmtPartRawText = new Map<string, string>(); // statementId -> raw_text

  const expectedStmtFlatOrder: string[] = [];
  const expectedEvFlatOrder: string[] = [];

  for (const intake of c.intake_ledger) {
    for (const p of intake.parts) {
      if (p.kind === 'statement') {
        if (stmtPartIntake.has(p.statement_id))
          throw new Error(`Statement appears in multiple parts: ${p.statement_id}`);
        stmtPartIntake.set(p.statement_id, intake.id);
        stmtPartRawText.set(p.statement_id, p.raw_text);
        expectedStmtFlatOrder.push(p.statement_id);
      } else {
        if (evPartIntake.has(p.evidence_id))
          throw new Error(`Evidence appears in multiple parts: ${p.evidence_id}`);
        evPartIntake.set(p.evidence_id, intake.id);
        expectedEvFlatOrder.push(p.evidence_id);
      }
    }
  }

  if (stmtPartIntake.size !== c.statements.length)
    throw new Error('Statement count mismatch between parts and canonical array');
  if (evPartIntake.size !== c.evidence.length)
    throw new Error('Evidence count mismatch between parts and canonical array');

  // Top-level statement order
  for (let i = 0; i < c.statements.length; i++) {
    const s = c.statements[i];
    if (s.id !== expectedStmtFlatOrder[i])
      throw new Error(`Top-level statement order mismatch at index ${i}`);
    if (!stmtPartIntake.has(s.id))
      throw new Error(`Statement not in any intake part: ${s.id}`);
    if (s.source_intake_id !== stmtPartIntake.get(s.id))
      throw new Error(`Statement source_intake_id mismatch: ${s.id}`);
    if (s.text !== stmtPartRawText.get(s.id))
      throw new Error(`Statement text does not match intake raw_text: ${s.id}`);
  }

  // Top-level evidence order
  for (let i = 0; i < c.evidence.length; i++) {
    const e = c.evidence[i];
    if (e.id !== expectedEvFlatOrder[i])
      throw new Error(`Top-level evidence order mismatch at index ${i}`);
    if (!evPartIntake.has(e.id))
      throw new Error(`Evidence not in any intake part: ${e.id}`);
    if (e.source_intake_id !== evPartIntake.get(e.id))
      throw new Error(`Evidence source_intake_id mismatch: ${e.id}`);
  }

  // Blob ref uniqueness
  const blobRefs = new Set<string>();
  for (const e of c.evidence) {
    if (e.content.blob !== null) {
      if (blobRefs.has(e.content.blob.blob_ref))
        throw new Error(`Duplicate blob_ref: ${e.content.blob.blob_ref}`);
      blobRefs.add(e.content.blob.blob_ref);
    }
  }

  // Step 10: Map each statement to its introduction revision index
  const stmtIntroRevIdx = new Map<string, number>();
  for (let ri = 0; ri < c.revisions.length; ri++) {
    for (const tid of c.revisions[ri].triggering_intake_ids) {
      const intake = allIntakes.get(tid)!;
      for (const p of intake.parts) {
        if (p.kind === 'statement') stmtIntroRevIdx.set(p.statement_id, ri);
      }
    }
  }

  // Step 11: Relationship invariants — dangling created_in_revision_id, non-decreasing order
  {
    let prevRelRevIdx = -1;
    for (const rel of c.relationships) {
      if (!allRevisions.has(rel.created_in_revision_id))
        throw new Error(
          `Dangling relationship created_in_revision_id: ${rel.created_in_revision_id}`
        );
      const relRevIdx = allRevisions.get(rel.created_in_revision_id)!;
      if (relRevIdx < prevRelRevIdx)
        throw new Error(
          'Relationships must be ordered by non-decreasing creation-revision index'
        );
      prevRelRevIdx = relRevIdx;
    }
  }

  // Step 12: Per-revision invariants
  let prevRev: T.Revision | null = null;
  const introducedIntakesSoFar = new Set<string>();

  for (let revIdx = 0; revIdx < c.revisions.length; revIdx++) {
    const r = c.revisions[revIdx];

    for (const tid of r.triggering_intake_ids) {
      introducedIntakesSoFar.add(tid);
    }

    // Exact input arrays
    const expectedInputStmts = c.statements
      .filter((s) => introducedIntakesSoFar.has(s.source_intake_id))
      .map((s) => s.id);
    const expectedInputEvs = c.evidence
      .filter((e) => introducedIntakesSoFar.has(e.source_intake_id))
      .map((e) => e.id);

    if (
      JSON.stringify(r.input_statement_ids) !==
      JSON.stringify(expectedInputStmts)
    )
      throw new Error(
        `input_statement_ids mismatch in revision ${r.id}`
      );
    if (
      JSON.stringify(r.input_evidence_ids) !== JSON.stringify(expectedInputEvs)
    )
      throw new Error(`input_evidence_ids mismatch in revision ${r.id}`);

    const availSources = new Set<string>([
      ...r.input_statement_ids,
      ...r.input_evidence_ids,
    ]);

    // Relationship source availability, target existence, corrects_statement revision check
    for (const rel of c.relationships) {
      if (rel.created_in_revision_id === r.id) {
        if (!availSources.has(rel.source_id))
          throw new Error(
            `Relationship source unavailable at creation revision: ${rel.source_id}`
          );

        if (rel.relationship_type === 'corrects_statement') {
          // source must be a StatementId — validated by Zod discriminant
          if (rel.source_id === rel.target_id)
            throw new Error('Statement cannot correct itself');
          if (!availSources.has(rel.target_id))
            throw new Error(
              `corrects_statement target unavailable: ${rel.target_id}`
            );
          const srcRevIdx = stmtIntroRevIdx.get(rel.source_id);
          const tgtRevIdx = stmtIntroRevIdx.get(rel.target_id);
          if (srcRevIdx === undefined)
            throw new Error(
              `corrects_statement source not a known statement: ${rel.source_id}`
            );
          if (tgtRevIdx === undefined)
            throw new Error(
              `corrects_statement target not a known statement: ${rel.target_id}`
            );
          // Target must be introduced in a strictly earlier revision than the source
          if (tgtRevIdx >= srcRevIdx)
            throw new Error(
              'corrects_statement target must be introduced in strictly earlier revision than source'
            );
        }

        if (
          rel.relationship_type === 'supports_claim' ||
          rel.relationship_type === 'qualifies_claim' ||
          rel.relationship_type === 'conflicts_with_claim'
        ) {
          if (!r.claims.find((cl) => cl.id === rel.target_id))
            throw new Error(
              `Claim target not in revision snapshot: ${rel.target_id}`
            );
        } else if (rel.relationship_type === 'raises_gap') {
          if (!r.gaps.find((g) => g.id === rel.target_id))
            throw new Error(
              `Gap target not in revision snapshot: ${rel.target_id}`
            );
        } else if (rel.relationship_type === 'corrects_statement') {
          // target availability already checked above
        }
      }
    }

    // Effective relationship batches per source
    const effectiveRelsBySource = new Map<string, T.AcceptedRelationship[]>();
    for (const src of availSources) {
      // All rels for this source created in revisions 0..revIdx
      const candidate = c.relationships.filter((rel) => {
        const ri = allRevisions.get(rel.created_in_revision_id);
        return rel.source_id === src && ri !== undefined && ri <= revIdx;
      });

      if (candidate.length === 0)
        throw new Error(
          `Source has no relationship batch at or before revision ${r.id}: ${src}`
        );

      // Effective batch = the batch with the greatest creation-revision index
      let maxRi = -1;
      for (const rel of candidate) {
        const ri = allRevisions.get(rel.created_in_revision_id)!;
        if (ri > maxRi) maxRi = ri;
      }
      const effective = candidate.filter(
        (rel) => allRevisions.get(rel.created_in_revision_id) === maxRi
      );

      // Within-batch uniqueness: (type, target_id) tuple
      const seenTuples = new Set<string>();
      let hasNotYetClassified = false;
      for (const rel of effective) {
        const tuple = `${rel.relationship_type}:${rel.target_id}`;
        if (seenTuples.has(tuple))
          throw new Error(`Duplicate relationship tuple in batch for source ${src}`);
        seenTuples.add(tuple);
        if (rel.relationship_type === 'not_yet_classified')
          hasNotYetClassified = true;
        // At most one of supports/qualifies/conflicts per claim target in same batch
        const claimTargetSameType = effective.filter(
          (r2) =>
            r2 !== rel &&
            r2.target_id === rel.target_id &&
            (r2.relationship_type === 'supports_claim' ||
              r2.relationship_type === 'qualifies_claim' ||
              r2.relationship_type === 'conflicts_with_claim') &&
            (rel.relationship_type === 'supports_claim' ||
              rel.relationship_type === 'qualifies_claim' ||
              rel.relationship_type === 'conflicts_with_claim')
        );
        if (claimTargetSameType.length > 0)
          throw new Error(
            `Source may have at most one of supports/qualifies/conflicts per claim target per batch`
          );
      }
      if (hasNotYetClassified && effective.length > 1)
        throw new Error(
          'not_yet_classified must be the only relationship in its batch'
        );

      effectiveRelsBySource.set(src, effective);
    }

    // Claim source category equality with effective batches
    for (const clm of r.claims) {
      const expectedSupp: string[] = [];
      const expectedQual: string[] = [];
      const expectedConf: string[] = [];
      for (const src of r.input_statement_ids) {
        const batch = effectiveRelsBySource.get(src) ?? [];
        if (batch.some((rel) => rel.relationship_type === 'supports_claim' && rel.target_id === clm.id))
          expectedSupp.push(src);
        if (batch.some((rel) => rel.relationship_type === 'qualifies_claim' && rel.target_id === clm.id))
          expectedQual.push(src);
        if (batch.some((rel) => rel.relationship_type === 'conflicts_with_claim' && rel.target_id === clm.id))
          expectedConf.push(src);
      }
      for (const src of r.input_evidence_ids) {
        const batch = effectiveRelsBySource.get(src) ?? [];
        if (batch.some((rel) => rel.relationship_type === 'supports_claim' && rel.target_id === clm.id))
          expectedSupp.push(src);
        if (batch.some((rel) => rel.relationship_type === 'qualifies_claim' && rel.target_id === clm.id))
          expectedQual.push(src);
        if (batch.some((rel) => rel.relationship_type === 'conflicts_with_claim' && rel.target_id === clm.id))
          expectedConf.push(src);
      }
      if (JSON.stringify(clm.supporting_source_ids) !== JSON.stringify(expectedSupp))
        throw new Error(
          `Claim ${clm.id} supporting_source_ids mismatch with effective relationships`
        );
      if (JSON.stringify(clm.qualifying_source_ids) !== JSON.stringify(expectedQual))
        throw new Error(
          `Claim ${clm.id} qualifying_source_ids mismatch with effective relationships`
        );
      if (JSON.stringify(clm.conflicting_source_ids) !== JSON.stringify(expectedConf))
        throw new Error(
          `Claim ${clm.id} conflicting_source_ids mismatch with effective relationships`
        );
    }

    // Snapshot continuity — no omission or reorder of parent IDs, immutable fields
    if (prevRev !== null) {
      const checkEntityContinuity = (
        prevArr: Array<{ id: string }>,
        currArr: Array<{ id: string }>,
        arrName: string,
        getImmutable: (item: { id: string }) => Record<string, unknown>
      ) => {
        for (let i = 0; i < prevArr.length; i++) {
          if (i >= currArr.length || prevArr[i].id !== currArr[i].id)
            throw new Error(
              `Omission or reorder of parent ${arrName} entities at index ${i}`
            );
          const prevImm = JSON.stringify(getImmutable(prevArr[i]));
          const currImm = JSON.stringify(getImmutable(currArr[i]));
          if (prevImm !== currImm)
            throw new Error(
              `Immutable fields changed in ${arrName} for id ${prevArr[i].id}`
            );
        }
      };
      checkEntityContinuity(prevRev.events, r.events, 'events',
        (e) => { const ev = e as T.Event; return { domain_time: ev.domain_time, actor: ev.actor, action: ev.action, target: ev.target }; });
      checkEntityContinuity(prevRev.claims, r.claims, 'claims',
        (e) => { const cl = e as T.Claim; return { proposition: cl.proposition, actor: cl.actor, action: cl.action, target: cl.target, domain_time: cl.domain_time }; });
      checkEntityContinuity(prevRev.gaps, r.gaps, 'gaps',
        (e) => { const g = e as T.Gap; return { question: g.question, target_claim_ids: g.target_claim_ids }; });
      checkEntityContinuity(prevRev.actions, r.actions, 'actions',
        (e) => { const a = e as T.Action; return { title: a.title, target_gap_ids: a.target_gap_ids }; });
      checkEntityContinuity(prevRev.inspections, r.inspections, 'inspections',
        (e) => { const ins = e as T.EvidenceInspection; return { evidence_id: ins.evidence_id }; });
    }

    // Event references
    for (const ev of r.events) {
      for (const src of ev.source_support_ids) {
        if (!availSources.has(src))
          throw new Error(`Event source unavailable: ${src}`);
      }
      for (const findingId of ev.finding_ids ?? []) {
        if (!r.claims.find((claim) => claim.id === findingId))
          throw new Error(`Event finding not in revision: ${findingId}`);
      }
    }

    // Gap references and lifecycle
    for (const g of r.gaps) {
      for (const tid of g.target_claim_ids) {
        if (!r.claims.find((cl) => cl.id === tid))
          throw new Error(`Gap target claim not in revision: ${tid}`);
      }
      if (g.transition !== null) {
        // resulting_status must equal gap status (checked by Zod superRefine already)
        // transition_revision_id must be this revision or an earlier one
        const transRevIdx = allRevisions.get(g.transition.transition_revision_id);
        if (transRevIdx === undefined)
          throw new Error(
            `Gap transition_revision_id dangling: ${g.transition.transition_revision_id}`
          );
        if (transRevIdx > revIdx)
          throw new Error('Gap transition_revision_id is in the future');

        // Transition sources available in the transition revision
        const transRev = c.revisions[transRevIdx];
        const transCanonicalSources = [
          ...transRev.input_statement_ids,
          ...transRev.input_evidence_ids,
        ];
        if (g.transition.supporting_source_ids.length === 0)
          throw new Error('Gap transition supporting_source_ids must be non-empty');
        if (!isDuplicateFreeSubsequence(g.transition.supporting_source_ids, transCanonicalSources))
          throw new Error(
            `Gap transition supporting_source_ids must be a duplicate-free subsequence of canonical source order in transition revision: [${g.transition.supporting_source_ids}] not in [${transCanonicalSources}]`
          );

        if (prevRev !== null) {
          const pg = prevRev.gaps.find((pg) => pg.id === g.id);
          if (pg !== undefined) {
            if (g.transition.transition_revision_id === r.id) {
              // Status changed this revision
              if (pg.status === g.status)
                throw new Error(
                  `Gap ${g.id} has new transition in revision ${r.id} but status is unchanged`
                );
              if (g.transition.previous_status !== pg.status)
                throw new Error(
                  `Gap ${g.id} transition previous_status mismatch`
                );
              // Validate allowed transition
              if (
                !GAP_ALLOWED_TRANSITIONS[pg.status].includes(g.status)
              )
                throw new Error(
                  `Forbidden gap transition ${pg.status} -> ${g.status}`
                );
            } else {
              // Status not changed this revision — transition must carry unchanged
              if (
                JSON.stringify(g.transition) !==
                JSON.stringify(pg.transition)
              )
                throw new Error(
                  `Gap ${g.id} transition metadata changed without status change`
                );
            }
          } else {
            // New gap in this revision — must be open with null transition
            if (g.status !== 'open' || g.transition !== null)
              throw new Error(
                `New gap ${g.id} must have status 'open' and transition null`
              );
          }
        } else {
          // Genesis revision — all gaps are new
          throw new Error(
            `New gap ${g.id} must have status 'open' and transition null`
          );
        }
      } else {
        // transition is null — must be open (new gap rule)
        if (prevRev !== null) {
          const pg = prevRev.gaps.find((pg) => pg.id === g.id);
          if (pg !== undefined && pg.transition !== null)
            throw new Error(
              `Carried gap ${g.id} lost its non-null transition metadata`
            );
        }
        if (g.status !== 'open')
          throw new Error(
            `Gap ${g.id} has null transition but status is not 'open'`
          );
      }
    }

    // Action references and lifecycle
    for (const a of r.actions) {
      for (const tid of a.target_gap_ids) {
        if (!r.gaps.find((g) => g.id === tid))
          throw new Error(`Action target gap not in revision: ${tid}`);
      }
      if (a.transition !== null) {
        const transRevIdx = allRevisions.get(a.transition.transition_revision_id);
        if (transRevIdx === undefined)
          throw new Error(
            `Action transition_revision_id dangling: ${a.transition.transition_revision_id}`
          );
        if (transRevIdx > revIdx)
          throw new Error('Action transition_revision_id is in the future');

        const transRev = c.revisions[transRevIdx];
        const transCanonicalSources = [
          ...transRev.input_statement_ids,
          ...transRev.input_evidence_ids,
        ];
        if (a.transition.supporting_source_ids.length === 0)
          throw new Error('Action transition supporting_source_ids must be non-empty');
        if (!isDuplicateFreeSubsequence(a.transition.supporting_source_ids, transCanonicalSources))
          throw new Error(
            `Action transition supporting_source_ids must be a duplicate-free subsequence of canonical source order in transition revision`
          );

        if (prevRev !== null) {
          const pa = prevRev.actions.find((pa) => pa.id === a.id);
          if (pa !== undefined) {
            if (a.transition.transition_revision_id === r.id) {
              if (pa.status === a.status)
                throw new Error(
                  `Action ${a.id} has new transition in revision ${r.id} but status is unchanged`
                );
              if (a.transition.previous_status !== pa.status)
                throw new Error(
                  `Action ${a.id} transition previous_status mismatch`
                );
              if (!ACTION_ALLOWED_TRANSITIONS[pa.status].includes(a.status))
                throw new Error(
                  `Forbidden action transition ${pa.status} -> ${a.status}`
                );
            } else {
              if (
                JSON.stringify(a.transition) !==
                JSON.stringify(pa.transition)
              )
                throw new Error(
                  `Action ${a.id} transition metadata changed without status change`
                );
            }
          } else {
            if (a.status !== 'pending' || a.transition !== null)
              throw new Error(
                `New action ${a.id} must have status 'pending' and transition null`
              );
          }
        } else {
          // Genesis revision — all actions are new
          throw new Error(
            `New action ${a.id} must have status 'pending' and transition null`
          );
        }
      } else {
        if (prevRev !== null) {
          const pa = prevRev.actions.find((pa) => pa.id === a.id);
          if (pa !== undefined && pa.transition !== null)
            throw new Error(
              `Carried action ${a.id} lost its non-null transition metadata`
            );
        }
        if (a.status !== 'pending')
          throw new Error(
            `Action ${a.id} has null transition but status is not 'pending'`
          );
      }
    }

    // Inspection coverage: exactly one per input evidence, same InspectionId across revisions
    const inspEvidenceIds = r.inspections.map((i) => i.evidence_id);
    if (JSON.stringify(inspEvidenceIds) !== JSON.stringify(expectedInputEvs))
      throw new Error(
        `Inspection coverage mismatch in revision ${r.id}: must exactly cover input_evidence_ids`
      );

    // Delta validation
    const expectedDeltas: ExpectedDelta[] = [];

    // intake/add entries — source_ids = canonical stmt-then-ev order for that intake
    for (const tid of r.triggering_intake_ids) {
      const intake = allIntakes.get(tid)!;
      const intakeSrcIds: string[] = [];
      for (const p of intake.parts) {
        if (p.kind === 'statement') intakeSrcIds.push(p.statement_id);
      }
      for (const p of intake.parts) {
        if (p.kind === 'evidence') intakeSrcIds.push(p.evidence_id);
      }
      expectedDeltas.push({
        entity_type: 'intake',
        entity_id: tid,
        operation: 'add',
        reason: 'Accepted intake',
        source_ids: intakeSrcIds,
      });
    }

    // statement/add entries
    for (const tid of r.triggering_intake_ids) {
      const intake = allIntakes.get(tid)!;
      for (const p of intake.parts) {
        if (p.kind === 'statement') {
          expectedDeltas.push({
            entity_type: 'statement',
            entity_id: p.statement_id,
            operation: 'add',
            reason: 'Accepted source statement',
            source_ids: [p.statement_id],
          });
        }
      }
    }

    // evidence/add entries
    for (const tid of r.triggering_intake_ids) {
      const intake = allIntakes.get(tid)!;
      for (const p of intake.parts) {
        if (p.kind === 'evidence') {
          expectedDeltas.push({
            entity_type: 'evidence',
            entity_id: p.evidence_id,
            operation: 'add',
            reason: 'Accepted evidence source',
            source_ids: [p.evidence_id],
          });
        }
      }
    }

    // relationship/add entries (ordered by relationship array order for this revision)
    const newRels = c.relationships.filter(
      (rel) => rel.created_in_revision_id === r.id
    );
    for (const rel of newRels) {
      expectedDeltas.push({
        entity_type: 'relationship',
        entity_id: rel.id,
        operation: 'add',
        reason: rel.reason,
        source_ids: [rel.source_id],
      });
    }

    // event/claim/gap/action/inspection — compare with parent
    const checkSnapshotDeltas = (
      entityType: 'event' | 'claim' | 'gap' | 'action' | 'inspection',
      curr: Array<{ id: string }>,
      prev: Array<{ id: string }>
    ) => {
      for (let i = 0; i < curr.length; i++) {
        if (i >= prev.length) {
          // New entity
          const entry = r.delta.entries.find(
            (e) =>
              e.entity_type === entityType &&
              e.entity_id === curr[i].id &&
              e.operation === 'add'
          );
          if (entry === undefined)
            throw new Error(
              `Missing ${entityType}/add delta entry for ${curr[i].id}`
            );
          expectedDeltas.push({
            entity_type: entityType,
            entity_id: curr[i].id,
            operation: 'add',
            reason: entry.reason,
            source_ids: entry.source_ids,
          });
        } else {
          if (JSON.stringify(curr[i]) !== JSON.stringify(prev[i])) {
            const currWithStatus = curr[i] as { id: string; status?: string };
            const prevWithStatus = prev[i] as { id: string; status?: string };
            const isTrans =
              (entityType === 'gap' || entityType === 'action') &&
              currWithStatus.status !== prevWithStatus.status;
            const op = isTrans ? 'transition' : 'update';
            const entry = r.delta.entries.find(
              (e) =>
                e.entity_type === entityType &&
                e.entity_id === curr[i].id &&
                e.operation === op
            );
            if (entry === undefined)
              throw new Error(
                `Missing ${entityType}/${op} delta entry for ${curr[i].id}`
              );
            expectedDeltas.push({
              entity_type: entityType,
              entity_id: curr[i].id,
              operation: op,
              reason: entry.reason,
              source_ids: entry.source_ids,
            });
          }
        }
      }
    };
    checkSnapshotDeltas('event', r.events, prevRev !== null ? prevRev.events : []);
    checkSnapshotDeltas('claim', r.claims, prevRev !== null ? prevRev.claims : []);
    checkSnapshotDeltas('gap', r.gaps, prevRev !== null ? prevRev.gaps : []);
    checkSnapshotDeltas('action', r.actions, prevRev !== null ? prevRev.actions : []);
    checkSnapshotDeltas('inspection', r.inspections, prevRev !== null ? prevRev.inspections : []);

    // Compare count and order
    if (r.delta.entries.length !== expectedDeltas.length)
      throw new Error(
        `Delta entries count mismatch in revision ${r.id}: expected ${expectedDeltas.length}, got ${r.delta.entries.length}`
      );

    for (let i = 0; i < expectedDeltas.length; i++) {
      const exp = expectedDeltas[i];
      const got = r.delta.entries[i];
      if (
        got.entity_type !== exp.entity_type ||
        got.entity_id !== exp.entity_id ||
        got.operation !== exp.operation
      )
        throw new Error(
          `Delta entry ${i} mismatch in revision ${r.id}: expected ${exp.entity_type}/${exp.entity_id}/${exp.operation}`
        );

      // Fixed reasons for introduction entries
      if (
        exp.entity_type === 'intake' ||
        exp.entity_type === 'statement' ||
        exp.entity_type === 'evidence'
      ) {
        if (got.reason !== exp.reason)
          throw new Error(
            `Delta reason mismatch for ${exp.entity_type}/${exp.entity_id}: expected '${exp.reason}'`
          );
      }

      // Relationship reason must equal the relationship's reason
      if (exp.entity_type === 'relationship') {
        if (got.reason !== exp.reason)
          throw new Error(
            `Relationship delta reason mismatch for ${exp.entity_id}`
          );
      }

      // Transition reason/sources must equal the lifecycle transition
      if (got.operation === 'transition') {
        if (exp.entity_type === 'gap') {
          const obj = r.gaps.find((g) => g.id === got.entity_id);
          if (obj === undefined || obj.transition === null)
            throw new Error(
              `Gap transition delta references gap without transition: ${got.entity_id}`
            );
          if (got.reason !== obj.transition.reason)
            throw new Error(
              `Gap transition delta reason mismatch for ${got.entity_id}`
            );
          if (
            JSON.stringify(got.source_ids) !==
            JSON.stringify(obj.transition.supporting_source_ids)
          )
            throw new Error(
              `Gap transition delta source_ids mismatch for ${got.entity_id}`
            );
        } else if (exp.entity_type === 'action') {
          const obj = r.actions.find((a) => a.id === got.entity_id);
          if (obj === undefined || obj.transition === null)
            throw new Error(
              `Action transition delta references action without transition: ${got.entity_id}`
            );
          if (got.reason !== obj.transition.reason)
            throw new Error(
              `Action transition delta reason mismatch for ${got.entity_id}`
            );
          if (
            JSON.stringify(got.source_ids) !==
            JSON.stringify(obj.transition.supporting_source_ids)
          )
            throw new Error(
              `Action transition delta source_ids mismatch for ${got.entity_id}`
            );
        }
      }

      // All source_ids must be a non-empty, duplicate-free subsequence of canonical source order
      // (except for specific entities checked below, but all must be subsequences)
      const canonicalSources = [
        ...r.input_statement_ids,
        ...r.input_evidence_ids,
      ];
      
      if (got.source_ids.length === 0)
        throw new Error(`Delta source_ids cannot be empty for ${got.entity_id}`);
        
      if (!isDuplicateFreeSubsequence(got.source_ids, canonicalSources))
        throw new Error(
          `Delta source_ids must be a duplicate-free subsequence of canonical source order in revision ${r.id}: ${got.entity_id}`
        );

      // Inspection delta source_ids must include the evidence_id
      if (exp.entity_type === 'inspection') {
        const insp = r.inspections.find((ins) => ins.id === got.entity_id);
        if (insp === undefined)
          throw new Error(
            `Inspection delta references unknown inspection: ${got.entity_id}`
          );
        if (!got.source_ids.includes(insp.evidence_id))
          throw new Error(
            `Inspection delta source_ids must include evidence_id ${insp.evidence_id}`
          );
      }

      // Validate intake delta source_ids: must equal canonical stmt-then-ev order
      if (exp.entity_type === 'intake') {
        if (JSON.stringify(got.source_ids) !== JSON.stringify(exp.source_ids))
          throw new Error(
            `Intake delta source_ids mismatch for ${exp.entity_id}`
          );
      }

      // statement/add source_ids must be exactly [entity_id]
      if (exp.entity_type === 'statement') {
        if (
          got.source_ids.length !== 1 ||
          got.source_ids[0] !== got.entity_id
        )
          throw new Error(
            `Statement delta source_ids must be exactly [entity_id] for ${got.entity_id}`
          );
      }

      // evidence/add source_ids must be exactly [entity_id]
      if (exp.entity_type === 'evidence') {
        if (
          got.source_ids.length !== 1 ||
          got.source_ids[0] !== got.entity_id
        )
          throw new Error(
            `Evidence delta source_ids must be exactly [entity_id] for ${got.entity_id}`
          );
      }

      // relationship/add source_ids must be exactly [relationship.source_id]
      if (exp.entity_type === 'relationship') {
        if (JSON.stringify(got.source_ids) !== JSON.stringify(exp.source_ids))
          throw new Error(
            `Relationship delta source_ids must be exactly [source_id] for ${got.entity_id}`
          );
      }
    }

    // Summary validation
    if (r.summary.total_evidence_count !== expectedInputEvs.length)
      throw new Error(
        `summary total_evidence_count mismatch in revision ${r.id}`
      );
    if (
      r.summary.established_claims_count !==
      r.claims.filter(
        (cl) => cl.assessment === 'Established within current record'
      ).length
    )
      throw new Error(
        `summary established_claims_count mismatch in revision ${r.id}`
      );
    if (
      r.summary.unresolved_claims_count !==
      r.claims.filter((cl) =>
        ['Reported', 'Corroborated', 'Contested'].includes(cl.assessment)
      ).length
    )
      throw new Error(
        `summary unresolved_claims_count mismatch in revision ${r.id}`
      );
    if (
      r.summary.conflicted_claims_count !==
      r.claims.filter((cl) => cl.assessment === 'Contested').length
    )
      throw new Error(
        `summary conflicted_claims_count mismatch in revision ${r.id}`
      );
    if (
      r.summary.user_reported_claims_count !==
      r.claims.filter((cl) => cl.assessment === 'Reported').length
    )
      throw new Error(
        `summary user_reported_claims_count mismatch in revision ${r.id}`
      );

    prevRev = r;
  }

  return c;
}
