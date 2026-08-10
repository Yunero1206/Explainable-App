import {
  CanonicalCaseRecord, CaseRevision, CanonicalStatement, CanonicalEvidence,
  IntakeRecord, DispositionRelationship, CanonicalAssessment, RevisionDelta,
  RevisionDeltaEntry, CaseEvent, CanonicalClaim, CanonicalGap, CanonicalAction,
  CanonicalEvidenceInspection, StatementId, EvidenceId, ClaimId, GapId,
  ActionId, RelationshipId, IntakeId, RevisionId, EventId, InspectionId,
  CanonicalGapStatus, CANONICAL_ASSESSMENT_VALUES, CANONICAL_GAP_STATUSES
} from './types.js';
import { CaseReconstructionOutput } from '../schema.js';
import { CanonicalCaseRecordSchema } from './schema.js';
import { validateCanonicalRecord } from './validate.js';
import { commitRevisionToRecord } from '../domain/commitBoundary.js';

// ---------------------------------------------------------------------------
// ID Allocation — scans existing numeric suffixes for collision-free allocation
// ---------------------------------------------------------------------------

function extractNumericSuffix(id: string, prefix: string): number {
  if (!id.startsWith(prefix)) return -1;
  const num = parseInt(id.slice(prefix.length), 10);
  return Number.isFinite(num) ? num : -1;
}

function scanMaxSuffix(ids: string[], prefix: string): number {
  let max = 0;
  for (const id of ids) {
    const n = extractNumericSuffix(id, prefix);
    if (n > max) max = n;
  }
  return max;
}

