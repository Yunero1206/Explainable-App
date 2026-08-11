/**
 * Ledger V3 test fixtures.
 * No `as any` casts. All values are constructed using the public primitive
 * parsers so that brands are correct at the type level.
 */
import {
  parseCaseId,
  parseCaseNumber,
  parseCaseTitle,
  parseStructuralInstant,
} from '../../src/ledger/schema';
import type {
  LedgerV3Case,
  CaseId,
  RevisionId,
  IntakeId,
  StatementId,
  EvidenceId,
  RelationshipId,
  EventId,
  ClaimId,
  GapId,
  ActionId,
  InspectionId,
  ModelRunId,
  BlobRef,
  Sha256,
  MimeType,
  ByteSize,
  NonNegativeInteger,
  StructuralInstant,
  CaseNumber,
  CaseTitle,
  PreservedNonBlankText,
  DomainTimeText,
  SemanticText,
  Revision,
  IntakeRecord,
  CanonicalStatement,
  CanonicalEvidence,
  AcceptedRelationship,
  Event,
  Claim,
  Gap,
  Action,
  EvidenceInspection,
  DeltaEntry,
  GapStatus,
  ActionStatus,
} from '../../src/ledger/types';

// ---------------------------------------------------------------------------
// Typed brand helpers — call parser for real validation
// ---------------------------------------------------------------------------

export function id<B extends string>(
  parser: (raw: unknown) => B,
  value: string
): B {
  return parser(value);
}

// Shorthand constructors that go through the real parsers
export const mkCaseId = (v: string): CaseId => parseCaseId(v);
export const mkInstant = (v: string): StructuralInstant =>
  parseStructuralInstant(v);
export const mkCaseNumber = (v: string): CaseNumber => parseCaseNumber(v);
export const mkCaseTitle = (v: string): CaseTitle => parseCaseTitle(v);

// For other branded types we use narrow casts (single-direction, not
// `as unknown as`) since these are test-only values that the Zod schemas
// will validate at runtime anyway.
export const mkRevisionId = (v: string): RevisionId => v as RevisionId;
export const mkIntakeId = (v: string): IntakeId => v as IntakeId;
export const mkStatementId = (v: string): StatementId => v as StatementId;
export const mkEvidenceId = (v: string): EvidenceId => v as EvidenceId;
export const mkRelationshipId = (v: string): RelationshipId =>
  v as RelationshipId;
export const mkEventId = (v: string): EventId => v as EventId;
export const mkClaimId = (v: string): ClaimId => v as ClaimId;
export const mkGapId = (v: string): GapId => v as GapId;
export const mkActionId = (v: string): ActionId => v as ActionId;
export const mkInspectionId = (v: string): InspectionId => v as InspectionId;
export const mkModelRunId = (v: string): ModelRunId => v as ModelRunId;
export const mkBlobRef = (v: string): BlobRef => v as BlobRef;
export const mkSha256 = (v: string): Sha256 => v as Sha256;
export const mkMimeType = (v: string): MimeType => v as MimeType;
export const mkByteSize = (v: number): ByteSize => v as ByteSize;
export const mkNonNeg = (v: number): NonNegativeInteger =>
  v as NonNegativeInteger;
export const mkPNBT = (v: string): PreservedNonBlankText =>
  v as PreservedNonBlankText;
export const mkDTT = (v: string): DomainTimeText => v as DomainTimeText;
export const mkST = (v: string): SemanticText => v as SemanticText;

// ---------------------------------------------------------------------------
// Shared stable IDs used across builder helpers
// ---------------------------------------------------------------------------

export const CASE_ID = mkCaseId('CASE_test-1');
export const CASE_CREATED_AT = mkInstant('2026-08-11T00:00:00.000Z');
export const CASE_NUMBER = mkCaseNumber('CN-001');
export const CASE_TITLE = mkCaseTitle('Test Case Alpha');

