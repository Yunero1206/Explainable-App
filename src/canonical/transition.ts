import { CanonicalCaseRecord, CaseRevision, CanonicalStatement, CanonicalEvidence, IntakeRecord, DispositionRelationship, CanonicalAssessment, RevisionDelta, CaseEvent, CanonicalClaim, CanonicalGap, CanonicalAction, CanonicalEvidenceInspection, StatementId, EvidenceId, ClaimId, GapId, ActionId, RelationshipId, IntakeId, RevisionId, EventId, InspectionId, CanonicalGapStatus } from './types.js';
import { CaseReconstructionOutput } from '../schema.js';
import { commitRevisionToRecord } from '../domain/commitBoundary.js';

interface BuildTransitionParams {
  priorRecord: CanonicalCaseRecord;
  reconstructionOutput: CaseReconstructionOutput;
  newStatements: Omit<CanonicalStatement, 'id' | 'source_intake_id'>[];
  newEvidence: Omit<CanonicalEvidence, 'id' | 'source_intake_id'>[];
  timestamp: string;
  modelId: string;
}

/**
 * Deterministically constructs the intake, ledger objects, relationships and complete child revision,
 * then delegates the append to commitRevisionToRecord.
 */
export function buildAndCommitTransition(params: BuildTransitionParams): CanonicalCaseRecord {
  const { priorRecord, reconstructionOutput, newStatements, newEvidence, timestamp, modelId } = params;

  // Compute collision-free IDs
  const maxIntake = priorRecord.intake_ledger.length;
  const nextIntakeId = `IN${(maxIntake + 1).toString().padStart(2, '0')}` as IntakeId;

  const maxRev = priorRecord.revisions.length;
  const nextRevId = `R${(maxRev + 1).toString().padStart(2, '0')}` as RevisionId;

  const maxU = priorRecord.statements.length;
  const maxE = priorRecord.evidence.length;
  const maxRel = priorRecord.relationships.length;

  const intakeRecord: IntakeRecord = {
    id: nextIntakeId,
    received_at: timestamp,
    resulting_revision_id: nextRevId,
    parts: []
  };

  const statements: CanonicalStatement[] = newStatements.map((ns, i) => {
    const id = `U${(maxU + i + 1).toString().padStart(2, '0')}` as StatementId;
    intakeRecord.parts.push({ kind: 'statement', statement_id: id, raw_text: ns.text });
    return { ...ns, id, source_intake_id: nextIntakeId };
  });

  const evidence: CanonicalEvidence[] = newEvidence.map((ne, i) => {
    const id = `E${(maxE + i + 1).toString().padStart(2, '0')}` as EvidenceId;
    intakeRecord.parts.push({
      kind: 'evidence',
      evidence_id: id,
      submitted_name: ne.label,
      mime_type: ne.mime_type,
      byte_size: ne.byte_size,
      storage_key: ne.storage_key
    });
    return { ...ne, id, source_intake_id: nextIntakeId };
  });

  const currentUIds = [...priorRecord.statements.map(s => s.id), ...statements.map(s => s.id)];
  const currentEIds = [...priorRecord.evidence.map(e => e.id), ...evidence.map(e => e.id)];

  const relationships: DispositionRelationship[] = [];
  const inputDispositions = reconstructionOutput.input_dispositions || [];
  
  inputDispositions.forEach((disp, i) => {
    const id = `REL${(maxRel + i + 1).toString().padStart(2, '0')}` as RelationshipId;
    // Basic mapping, assume structurally valid from provider but ensure type safety
    if (disp.disposition === 'not_yet_classified') {
      relationships.push({
        id,
        source_id: disp.id as (StatementId | EvidenceId),
        target_id: null,
        relationship_type: 'not_yet_classified',
        reason: disp.reason,
        created_in_revision_id: nextRevId
      });
    } else if (disp.disposition === 'corrects_statement') {
       relationships.push({
        id,
        source_id: disp.id as StatementId,
        target_id: disp.related_object_ids[0] as StatementId,
        relationship_type: 'corrects_statement',
        reason: disp.reason,
        created_in_revision_id: nextRevId
      });
    } else if (disp.disposition === 'supports_gap') {
       relationships.push({
        id,
        source_id: disp.id as (StatementId | EvidenceId),
        target_id: disp.related_object_ids[0] as GapId,
        relationship_type: 'raises_gap',
        reason: disp.reason,
        created_in_revision_id: nextRevId
      });
    } else {
      let relType: 'supports_claim' | 'qualifies_claim' | 'conflicts_with_claim' = 'supports_claim';
      if (disp.disposition === 'challenges_finding') relType = 'conflicts_with_claim';
      // else assume supports
       relationships.push({
        id,
        source_id: disp.id as (StatementId | EvidenceId),
        target_id: disp.related_object_ids[0] as ClaimId,
        relationship_type: relType,
        reason: disp.reason,
        created_in_revision_id: nextRevId
      });
    }
  });

  // Verify and Map provider output carefully
  const oldRev = priorRecord.revisions.find(r => r.revision_id === priorRecord.current_revision_id);
  
  const events: CaseEvent[] = (reconstructionOutput.events || []).map(ev => ({
    ...ev,
    id: ev.id as EventId,
    assessment: ev.assessment as CanonicalAssessment,
    evidence_ids: ev.evidence_ids as (StatementId | EvidenceId)[],
    user_statement_ids: ev.user_statement_ids || []
  }));

  const claims: CanonicalClaim[] = (reconstructionOutput.claims || []).map(c => ({
    ...c,
    id: c.id as ClaimId,
    assessment: c.assessment as CanonicalAssessment,
    supporting_evidence: c.supporting_evidence as (StatementId | EvidenceId)[],
    qualifying_evidence: c.qualifying_evidence as (StatementId | EvidenceId)[],
    conflicting_evidence: c.conflicting_evidence as (StatementId | EvidenceId)[]
  }));

  const gaps: CanonicalGap[] = (reconstructionOutput.gaps || []).map(g => ({
    id: g.id as GapId,
    question_key: g.what_is_unknown,
    status: g.status as CanonicalGapStatus,
    target_claim_ids: g.target_claim_ids as ClaimId[],
    status_revision_id: g.status === 'open' ? undefined : nextRevId,
    status_reason: g.status === 'open' ? undefined : g.resolution_reason,
    status_source_ids: g.status === 'open' ? undefined : (g.resolution_evidence_ids as (StatementId|EvidenceId)[])
  }));

  const actions: CanonicalAction[] = (reconstructionOutput.actions || []).map(a => ({
    id: a.id as ActionId,
    target_gap_ids: [a.target_gap_id as GapId],
    description: a.description
  }));

  const inspections: CanonicalEvidenceInspection[] = (reconstructionOutput.evidence_inspection || []).map((ei, i) => ({
    id: `EI${(oldRev?.evidence_inspections.length || 0) + i + 1}`.padStart(4, '0') as InspectionId,
    evidence_id: ei.id as EvidenceId,
    limitations: ei.limitations
  }));

  const delta: RevisionDelta = { changes: [] };

  const establishedCount = claims.filter(c => c.assessment === 'Established within current record').length;
  const unresolvedCount = claims.filter(c => c.assessment === 'Reported').length;
  const conflictedCount = claims.filter(c => c.assessment === 'Contested').length;

  const summary = {
    total_evidence_count: currentEIds.length,
    established_claims_count: establishedCount,
    unresolved_claims_count: unresolvedCount,
    conflicted_claims_count: conflictedCount,
    user_reported_claims_count: unresolvedCount
  };

  const newRevision: CaseRevision = {
    revision_id: nextRevId,
    created_at: timestamp,
    title: oldRev?.title || '',
    objective: oldRev?.objective || '',
    parent_revision_id: priorRecord.current_revision_id,
    triggering_intake_id: nextIntakeId,
    input_statement_ids: currentUIds,
    input_evidence_ids: currentEIds,
    events,
    claims,
    gaps,
    actions,
    evidence_inspections: inspections,
    delta,
    summary
  };

  const commitResult = commitRevisionToRecord(
    priorRecord,
    intakeRecord,
    statements,
    evidence,
    relationships,
    newRevision
  );

  return commitResult.record;
}