function formatId(prefix: string, n: number): string {
  return `${prefix}${n.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Temporary-to-Canonical ID remap structure
// ---------------------------------------------------------------------------

export interface IdRemapTable {
  statements: Map<string, StatementId>;     // e.g. U_TEMP_0 → U03
  evidence: Map<string, EvidenceId>;         // e.g. E_TEMP_0 → E02
  intakeId: IntakeId;
  revisionId: RevisionId;
}

function remapId(id: string, remap: IdRemapTable): string {
  return remap.statements.get(id)
    ?? remap.evidence.get(id)
    ?? id;
}

// ---------------------------------------------------------------------------
// Build transition params
// ---------------------------------------------------------------------------

export interface BuildTransitionParams {
  priorRecord: CanonicalCaseRecord;
  reconstructionOutput: CaseReconstructionOutput;
  newStatements: Omit<CanonicalStatement, 'id' | 'source_intake_id'>[];
  newEvidence: Omit<CanonicalEvidence, 'id' | 'source_intake_id'>[];
  timestamp: string;
  modelId: string;
  tempIdRemap?: {
    statementTempIds: string[];   // ordered temp IDs for newStatements
    evidenceTempIds: string[];    // ordered temp IDs for newEvidence
  };
}

// ---------------------------------------------------------------------------
// buildAndCommitTransition — main entry point
// ---------------------------------------------------------------------------

export function buildAndCommitTransition(params: BuildTransitionParams): CanonicalCaseRecord {
  const { priorRecord, reconstructionOutput, newStatements, newEvidence, timestamp, tempIdRemap } = params;

  // 1. Scan existing collections for max numeric suffixes
  const maxIN = scanMaxSuffix(priorRecord.intake_ledger.map(i => i.id), 'IN');
  const maxR = scanMaxSuffix(priorRecord.revisions.map(r => r.revision_id), 'R');
  const maxU = scanMaxSuffix(priorRecord.statements.map(s => s.id), 'U');
  const maxE = scanMaxSuffix(priorRecord.evidence.map(e => e.id), 'E');
  const maxREL = scanMaxSuffix(priorRecord.relationships.map(r => r.id), 'REL');

  const nextIntakeId = formatId('IN', maxIN + 1) as IntakeId;
  const nextRevId = formatId('R', maxR + 1) as RevisionId;

  // 2. Build remap table for temporary IDs
  const remap: IdRemapTable = {
    statements: new Map(),
    evidence: new Map(),
    intakeId: nextIntakeId,
    revisionId: nextRevId,
  };

  const allocatedStatements: CanonicalStatement[] = [];
  for (let i = 0; i < newStatements.length; i++) {
    const canonId = formatId('U', maxU + i + 1) as StatementId;
    const tempId = tempIdRemap?.statementTempIds[i];
    if (tempId) remap.statements.set(tempId, canonId);
    allocatedStatements.push({
      ...newStatements[i],
      id: canonId,
      source_intake_id: nextIntakeId,
    });
  }

  const allocatedEvidence: CanonicalEvidence[] = [];
  for (let i = 0; i < newEvidence.length; i++) {
    const canonId = formatId('E', maxE + i + 1) as EvidenceId;
    const tempId = tempIdRemap?.evidenceTempIds[i];
    if (tempId) remap.evidence.set(tempId, canonId);
    allocatedEvidence.push({
      ...newEvidence[i],
      id: canonId,
      source_intake_id: nextIntakeId,
    });
  }

  // 3. Build the intake record
  const intakeRecord: IntakeRecord = {
    id: nextIntakeId,
    received_at: timestamp,
    resulting_revision_id: nextRevId,
    parts: [
      ...allocatedStatements.map(s => ({
        kind: 'statement' as const,
        statement_id: s.id,
        raw_text: s.text,
      })),
      ...allocatedEvidence.map(e => ({
        kind: 'evidence' as const,
        evidence_id: e.id,
        submitted_name: e.label,
        mime_type: e.mime_type,
        byte_size: e.byte_size,
        storage_key: e.storage_key,
      })),
    ],
  };

  // 4. Combined ID sets for the new revision
  const allStatementIds = [...priorRecord.statements.map(s => s.id), ...allocatedStatements.map(s => s.id)];
  const allEvidenceIds = [...priorRecord.evidence.map(e => e.id), ...allocatedEvidence.map(e => e.id)];

  // 5. Normalize relationships from provider dispositions
  let relCounter = maxREL;
  const relationships: DispositionRelationship[] = [];
  const inputDispositions = reconstructionOutput.input_dispositions ?? [];

  for (const disp of inputDispositions) {
    relCounter++;
    const relId = formatId('REL', relCounter) as RelationshipId;
    const sourceId = remapId(disp.id, remap);

    if (disp.disposition === 'not_yet_classified') {
      relationships.push({
        id: relId,
        source_id: sourceId as StatementId | EvidenceId,
        target_id: null,
        relationship_type: 'not_yet_classified',
        reason: disp.reason,
        created_in_revision_id: nextRevId,
      });
    } else if (disp.disposition === 'corrects_statement') {
      relationships.push({
        id: relId,
        source_id: sourceId as StatementId,
        target_id: remapId(disp.related_object_ids[0], remap) as StatementId,
        relationship_type: 'corrects_statement',
        reason: disp.reason,
        created_in_revision_id: nextRevId,
      });
    } else if (disp.disposition === 'supports_gap') {
      relationships.push({
        id: relId,
        source_id: sourceId as StatementId | EvidenceId,
        target_id: disp.related_object_ids[0] as GapId,
        relationship_type: 'raises_gap',
        reason: disp.reason,
        created_in_revision_id: nextRevId,
      });
    } else {
      const relType: 'supports_claim' | 'conflicts_with_claim' =
        disp.disposition === 'challenges_finding' ? 'conflicts_with_claim' : 'supports_claim';
      relationships.push({
        id: relId,
        source_id: sourceId as StatementId | EvidenceId,
        target_id: disp.related_object_ids[0] as ClaimId,
        relationship_type: relType,
        reason: disp.reason,
        created_in_revision_id: nextRevId,
      });
    }
  }

  // 6. Normalize provider events, claims, gaps, actions, inspections
  //    into canonical entities — no direct spread from provider objects.
  const oldRev = priorRecord.revisions.find(r => r.revision_id === priorRecord.current_revision_id);
  const priorGapMap = new Map<string, CanonicalGap>();
  if (oldRev) {
    for (const g of oldRev.gaps) priorGapMap.set(g.id, g);
  }

  // Scan for max IDs in existing revision-scoped entities
  const existingEVMax = oldRev
    ? scanMaxSuffix(oldRev.events.map(e => e.id), 'EV')
    : 0;
  const existingCMax = oldRev
    ? scanMaxSuffix(oldRev.claims.map(c => c.id), 'C')
    : 0;
  const existingGMax = oldRev
    ? scanMaxSuffix(oldRev.gaps.map(g => g.id), 'G')
    : 0;
  const existingAMax = oldRev
    ? scanMaxSuffix(oldRev.actions.map(a => a.id), 'A')
    : 0;

  // Also scan across ALL revisions for global collision freedom
  const allEventIds = new Set<string>();
  const allClaimIds = new Set<string>();
  const allGapIds = new Set<string>();
  const allActionIds = new Set<string>();
  const allInspectionIds = new Set<string>();
  for (const rev of priorRecord.revisions) {
    for (const e of rev.events) allEventIds.add(e.id);
    for (const c of rev.claims) allClaimIds.add(c.id);
    for (const g of rev.gaps) allGapIds.add(g.id);
    for (const a of rev.actions) allActionIds.add(a.id);
    for (const ei of rev.evidence_inspections) allInspectionIds.add(ei.id);
  }

  // Build delta entries
  const deltaChanges: RevisionDeltaEntry[] = [];
  const entityRemap = new Map<string, string>();

  // Pre-allocate IDs for genuinely new objects so cross-references can be remapped
  let evCounterAlloc = existingEVMax;
  for (const pev of reconstructionOutput.events ?? []) {
    if (!allEventIds.has(pev.id)) {
      evCounterAlloc++;
      entityRemap.set(pev.id, formatId('EV', evCounterAlloc));
    }
  }
  let cCounterAlloc = existingCMax;
  for (const pc of reconstructionOutput.claims ?? []) {
    if (!allClaimIds.has(pc.id)) {
      cCounterAlloc++;
      entityRemap.set(pc.id, formatId('C', cCounterAlloc));
    }
  }
  let gCounterAlloc = existingGMax;
  for (const pg of reconstructionOutput.gaps ?? []) {
    if (!allGapIds.has(pg.id)) {
      gCounterAlloc++;
      entityRemap.set(pg.id, formatId('G', gCounterAlloc));
    }
  }
  let aCounterAlloc = existingAMax;
  for (const pa of reconstructionOutput.actions ?? []) {
    if (!allActionIds.has(pa.id)) {
      aCounterAlloc++;
      entityRemap.set(pa.id, formatId('A', aCounterAlloc));
    }
  }

  const resolveEntityId = (id: string) => entityRemap.get(id) ?? id;

  // 6a. Events
  const events: CaseEvent[] = [];
  const providerEvents = reconstructionOutput.events ?? [];

  for (const pev of providerEvents) {
    const isExisting = allEventIds.has(pev.id);
    const assessment = validateAssessment(pev.assessment);
    const remappedEvidenceIds = (pev.evidence_ids ?? []).map(id => remapId(id, remap)) as (StatementId | EvidenceId)[];

    if (isExisting) {
      const oldEvent = oldRev?.events.find(e => e.id === pev.id);
      if (oldEvent) {
        if (oldEvent.time !== pev.time || oldEvent.actor !== pev.actor || oldEvent.action !== pev.action || oldEvent.target !== pev.target || oldEvent.effect !== pev.effect) {
          throw new Error(`Illegal identity change for Event ${pev.id}: immutable fields modified`);
        }
      }
      const canonEvent: CaseEvent = {
        id: pev.id as EventId,
        time: pev.time,
        actor: pev.actor,
        action: pev.action,
        target: pev.target,
        effect: pev.effect || undefined,
        evidence_ids: remappedEvidenceIds,
        assessment,
      };
      events.push(canonEvent);
      if (oldEvent && oldEvent.assessment !== assessment) {
        deltaChanges.push({ entity_type: 'event', entity_id: pev.id as EventId, operation: 'updated', reason: 'Updated by reconstruction', source_ids: remappedEvidenceIds });
      }
    } else {
      const eventId = resolveEntityId(pev.id) as EventId;
      allEventIds.add(eventId);
      events.push({
        id: eventId,
        time: pev.time,
        actor: pev.actor,
        action: pev.action,
        target: pev.target,
        effect: pev.effect || undefined,
        evidence_ids: remappedEvidenceIds,
        assessment,
      });
      deltaChanges.push({ entity_type: 'event', entity_id: eventId, operation: 'added', reason: 'New event from reconstruction', source_ids: remappedEvidenceIds });
    }
  }

  // 6b. Claims
  const claims: CanonicalClaim[] = [];
  const providerClaims = reconstructionOutput.claims ?? [];

  for (const pc of providerClaims) {
    const isExisting = allClaimIds.has(pc.id);
    const assessment = validateAssessment(pc.assessment);
    const supportingEvidence = (pc.supporting_evidence ?? []).map(id => remapId(id, remap)) as (StatementId | EvidenceId)[];
    const qualifyingEvidence = (pc.qualifying_evidence ?? []).map(id => remapId(id, remap)) as (StatementId | EvidenceId)[];
    const conflictingEvidence = (pc.conflicting_evidence ?? []).map(id => remapId(id, remap)) as (StatementId | EvidenceId)[];

    if (isExisting) {
      const oldClaim = oldRev?.claims.find(c => c.id === pc.id);
      if (oldClaim && oldClaim.text !== pc.text) {
        throw new Error(`Illegal identity change for Claim ${pc.id}: immutable text modified`);
      }
      claims.push({
        id: pc.id as ClaimId,
        text: pc.text,
        assessment,
        reasoning: pc.reasoning,
        supporting_evidence: supportingEvidence,
        qualifying_evidence: qualifyingEvidence,
        conflicting_evidence: conflictingEvidence,
      });
      if (oldClaim && oldClaim.assessment !== assessment) {
        deltaChanges.push({ entity_type: 'claim', entity_id: pc.id as ClaimId, operation: 'updated', reason: 'Assessment changed by reconstruction', source_ids: supportingEvidence });
      }
    } else {
      const claimId = resolveEntityId(pc.id) as ClaimId;
      allClaimIds.add(claimId);
      claims.push({
        id: claimId,
        text: pc.text,
        assessment,
        reasoning: pc.reasoning,
        supporting_evidence: supportingEvidence,
        qualifying_evidence: qualifyingEvidence,
        conflicting_evidence: conflictingEvidence,
      });
      deltaChanges.push({ entity_type: 'claim', entity_id: claimId, operation: 'added', reason: 'New claim from reconstruction', source_ids: supportingEvidence });
    }
  }

  // 6c. Gaps
  const gaps: CanonicalGap[] = [];
  const providerGaps = reconstructionOutput.gaps ?? [];

  for (const pg of providerGaps) {
    const isExisting = allGapIds.has(pg.id);
    const status = validateGapStatus(pg.status);
    const mappedTargetClaimIds = (pg.target_claim_ids ?? []).map(resolveEntityId) as ClaimId[];

    if (isExisting) {
      const priorGap = priorGapMap.get(pg.id);
      if (priorGap) {
        if (priorGap.question_key !== pg.what_is_unknown) {
           throw new Error(`Illegal identity change for Gap ${pg.id}: immutable question_key modified`);
        }
        // Strict array equality for target_claim_ids
        if (JSON.stringify(priorGap.target_claim_ids.slice().sort()) !== JSON.stringify(mappedTargetClaimIds.slice().sort())) {
           throw new Error(`Illegal identity change for Gap ${pg.id}: immutable target_claim_ids modified`);
        }
      }
      const statusChanged = priorGap && priorGap.status !== status;
      const canonGap: CanonicalGap = {
        id: pg.id as GapId,
        question_key: priorGap?.question_key ?? pg.what_is_unknown,
        status,
        target_claim_ids: mappedTargetClaimIds,
        ...(statusChanged ? {
          status_revision_id: nextRevId,
          status_reason: pg.resolution_reason ?? 'Status changed by reconstruction',
          status_source_ids: (pg.resolution_evidence_ids ?? []).map(id => remapId(id, remap)) as (StatementId | EvidenceId)[],
        } : {
          status_revision_id: priorGap?.status_revision_id,
          status_reason: priorGap?.status_reason,
          status_source_ids: priorGap?.status_source_ids,
        }),
      };
      gaps.push(canonGap);

      if (statusChanged) {
        const operation: 'resolved' | 'reopened' | 'updated' = status === 'open' ? 'reopened' : (status === 'resolved' || status === 'superseded' || status === 'unavailable' || status === 'no_longer_material') ? 'resolved' : 'updated';
        const sourceIds = (pg.resolution_evidence_ids ?? []).map(id => remapId(id, remap)) as (StatementId | EvidenceId)[];
        deltaChanges.push({ entity_type: 'gap', entity_id: pg.id as GapId, operation, reason: pg.resolution_reason ?? 'Gap status changed', source_ids: sourceIds });

        if (priorGap) {
          evCounterAlloc++;
          const transEventId = formatId('EV', evCounterAlloc) as EventId;
          allEventIds.add(transEventId);
          events.push({
            id: transEventId,
            time: timestamp,
            actor: 'System',
            action: operation,
            target: pg.id,
            evidence_ids: [],
            assessment: 'Established within current record',
            gap_transition: { gap_id: pg.id as GapId, previous_status: priorGap.status, resulting_status: status, transition_revision_id: nextRevId, source_ids: sourceIds },
          });
          deltaChanges.push({ entity_type: 'event', entity_id: transEventId, operation: 'added', reason: 'Gap transition recorded', source_ids: sourceIds });
        }
      }
    } else {
      const gapId = resolveEntityId(pg.id) as GapId;
      allGapIds.add(gapId);
      gaps.push({
        id: gapId,
        question_key: pg.what_is_unknown,
        status,
        target_claim_ids: mappedTargetClaimIds,
        status_revision_id: status === 'open' ? undefined : nextRevId,
        status_reason: status === 'open' ? undefined : pg.resolution_reason ?? 'New gap opened',
        status_source_ids: status === 'open' ? undefined : (pg.resolution_evidence_ids ?? []).map(id => remapId(id, remap)) as (StatementId | EvidenceId)[],
      });
      deltaChanges.push({ entity_type: 'gap', entity_id: gapId, operation: 'added', reason: 'New gap from reconstruction', source_ids: [] });
    }
  }

  // 6d. Actions
  const actions: CanonicalAction[] = [];
  const providerActions = reconstructionOutput.actions ?? [];

  for (const pa of providerActions) {
    const isExisting = allActionIds.has(pa.id);
    const mappedTargetGapIds = pa.target_gap_id ? [resolveEntityId(pa.target_gap_id) as GapId] : [];

    if (isExisting) {
      const oldAction = oldRev?.actions.find(a => a.id === pa.id);
      if (oldAction) {
        if (oldAction.description !== (pa.description || pa.title || '') || JSON.stringify(oldAction.target_gap_ids.slice().sort()) !== JSON.stringify(mappedTargetGapIds.slice().sort())) {
          throw new Error(`Illegal identity change for Action ${pa.id}: immutable fields modified`);
        }
      }
      actions.push({
        id: pa.id as ActionId,
        description: pa.description || pa.title || '',
        target_gap_ids: mappedTargetGapIds,
      });
    } else {
      const actionId = resolveEntityId(pa.id) as ActionId;
      allActionIds.add(actionId);
      actions.push({
        id: actionId,
        description: pa.description || pa.title || '',
        target_gap_ids: mappedTargetGapIds,
      });
      deltaChanges.push({ entity_type: 'action', entity_id: actionId, operation: 'added', reason: 'New action from reconstruction', source_ids: [] });
    }
  }

  // 6e. Evidence inspections — collision-free EIxx allocation
  let eiCounter = scanMaxSuffix([...allInspectionIds], 'EI');
  const inspections: CanonicalEvidenceInspection[] = (reconstructionOutput.evidence_inspection ?? []).map(ei => {
    eiCounter++;
    const inspectionId = formatId('EI', eiCounter) as InspectionId;
    return {
      id: inspectionId,
      evidence_id: remapId(ei.id, remap) as EvidenceId,
      limitations: ei.limitations ?? [],
    };
  });

  // 6f. Add delta entries for new statements, evidence and relationships
  for (const s of allocatedStatements) {
    deltaChanges.push({
      entity_type: 'statement',
      entity_id: s.id,
      operation: 'added',
      reason: 'New statement from intake',
      source_ids: [],
    });
  }
  for (const e of allocatedEvidence) {
    deltaChanges.push({
      entity_type: 'evidence',
      entity_id: e.id,
      operation: 'added',
      reason: 'New evidence from intake',
      source_ids: [],
    });
  }
  for (const r of relationships) {
    deltaChanges.push({
      entity_type: 'relationship',
      entity_id: r.id,
      operation: 'added',
      reason: 'New relationship from reconstruction',
      source_ids: [],
    });
  }

  // 7. Build revision delta
  const delta: RevisionDelta = { changes: deltaChanges };

  // 8. Summary
  const establishedCount = claims.filter(c => c.assessment === 'Established within current record').length;
  const unresolvedCount = claims.filter(c => c.assessment === 'Reported').length;
  const conflictedCount = claims.filter(c => c.assessment === 'Contested').length;

  const summary = {
    total_evidence_count: allEvidenceIds.length,
    established_claims_count: establishedCount,
    unresolved_claims_count: unresolvedCount,
    conflicted_claims_count: conflictedCount,
    user_reported_claims_count: unresolvedCount,
  };

  // 9. Build the new revision
  const newRevision: CaseRevision = {
    revision_id: nextRevId,
    created_at: timestamp,
    title: oldRev?.title ?? '',
    objective: oldRev?.objective ?? '',
    parent_revision_id: priorRecord.current_revision_id,
    triggering_intake_id: nextIntakeId,
    input_statement_ids: allStatementIds as StatementId[],
    input_evidence_ids: allEvidenceIds as EvidenceId[],
    events,
    claims,
    gaps,
    actions,
    evidence_inspections: inspections,
    delta,
    summary,
  };

  // 10. Delegate immutable append and validation to commitBoundary
  try {
    const { record } = commitRevisionToRecord(
      priorRecord,
      intakeRecord,
      allocatedStatements,
      allocatedEvidence,
      relationships,
      newRevision,
      timestamp
    );
    return record;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'InvariantValidationError') {
      throw Object.assign(
        new Error(`Transition invariant validation failed: ${err.message}`),
        { stage: 'TRANSITION_VALIDATION_FAILED' }
      );
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateAssessment(value: string): CanonicalAssessment {
  if ((CANONICAL_ASSESSMENT_VALUES as readonly string[]).includes(value)) {
    return value as CanonicalAssessment;
  }
  return 'Reported';
}

function validateGapStatus(value: string): CanonicalGapStatus {
  if ((CANONICAL_GAP_STATUSES as readonly string[]).includes(value)) {
    return value as CanonicalGapStatus;
  }
  return 'open';
}

function deepCloneObj<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  return JSON.parse(JSON.stringify(obj));
}