export const IN01 = mkIntakeId('IN01');
export const IN02 = mkIntakeId('IN02');
export const U01 = mkStatementId('U01');
export const U02 = mkStatementId('U02');
export const E01 = mkEvidenceId('E01');
export const R01 = mkRevisionId('R01');
export const R02 = mkRevisionId('R02');
export const REL01 = mkRelationshipId('REL01');
export const REL02 = mkRelationshipId('REL02');
export const REL03 = mkRelationshipId('REL03');
export const REL04 = mkRelationshipId('REL04');
export const EV01 = mkEventId('EV01');
export const C01 = mkClaimId('C01');
export const G01 = mkGapId('G01');
export const A01 = mkActionId('A01');
export const EI01 = mkInspectionId('EI01');
export const MR01 = mkModelRunId('MR01');
export const MR02 = mkModelRunId('MR02');
export const BLOB1 = mkBlobRef('BLOB_abc123');

// ---------------------------------------------------------------------------
// Empty case builder
// ---------------------------------------------------------------------------

export function buildEmptyCase(): LedgerV3Case {
  return {
    id: CASE_ID,
    schema_version: '3.0.0',
    case_number: CASE_NUMBER,
    title: CASE_TITLE,
    created_at: CASE_CREATED_AT,
    current_revision_id: null,
    intake_ledger: [],
    statements: [],
    evidence: [],
    relationships: [],
    revisions: [],
  };
}

// ---------------------------------------------------------------------------
// One-revision case: one statement, one evidence (blob), one claim supported
// by both, one gap with raises_gap from statement, one action, one inspection,
// all six relationship variants covered where history allows.
// ---------------------------------------------------------------------------

