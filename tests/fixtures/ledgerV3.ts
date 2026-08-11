import {
  CaseId, CaseNumber, CaseTitle, StructuralInstant,
  LedgerV3Case, IntakeRecord, CanonicalStatement, CanonicalEvidence,
  Revision, Event, Claim, Gap, Action, EvidenceInspection,
  AcceptedRelationship, DeltaEntry, DeterministicSummary, IntakePart,
  RevisionId, IntakeId, StatementId, EvidenceId, RelationshipId,
  EventId, ClaimId, GapId, ActionId, InspectionId, ModelRunId
} from '../../src/ledger';

export function createValidCaseId(): CaseId { return 'CASE_valid-123' as CaseId; }
export function createValidRevisionId(num = '01'): RevisionId { return `R${num}` as any; }
export function createValidIntakeId(num = '01'): IntakeId { return `IN${num}` as any; }
export function createValidStatementId(num = '01'): StatementId { return `U${num}` as any; }
export function createValidEvidenceId(num = '01'): EvidenceId { return `E${num}` as any; }
export function createValidRelationshipId(num = '01'): RelationshipId { return `REL${num}` as any; }
export function createValidEventId(num = '01'): EventId { return `EV${num}` as any; }
export function createValidClaimId(num = '01'): ClaimId { return `C${num}` as any; }
export function createValidGapId(num = '01'): GapId { return `G${num}` as any; }
export function createValidActionId(num = '01'): ActionId { return `A${num}` as any; }
export function createValidInspectionId(num = '01'): InspectionId { return `EI${num}` as any; }
export function createValidModelRunId(num = '01'): ModelRunId { return `MR${num}` as any; }

export function createValidCaseBase() {
  return {
    id: createValidCaseId(),
    schema_version: '3.0.0' as const,
    case_number: 'CN-1' as CaseNumber,
    title: 'Test Case' as CaseTitle,
    created_at: '2026-08-11T00:00:00.000Z' as StructuralInstant,
    current_revision_id: null,
    intake_ledger: [],
    statements: [],
    evidence: [],
    relationships: [],
    revisions: []
  };
}

