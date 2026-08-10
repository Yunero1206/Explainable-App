import type { LegacyCaseDataShape } from './boundary.js';
import { CanonicalCaseRecord, CaseRevision, DispositionRelationship, CanonicalStatement, CanonicalEvidence, IntakeRecord, IntakePart, CanonicalAssessment, CanonicalGapStatus, StatementId, EvidenceId, ClaimId, GapId, ActionId, RevisionId, RelationshipId, IntakeId, EventId } from './types.js';

export function upgradeLegacyCaseToCanonical(legacy: LegacyCaseDataShape): CanonicalCaseRecord {
  const intakeId = 'IN01' as IntakeId;
  const revisionId = 'R01' as RevisionId;

  const parts: IntakePart[] = [];
  const statements: CanonicalStatement[] = [];
  const evidence: CanonicalEvidence[] = [];
  const relationships: DispositionRelationship[] = [];

  // 1. Statements
  for (const s of legacy.statements || []) {
    parts.push({
      kind: 'statement',
      statement_id: s.id as StatementId,
      raw_text: s.text
    });
    statements.push({
      id: s.id as StatementId,
      text: s.text,
      submitted_at: new Date(s.submitted_at).toISOString(),
      source_intake_id: intakeId
    });
  }

  // 2. Evidence
  for (const e of legacy.evidence || []) {
    parts.push({
      kind: 'evidence',
      evidence_id: e.id as EvidenceId,
      submitted_name: e.label || e.id
    });
    evidence.push({
      id: e.id as EvidenceId,
      label: e.label || e.id,
      origin_type: 'user', // default
      input_form: e.input_form || 'document',
      submitted_at: new Date(e.received_at).toISOString(),
      source_intake_id: intakeId
    });
  }

  // Use the earliest evidence/statement timestamp as intake time, or a fixed string if empty.
  const earliestTimestamp = statements[0]?.submitted_at || evidence[0]?.submitted_at || '2023-01-01T00:00:00Z';

  const intake: IntakeRecord = {
    id: intakeId,
    received_at: earliestTimestamp,
    resulting_revision_id: revisionId,
    parts
  };

  // 3. Revisions - Map events, claims, gaps, actions
  let relCounter = 1;
  const generateRelId = () => `REL${relCounter++}` as RelationshipId;

  const claims = (legacy.claims || []).map(c => {
    // Generate relationships
    for (const sourceId of c.supporting_evidence || []) {
      relationships.push({
        id: generateRelId(),
        source_id: sourceId as (StatementId | EvidenceId),
        target_id: c.id as ClaimId,
        relationship_type: 'supports_claim',
        reason: 'Legacy support',
        created_in_revision_id: revisionId
      });
    }
    for (const sourceId of c.qualifying_evidence || []) {
      relationships.push({
        id: generateRelId(),
        source_id: sourceId as (StatementId | EvidenceId),
        target_id: c.id as ClaimId,
        relationship_type: 'qualifies_claim',
        reason: 'Legacy qualification',
        created_in_revision_id: revisionId
      });
    }
    for (const sourceId of c.conflicting_evidence || []) {
      relationships.push({
        id: generateRelId(),
        source_id: sourceId as (StatementId | EvidenceId),
        target_id: c.id as ClaimId,
        relationship_type: 'conflicts_with_claim',
        reason: 'Legacy conflict',
        created_in_revision_id: revisionId
      });
    }

    return {
      id: c.id as ClaimId,
      text: c.text,
      assessment: (c.assessment as CanonicalAssessment) || 'Reported',
      reasoning: c.reasoning || '',
      supporting_evidence: (c.supporting_evidence || []) as (StatementId | EvidenceId)[],
      qualifying_evidence: (c.qualifying_evidence || []) as (StatementId | EvidenceId)[],
      conflicting_evidence: (c.conflicting_evidence || []) as (StatementId | EvidenceId)[]
    };
  });

  const gaps = (legacy.gaps || []).map(g => {
    return {
      id: g.id as GapId,
      question_key: g.what_is_unknown || g.id,
      status: 'open' as CanonicalGapStatus,
      target_claim_ids: (g.target_claim_ids || []) as ClaimId[]
    };
  });

  const actions = (legacy.actions || []).map(a => ({
    id: a.id as ActionId,
    target_gap_ids: (a.target_gap_id ? [a.target_gap_id] : []) as GapId[],
    description: a.description || a.title || ''
  }));

  const events = (legacy.events || []).map(ev => ({
    id: ev.id as EventId,
    time: ev.time || '',
    actor: ev.actor || '',
    action: ev.action || '',
    target: ev.target || '',
    effect: ev.effect,
    evidence_ids: (ev.evidence_ids || []) as (StatementId | EvidenceId)[],
    assessment: (ev.assessment as CanonicalAssessment) || 'Reported'
  }));

  const revision: CaseRevision = {
    revision_id: revisionId,
    created_at: earliestTimestamp,
    title: legacy.title,
    objective: legacy.objective,
    triggering_intake_id: intakeId,
    input_statement_ids: statements.map(s => s.id),
    input_evidence_ids: evidence.map(e => e.id),
    events,
    claims,
    gaps,
    actions,
    evidence_inspections: [],
    delta: {
      changes: [] // minimal
    },
    summary: legacy.summary ? {
      total_evidence_count: legacy.summary.total_evidence_count || 0,
      established_claims_count: legacy.summary.established_claims_count || 0,
      unresolved_claims_count: legacy.summary.unresolved_claims_count || 0,
      conflicted_claims_count: legacy.summary.conflicted_claims_count || 0,
      user_reported_claims_count: legacy.summary.user_reported_claims_count || 0
    } : {
      total_evidence_count: 0,
      established_claims_count: 0,
      unresolved_claims_count: 0,
      conflicted_claims_count: 0,
      user_reported_claims_count: 0
    }
  };

  // Add dummy relationships for any unused statements/evidence to pass validation
  const usedSources = new Set(relationships.map(r => r.source_id));
  for (const s of statements) {
    if (!usedSources.has(s.id)) {
      relationships.push({
        id: generateRelId(),
        source_id: s.id as StatementId,
        target_id: null,
        relationship_type: 'not_yet_classified',
        reason: 'Legacy unused',
        created_in_revision_id: revisionId
      });
    }
  }
  for (const e of evidence) {
    if (!usedSources.has(e.id)) {
      relationships.push({
        id: generateRelId(),
        source_id: e.id as EvidenceId,
        target_id: null,
        relationship_type: 'not_yet_classified',
        reason: 'Legacy unused',
        created_in_revision_id: revisionId
      });
    }
  }

  return {
    id: legacy.id,
    schema_version: '2.0.0',
    case_number: legacy.case_number,
    created_at: earliestTimestamp,
    updated_at: earliestTimestamp,
    current_revision_id: revisionId,
    intake_ledger: [intake],
    statements,
    evidence,
    relationships,
    revisions: [revision]
  };
}