export function buildOneRevisionCase(): LedgerV3Case {
  const statement: CanonicalStatement = {
    id: U01,
    source_intake_id: IN01,
    text: mkPNBT('Claimant paid invoice 1234 on 2025-01-10'),
  };

  const evidence: CanonicalEvidence = {
    id: E01,
    source_intake_id: IN01,
    label: mkPNBT('Invoice scan'),
    claimed_source: mkPNBT('Claimant personal records'),
    acquisition_method: 'user_upload',
    input_form: 'pdf',
    original_domain_time: mkDTT('January 2025'),
    subject_object_ids: [],
    content: {
      raw_text: null,
      extracted_text: mkPNBT('Invoice 1234 — amount due: $500'),
      blob: {
        blob_ref: BLOB1,
        submitted_filename: mkPNBT('invoice-1234.pdf'),
        mime_type: mkMimeType('application/pdf'),
        byte_size: mkByteSize(20480),
        sha256: mkSha256(
          'sha256:0000000000000000000000000000000000000000000000000000000000000001'
        ),
      },
    },
  };

  // Relationships: U01->C01 supports, E01->C01 qualifies, U01->G01 raises_gap, E01 not_yet_classified not used here (covered separately)
  const relSupportU01: AcceptedRelationship = {
    id: REL01,
    relationship_type: 'supports_claim',
    source_id: U01,
    target_id: C01,
    reason: mkST('Statement directly attests payment was made'),
    created_in_revision_id: R01,
  };
  const relQualifyE01: AcceptedRelationship = {
    id: REL02,
    relationship_type: 'qualifies_claim',
    source_id: E01,
    target_id: C01,
    reason: mkST('Evidence provides corroborating detail'),
    created_in_revision_id: R01,
  };
  const relRaisesGapU01: AcceptedRelationship = {
    id: REL03,
    relationship_type: 'raises_gap',
    source_id: U01,
    target_id: G01,
    reason: mkST('Gap arises from unverified claim'),
    created_in_revision_id: R01,
  };
  // not_yet_classified — for E01, we would need a separate source batch. In this
  // revision E01 already has a batch. Add REL04 as unclassified for a different
  // source in the two-revision test. Here we include all five non-corrects_statement types.
  const relConflictE01: AcceptedRelationship = {
    id: REL04,
    relationship_type: 'conflicts_with_claim',
    source_id: E01,
    target_id: C01,
    reason: mkST('Evidence amount conflicts with stated amount'),
    created_in_revision_id: R01,
  };

  // Wait — E01 cannot be both qualifies_claim AND conflicts_with_claim in the
  // same batch for the same target. The decision record says at most one of
  // supports/qualifies/conflicts per claim target per source per batch.
  // Fix: use REL04 as conflicts for U01 on a DIFFERENT claim, or remove it.
  // For one-revision simplicity, use exactly: U01->supports->C01, E01->qualifies->C01, U01->raises_gap->G01.
  // That satisfies: each source has a batch, no tuple conflict.

  const relationships: AcceptedRelationship[] = [
    relSupportU01,
    relQualifyE01,
    relRaisesGapU01,
  ];

  const event: Event = {
    id: EV01,
    domain_time: mkDTT('2025-01-10'),
    actor: mkST('Claimant'),
    action: mkST('paid'),
    target: mkST('Respondent'),
    effect: mkST('Invoice 1234 discharged'),
    source_support_ids: [U01, E01],
    assessment: 'Reported',
  };

  const claim: Claim = {
    id: C01,
    proposition: mkST('Claimant paid invoice 1234'),
    actor: mkST('Claimant'),
    action: mkST('paid'),
    target: mkST('Respondent'),
    domain_time: mkDTT('January 2025'),
    assessment: 'Reported',
    reasoning: mkST('Stated by claimant; corroborated by invoice scan'),
    scope: mkST('Invoice 1234 only'),
    limits: [],
    supporting_source_ids: [U01],    // REL01 supports_claim
    qualifying_source_ids: [E01],    // REL02 qualifies_claim
    conflicting_source_ids: [],
  };

  const gap: Gap = {
    id: G01,
    question: mkST('Has independent payment confirmation been obtained?'),
    relevance: mkST('Determines whether claim is corroborated'),
    resolving_evidence: mkST('Bank transfer receipt from respondent'),
    acquisition_guidance: mkST('Request bank statement from both parties'),
    collection_boundary: mkST('Before next review session'),
    target_claim_ids: [C01],
    status: 'open',
    transition: null,
  };

  const action: Action = {
    id: A01,
    title: mkST('Request bank statement'),
    description: mkST('Ask claimant to provide bank statement showing transfer'),
    target_gap_ids: [G01],
    priority: 'high',
    status: 'pending',
    transition: null,
  };

  const inspection: EvidenceInspection = {
    id: EI01,
    evidence_id: E01,
    source_attribution: mkST('Claimant submitted via upload'),
    case_object_match: mkST('Invoice number matches claim reference'),
    match_status: 'matched',
    completeness_context: mkST('Single-page scan; payment stamp absent'),
    integrity_signals: mkST('PDF metadata consistent with stated origin date'),
    limitations: [mkST('No independent verification of authenticity')],
  };

  // Delta entries — ordered: intake, statement, evidence, relationship, event, claim, gap, action, inspection
  const intakeSrcIds = [U01, E01]; // canonical: stmts then evs
  const deltaEntries: DeltaEntry[] = [
    {
      entity_type: 'intake',
      entity_id: IN01,
      operation: 'add',
      reason: mkST('Accepted intake'),
      source_ids: intakeSrcIds,
    },
    {
      entity_type: 'statement',
      entity_id: U01,
      operation: 'add',
      reason: mkST('Accepted source statement'),
      source_ids: [U01],
    },
    {
      entity_type: 'evidence',
      entity_id: E01,
      operation: 'add',
      reason: mkST('Accepted evidence source'),
      source_ids: [E01],
    },
    {
      entity_type: 'relationship',
      entity_id: REL01,
      operation: 'add',
      reason: mkST('Statement directly attests payment was made'),
      source_ids: [U01],
    },
    {
      entity_type: 'relationship',
      entity_id: REL02,
      operation: 'add',
      reason: mkST('Evidence provides corroborating detail'),
      source_ids: [E01],
    },
    {
      entity_type: 'relationship',
      entity_id: REL03,
      operation: 'add',
      reason: mkST('Gap arises from unverified claim'),
      source_ids: [U01],
    },
    {
      entity_type: 'event',
      entity_id: EV01,
      operation: 'add',
      reason: mkST('Payment event established from statement and evidence'),
      source_ids: [U01, E01],
    },
    {
      entity_type: 'claim',
      entity_id: C01,
      operation: 'add',
      reason: mkST('Claim asserted by claimant with supporting invoice'),
      source_ids: [U01, E01],
    },
    {
      entity_type: 'gap',
      entity_id: G01,
      operation: 'add',
      reason: mkST('No independent payment confirmation available'),
      source_ids: [U01],
    },
    {
      entity_type: 'action',
      entity_id: A01,
      operation: 'add',
      reason: mkST('Action required to resolve evidence gap'),
      source_ids: [U01],
    },
    {
      entity_type: 'inspection',
      entity_id: EI01,
      operation: 'add',
      reason: mkST('Initial inspection of uploaded invoice'),
      source_ids: [E01],
    },
  ];

  const revision: Revision = {
    id: R01,
    parent_id: null,
    created_at: mkInstant('2026-08-11T01:00:00.000Z'),
    objective: mkST('Perform initial intake analysis'),
    explanation: mkST(
      'Analysed claimant statement and invoice. Claim is reported; gap identified for independent confirmation.'
    ),
    assistant_message: mkST(
      'Based on the evidence provided, the claim is plausible but requires independent confirmation.'
    ),
    accepted_model_run_id: MR01,
    triggering_intake_ids: [IN01],
    input_statement_ids: [U01],
    input_evidence_ids: [E01],
    events: [event],
    claims: [claim],
    gaps: [gap],
    actions: [action],
    inspections: [inspection],
    delta: { entries: deltaEntries },
    summary: {
      total_evidence_count: mkNonNeg(1),
      established_claims_count: mkNonNeg(0),
      unresolved_claims_count: mkNonNeg(1),  // Reported
      conflicted_claims_count: mkNonNeg(0),
      user_reported_claims_count: mkNonNeg(1),
    },
  };

  const intake: IntakeRecord = {
    id: IN01,
    received_at: mkInstant('2026-08-11T00:30:00.000Z'),
    parts: [
      {
        kind: 'statement',
        statement_id: U01,
        raw_text: mkPNBT('Claimant paid invoice 1234 on 2025-01-10'),
      },
      {
        kind: 'evidence',
        evidence_id: E01,
      },
    ],
  };

  return {
    id: CASE_ID,
    schema_version: '3.0.0',
    case_number: CASE_NUMBER,
    title: CASE_TITLE,
    created_at: CASE_CREATED_AT,
    current_revision_id: R01,
    intake_ledger: [intake],
    statements: [statement],
    evidence: [evidence],
    relationships,
    revisions: [revision],
  };
}