export function buildCompleteLedger(): LedgerV3Case {
  const c = createValidCaseBase();
  const revId = createValidRevisionId();
  c.current_revision_id = revId;

  const intakeId = createValidIntakeId();
  const stmtId = createValidStatementId();
  const evId = createValidEvidenceId();

  c.intake_ledger.push({
    id: intakeId,
    received_at: '2026-08-11T01:00:00.000Z' as StructuralInstant,
    parts: [
      { kind: 'statement', statement_id: stmtId, raw_text: 'hello' as any },
      { kind: 'evidence', evidence_id: evId }
    ]
  });

  c.statements.push({
    id: stmtId,
    source_intake_id: intakeId,
    text: 'hello' as any
  });

  c.evidence.push({
    id: evId,
    source_intake_id: intakeId,
    label: 'Receipt' as any,
    claimed_source: 'User' as any,
    acquisition_method: 'user_upload',
    input_form: 'receipt',
    original_domain_time: 'last week' as any,
    subject_object_ids: [],
    content: {
      raw_text: null,
      extracted_text: 'paid 5 bucks' as any,
      blob: {
        blob_ref: 'BLOB_123' as any,
        submitted_filename: 'receipt.pdf' as any,
        mime_type: 'application/pdf' as any,
        byte_size: 1024 as any,
        sha256: 'sha256:0000000000000000000000000000000000000000000000000000000000000000' as any
      }
    }
  });

  const claimId = createValidClaimId();
  const gapId = createValidGapId();
  const actionId = createValidActionId();
  const relId = createValidRelationshipId();
  const relId2 = createValidRelationshipId('02');
  const inspId = createValidInspectionId();
  const evIdEv = createValidEventId();

  c.relationships.push({
    id: relId,
    relationship_type: 'supports_claim',
    source_id: stmtId,
    target_id: claimId,
    reason: 'Matches' as any,
    created_in_revision_id: revId
  });
  c.relationships.push({
    id: relId2,
    relationship_type: 'supports_claim',
    source_id: evId,
    target_id: claimId,
    reason: 'Matches Ev' as any,
    created_in_revision_id: revId
  });

  const rev: Revision = {
    id: revId,
    parent_id: null,
    created_at: '2026-08-11T02:00:00.000Z' as StructuralInstant,
    objective: 'Initial' as any,
    explanation: 'First run' as any,
    assistant_message: 'Hi' as any,
    accepted_model_run_id: createValidModelRunId(),
    triggering_intake_ids: [intakeId],
    input_statement_ids: [stmtId],
    input_evidence_ids: [evId],
    events: [{
      id: evIdEv,
      domain_time: 'today' as any,
      actor: 'system' as any,
      action: 'process' as any,
      target: 'data' as any,
      effect: 'done' as any,
      source_support_ids: [stmtId],
      assessment: 'Established within current record'
    }],
    claims: [{
      id: claimId,
      proposition: 'prop' as any,
      actor: 'a' as any,
      action: 'b' as any,
      target: 'c' as any,
      domain_time: 'now' as any,
      assessment: 'Reported',
      reasoning: 'because' as any,
      scope: 'all' as any,
      limits: [],
      supporting_source_ids: [stmtId, evId],
      qualifying_source_ids: [],
      conflicting_source_ids: []
    }],
    gaps: [{
      id: gapId,
      question: 'q' as any,
      relevance: 'high' as any,
      resolving_evidence: 'doc' as any,
      acquisition_guidance: 'ask' as any,
      collection_boundary: 'soon' as any,
      target_claim_ids: [claimId],
      status: 'open',
      transition: null
    }],
    actions: [{
      id: actionId,
      title: 't' as any,
      description: 'd' as any,
      target_gap_ids: [gapId],
      priority: 'high',
      status: 'pending',
      transition: null
    }],
    inspections: [{
      id: inspId,
      evidence_id: evId,
      source_attribution: 'a' as any,
      case_object_match: 'm' as any,
      match_status: 'matched',
      completeness_context: 'c' as any,
      integrity_signals: 'i' as any,
      limitations: []
    }],
    delta: {
      entries: [
        { entity_type: 'intake', entity_id: intakeId, operation: 'add', reason: 'Accepted intake' as any, source_ids: [stmtId, evId] },
        { entity_type: 'statement', entity_id: stmtId, operation: 'add', reason: 'Accepted source statement' as any, source_ids: [stmtId] },
        { entity_type: 'evidence', entity_id: evId, operation: 'add', reason: 'Accepted evidence source' as any, source_ids: [evId] },
        { entity_type: 'relationship', entity_id: relId, operation: 'add', reason: 'Matches' as any, source_ids: [stmtId] },
        { entity_type: 'relationship', entity_id: relId2, operation: 'add', reason: 'Matches Ev' as any, source_ids: [evId] },
        { entity_type: 'event', entity_id: evIdEv, operation: 'add', reason: 'Expl' as any, source_ids: [stmtId] },
        { entity_type: 'claim', entity_id: claimId, operation: 'add', reason: 'Expl' as any, source_ids: [stmtId] },
        { entity_type: 'gap', entity_id: gapId, operation: 'add', reason: 'Expl' as any, source_ids: [stmtId] },
        { entity_type: 'action', entity_id: actionId, operation: 'add', reason: 'Expl' as any, source_ids: [stmtId] },
        { entity_type: 'inspection', entity_id: inspId, operation: 'add', reason: 'Expl' as any, source_ids: [evId] }
      ]
    },
    summary: {
      total_evidence_count: 1 as any,
      established_claims_count: 0 as any,
      unresolved_claims_count: 1 as any,
      conflicted_claims_count: 0 as any,
      user_reported_claims_count: 1 as any
    }
  };
  c.revisions.push(rev);

  return c;
}