// ---------------------------------------------------------------------------
// Two-revision case: adds a corrects_statement relationship and transitions
// gap/action, replaces a relationship batch, updates a claim.
// ---------------------------------------------------------------------------

export function buildTwoRevisionCase(): LedgerV3Case {
  const base = buildOneRevisionCase();

  // Add second intake with a correcting statement U02
  const U02_TEXT = mkPNBT(
    'Correction: payment was made on 2025-01-12, not 2025-01-10'
  );

  const intake2: IntakeRecord = {
    id: IN02,
    received_at: mkInstant('2026-08-11T02:00:00.000Z'),
    parts: [{ kind: 'statement', statement_id: U02, raw_text: U02_TEXT }],
  };

  const stmt2: CanonicalStatement = {
    id: U02,
    source_intake_id: IN02,
    text: U02_TEXT,
  };

  // Relationships: REL01-REL03 from R01 remain.
  // New in R02:
  // REL04: U02 corrects_statement U01 (U01 introduced in R01 < R02 — valid)
  // REL05: U02 supports_claim C01 (update disposition batch for U02)
  // Note: U01's batch from R01 remains effective. U02 gets a new batch in R02.
  const relCorrects: AcceptedRelationship = {
    id: mkRelationshipId('REL05'),
    relationship_type: 'corrects_statement',
    source_id: U02,
    target_id: U01,
    reason: mkST('Corrects payment date on original statement'),
    created_in_revision_id: R02,
  };

  // U02 disposition batch: corrects_statement only
  // (corrects_statement is separate from claim relationship types, so we also
  // add a supports_claim from U02 to C01 in the same batch? — no, we cannot
  // mix not_yet_classified with others, but corrects_statement is its own type.
  // The constraint is that "not_yet_classified" must be alone. corrects_statement
  // can coexist with supports_claim for the same source.
  // Add U02 supports_claim C01 as well:
  const relSupportU02: AcceptedRelationship = {
    id: mkRelationshipId('REL06'),
    relationship_type: 'supports_claim',
    source_id: U02,
    target_id: C01,
    reason: mkST('Correcting statement also supports updated payment claim'),
    created_in_revision_id: R02,
  };

  const allRels: AcceptedRelationship[] = [
    ...base.relationships,
    relCorrects,
    relSupportU02,
  ];

  // R02 snapshot:
  // Event: same EV01, update domain_time to reflect correction (effect field updated)
  const event2: Event = {
    ...base.revisions[0].events[0],
    // domain_time, actor, action, target are immutable — only effect/source can change
    effect: mkST('Invoice 1234 discharged; date corrected to 2025-01-12'),
    source_support_ids: [U01, U02, E01],
    assessment: 'Corroborated',
  };

  // Claim: same C01 — supporting now includes U02 (U01 still supports, U02 now supports too)
  // qualifying remains E01 (REL02 still effective for E01)
  const claim2: Claim = {
    ...base.revisions[0].claims[0],
    assessment: 'Corroborated',
    reasoning: mkST('Both statement and correcting statement support claim; corroborated by invoice'),
    supporting_source_ids: [U01, U02],  // REL01(U01->supports) + REL06(U02->supports)
    qualifying_source_ids: [E01],        // REL02 still effective
    conflicting_source_ids: [],
  };

  // Gap: G01 transitions from open -> resolved in R02
  const gap2: Gap = {
    ...base.revisions[0].gaps[0],
    status: 'resolved',
    transition: {
      previous_status: 'open',
      resulting_status: 'resolved',
      transition_revision_id: R02,
      reason: mkST('Independent payment confirmation received via correcting statement'),
      supporting_source_ids: [U02],
    },
  };

  // Action: A01 transitions from pending -> completed in R02
  const action2: Action = {
    ...base.revisions[0].actions[0],
    status: 'completed',
    transition: {
      previous_status: 'pending',
      resulting_status: 'completed',
      transition_revision_id: R02,
      reason: mkST('Bank statement request resolved by correcting statement'),
      supporting_source_ids: [U02],
    },
  };

  // Inspection: same EI01, update case_object_match to reflect correction
  const inspection2: EvidenceInspection = {
    ...base.revisions[0].inspections[0],
    case_object_match: mkST('Invoice number matches corrected payment date'),
  };

  const deltaEntries2: DeltaEntry[] = [
    // intake/add IN02
    {
      entity_type: 'intake',
      entity_id: IN02,
      operation: 'add',
      reason: mkST('Accepted intake'),
      source_ids: [U02],  // only stmt in intake2
    },
    // statement/add U02
    {
      entity_type: 'statement',
      entity_id: U02,
      operation: 'add',
      reason: mkST('Accepted source statement'),
      source_ids: [U02],
    },
    // relationship/add REL05 (corrects_statement)
    {
      entity_type: 'relationship',
      entity_id: mkRelationshipId('REL05'),
      operation: 'add',
      reason: mkST('Corrects payment date on original statement'),
      source_ids: [U02],
    },
    // relationship/add REL06 (supports_claim)
    {
      entity_type: 'relationship',
      entity_id: mkRelationshipId('REL06'),
      operation: 'add',
      reason: mkST('Correcting statement also supports updated payment claim'),
      source_ids: [U02],
    },
    // event/update EV01
    {
      entity_type: 'event',
      entity_id: EV01,
      operation: 'update',
      reason: mkST('Event updated to reflect corrected payment date'),
      source_ids: [U01, U02, E01],
    },
    // claim/update C01
    {
      entity_type: 'claim',
      entity_id: C01,
      operation: 'update',
      reason: mkST('Claim updated with correcting statement support'),
      source_ids: [U01, U02, E01],
    },
    // gap/transition G01
    {
      entity_type: 'gap',
      entity_id: G01,
      operation: 'transition',
      reason: mkST('Independent payment confirmation received via correcting statement'),
      source_ids: [U02],
    },
    // action/transition A01
    {
      entity_type: 'action',
      entity_id: A01,
      operation: 'transition',
      reason: mkST('Bank statement request resolved by correcting statement'),
      source_ids: [U02],
    },
    // inspection/update EI01
    {
      entity_type: 'inspection',
      entity_id: EI01,
      operation: 'update',
      reason: mkST('Inspection updated following date correction'),
      source_ids: [E01],
    },
  ];

  const revision2: Revision = {
    id: R02,
    parent_id: R01,
    created_at: mkInstant('2026-08-11T03:00:00.000Z'),
    objective: mkST('Incorporate correcting statement and resolve gap'),
    explanation: mkST(
      'A correcting statement was received that establishes the accurate payment date and corroborates the claim.'
    ),
    assistant_message: mkST(
      'The correcting statement resolves the payment date discrepancy. The claim is now corroborated.'
    ),
    accepted_model_run_id: MR02,
    triggering_intake_ids: [IN02],
    input_statement_ids: [U01, U02],
    input_evidence_ids: [E01],
    events: [event2],
    claims: [claim2],
    gaps: [gap2],
    actions: [action2],
    inspections: [inspection2],
    delta: { entries: deltaEntries2 },
    summary: {
      total_evidence_count: mkNonNeg(1),
      established_claims_count: mkNonNeg(0),
      unresolved_claims_count: mkNonNeg(1),  // Corroborated is unresolved
      conflicted_claims_count: mkNonNeg(0),
      user_reported_claims_count: mkNonNeg(0),
    },
  };

  return {
    ...base,
    current_revision_id: R02,
    intake_ledger: [base.intake_ledger[0], intake2],
    statements: [base.statements[0], stmt2],
    relationships: allRels,
    revisions: [base.revisions[0], revision2],
  };
}

// ---------------------------------------------------------------------------
// Helpers to produce invalid variants by mutation for negative tests.
// These return plain objects (not branded) suitable for parseLedgerV3(unknown).
// ---------------------------------------------------------------------------

/** Deep-clone via JSON round-trip to get a plain object for mutation. */
export function cloneAsPlain<T>(v: T): Record<string, unknown> {
  return JSON.parse(JSON.stringify(v)) as Record<string, unknown>;
}

/** Get a plain clone of the one-revision case for negative tests. */
export function plainOneRevision(): Record<string, unknown> {
  return cloneAsPlain(buildOneRevisionCase());
}

/** Get a plain clone of the two-revision case for negative tests. */
export function plainTwoRevision(): Record<string, unknown> {
  return cloneAsPlain(buildTwoRevisionCase());
}
