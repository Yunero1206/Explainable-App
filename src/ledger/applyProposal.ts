import {
  ClaimIdSchema,
  GapIdSchema,
  SemanticTextSchema,
  parseLedgerV3,
} from './schema';
import { createLedgerIdAllocator } from './idAllocator';
import type {
  AcceptedRelationship,
  Action,
  CanonicalEvidence,
  CanonicalStatement,
  Claim,
  DeltaEntry,
  Event,
  EvidenceId,
  EvidenceInspection,
  Gap,
  InspectionId,
  IntakeRecord,
  LedgerV3Case,
  ModelRunId,
  RevisionId,
  SemanticText,
  SourceId,
  StructuralInstant,
} from './types';
import type {
  ActionLocalRef,
  ClaimLocalRef,
  GapLocalRef,
  ProviderProposal,
} from '../provider/proposalTypes';

export interface PreparedLedgerIntake {
  intake: IntakeRecord;
  statements: CanonicalStatement[];
  evidence: CanonicalEvidence[];
  revision_id: RevisionId;
  model_run_id: ModelRunId;
  created_at: StructuralInstant;
  objective: SemanticText;
}

export interface ApplyProposalInput {
  parent: LedgerV3Case;
  prepared: PreparedLedgerIntake;
  proposal: ProviderProposal;
}

interface ChangeRecord {
  reason: SemanticText;
  sourceIds: SourceId[];
}

type EntityType = 'event' | 'claim' | 'gap' | 'action' | 'inspection';

export class ProposalApplicationError extends Error {
  readonly code = 'PROPOSAL_APPLICATION_REJECTED';

  constructor(message: string) {
    super(message);
    this.name = 'ProposalApplicationError';
  }
}

function entityKey(entityType: EntityType, id: string): string {
  return entityType + ':' + id;
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function canonicalizeSources(
  requested: readonly SourceId[],
  canonicalOrder: readonly SourceId[]
): SourceId[] {
  const requestedSet = new Set<string>();
  for (const sourceId of requested) {
    if (requestedSet.has(sourceId)) {
      throw new Error('Duplicate source ID in deterministic application: ' + sourceId);
    }
    requestedSet.add(sourceId);
  }

  const available = new Set<string>(canonicalOrder);
  for (const sourceId of requested) {
    if (!available.has(sourceId)) {
      throw new Error('Source is unavailable in candidate revision: ' + sourceId);
    }
  }

  return canonicalOrder.filter((sourceId) => requestedSet.has(sourceId));
}

function applyValidatedProposal(input: ApplyProposalInput): LedgerV3Case {
  const parent = parseLedgerV3(structuredClone(input.parent));
  const prepared = input.prepared;
  const allocator = createLedgerIdAllocator(parent);
  const previousRevision = parent.current_revision_id === null
    ? null
    : parent.revisions.find((revision) => revision.id === parent.current_revision_id) ?? null;

  if (parent.current_revision_id !== null && previousRevision === null) {
    throw new Error('Parent ledger head is missing');
  }

  const statements = [...parent.statements, ...prepared.statements];
  const evidence = [...parent.evidence, ...prepared.evidence];
  const canonicalSourceOrder: SourceId[] = [
    ...statements.map((statement) => statement.id),
    ...evidence.map((item) => item.id),
  ];
  const availableSourceIds = new Set<string>(canonicalSourceOrder);

  const events: Event[] = structuredClone(previousRevision?.events ?? []);
  let claims: Claim[] = structuredClone(previousRevision?.claims ?? []);
  const gaps: Gap[] = structuredClone(previousRevision?.gaps ?? []);
  const actions: Action[] = structuredClone(previousRevision?.actions ?? []);
  let inspections: EvidenceInspection[] = structuredClone(previousRevision?.inspections ?? []);
  const reservedInspectionIds = new Map<EvidenceId, InspectionId>();
  for (const item of prepared.evidence) {
    const existing = inspections.find((inspection) => inspection.evidence_id === item.id);
    if (existing === undefined) reservedInspectionIds.set(item.id, allocator.nextInspectionId());
  }

  const claimRefs = new Map<string, Claim['id']>();
  const gapRefs = new Map<string, Gap['id']>();
  const actionRefs = new Map<string, Action['id']>();
  const newRelationships: AcceptedRelationship[] = [];
  const changes = new Map<string, ChangeRecord>();

  const recordChange = (
    entityType: EntityType,
    id: string,
    reason: SemanticText,
    sourceIds: readonly SourceId[]
  ) => {
    const key = entityKey(entityType, id);
    const previous = changes.get(key);
    const combined = previous === undefined
      ? [...sourceIds]
      : [...previous.sourceIds, ...sourceIds.filter((sourceId) => !previous.sourceIds.includes(sourceId))];
    changes.set(key, {
      reason,
      sourceIds: canonicalizeSources(combined, canonicalSourceOrder),
    });
  };

  const resolveClaim = (reference: Claim['id'] | ClaimLocalRef): Claim['id'] => {
    if (reference.startsWith('new_claim_')) {
      const resolved = claimRefs.get(reference);
      if (resolved === undefined) throw new Error('Unknown local claim reference: ' + reference);
      return resolved;
    }
    return ClaimIdSchema.parse(reference);
  };

  const resolveGap = (reference: Gap['id'] | GapLocalRef): Gap['id'] => {
    if (reference.startsWith('new_gap_')) {
      const resolved = gapRefs.get(reference);
      if (resolved === undefined) throw new Error('Unknown local gap reference: ' + reference);
      return resolved;
    }
    return GapIdSchema.parse(reference);
  };

  for (const operation of input.proposal.operations) {
    switch (operation.operation_type) {
      case 'add_event': {
        const id = allocator.nextEventId();
        events.push({
          id,
          domain_time: operation.domain_time,
          actor: operation.actor,
          action: operation.action,
          target: operation.target,
          effect: operation.effect,
          source_support_ids: canonicalizeSources(operation.source_basis_ids, canonicalSourceOrder),
          finding_ids: operation.finding_refs.map(resolveClaim),
          assessment: operation.assessment,
        });
        recordChange('event', id, operation.reason, operation.source_basis_ids);
        break;
      }
      case 'update_event': {
        const index = events.findIndex((event) => event.id === operation.target_id);
        if (index < 0) throw new Error('Event update target not found: ' + operation.target_id);
        const current = events[index];
        events[index] = {
          ...current,
          ...(operation.domain_time === undefined ? {} : { domain_time: operation.domain_time }),
          ...(operation.actor === undefined ? {} : { actor: operation.actor }),
          ...(operation.action === undefined ? {} : { action: operation.action }),
          ...(operation.target === undefined ? {} : { target: operation.target }),
          ...(operation.effect === undefined ? {} : { effect: operation.effect }),
          ...(operation.assessment === undefined ? {} : { assessment: operation.assessment }),
          ...(operation.finding_refs === undefined
            ? {}
            : { finding_ids: operation.finding_refs.map(resolveClaim) }),
          source_support_ids: canonicalizeSources(
            [...current.source_support_ids, ...operation.source_basis_ids],
            canonicalSourceOrder
          ),
        };
        recordChange('event', current.id, operation.reason, operation.source_basis_ids);
        break;
      }
      case 'add_claim': {
        const id = allocator.nextClaimId();
        claimRefs.set(operation.local_ref, id);
        claims.push({
          id,
          proposition: operation.proposition,
          actor: operation.actor,
          action: operation.action,
          target: operation.target,
          domain_time: operation.domain_time,
          assessment: operation.assessment,
          reasoning: operation.reasoning,
          scope: operation.scope,
          limits: [...operation.limits],
          supporting_source_ids: [],
          qualifying_source_ids: [],
          conflicting_source_ids: [],
        });
        recordChange('claim', id, operation.reason, operation.source_basis_ids);
        break;
      }
      case 'update_claim': {
        const index = claims.findIndex((claim) => claim.id === operation.target_id);
        if (index < 0) throw new Error('Claim update target not found: ' + operation.target_id);
        const current = claims[index];
        claims[index] = {
          ...current,
          ...(operation.proposition === undefined ? {} : { proposition: operation.proposition }),
          ...(operation.actor === undefined ? {} : { actor: operation.actor }),
          ...(operation.action === undefined ? {} : { action: operation.action }),
          ...(operation.target === undefined ? {} : { target: operation.target }),
          ...(operation.domain_time === undefined ? {} : { domain_time: operation.domain_time }),
          ...(operation.assessment === undefined ? {} : { assessment: operation.assessment }),
          ...(operation.reasoning === undefined ? {} : { reasoning: operation.reasoning }),
          ...(operation.scope === undefined ? {} : { scope: operation.scope }),
          ...(operation.limits === undefined ? {} : { limits: [...operation.limits] }),
        };
        recordChange('claim', current.id, operation.reason, operation.source_basis_ids);
        break;
      }
      case 'add_gap': {
        const id = allocator.nextGapId();
        gapRefs.set(operation.local_ref, id);
        gaps.push({
          id,
          question: operation.question,
          relevance: operation.relevance,
          resolving_evidence: operation.resolving_evidence,
          acquisition_guidance: operation.acquisition_guidance,
          collection_boundary: operation.collection_boundary,
          target_claim_ids: operation.target_claim_refs.map(resolveClaim),
          status: 'open',
          transition: null,
        });
        recordChange('gap', id, operation.reason, operation.source_basis_ids);
        break;
      }
      case 'update_gap': {
        const index = gaps.findIndex((gap) => gap.id === operation.target_id);
        if (index < 0) throw new Error('Gap update target not found: ' + operation.target_id);
        const current = gaps[index];
        gaps[index] = {
          ...current,
          ...(operation.question === undefined ? {} : { question: operation.question }),
          ...(operation.relevance === undefined ? {} : { relevance: operation.relevance }),
          ...(operation.resolving_evidence === undefined ? {} : { resolving_evidence: operation.resolving_evidence }),
          ...(operation.acquisition_guidance === undefined ? {} : { acquisition_guidance: operation.acquisition_guidance }),
          ...(operation.collection_boundary === undefined ? {} : { collection_boundary: operation.collection_boundary }),
          ...(operation.target_claim_refs === undefined
            ? {}
            : { target_claim_ids: operation.target_claim_refs.map(resolveClaim) }),
        };
        recordChange('gap', current.id, operation.reason, operation.source_basis_ids);
        break;
      }
      case 'transition_gap': {
        const index = gaps.findIndex((gap) => gap.id === operation.target_ref);
        if (index < 0) throw new Error('Gap transition target not found: ' + operation.target_ref);
        const current = gaps[index];
        gaps[index] = {
          ...current,
          status: operation.resulting_status,
          transition: {
            previous_status: current.status,
            resulting_status: operation.resulting_status,
            transition_revision_id: prepared.revision_id,
            reason: operation.reason,
            supporting_source_ids: canonicalizeSources(operation.source_basis_ids, canonicalSourceOrder),
          },
        };
        recordChange('gap', current.id, operation.reason, operation.source_basis_ids);
        break;
      }
      case 'add_action': {
        const id = allocator.nextActionId();
        actionRefs.set(operation.local_ref, id);
        actions.push({
          id,
          title: operation.title,
          description: operation.description,
          target_gap_ids: operation.target_gap_refs.map(resolveGap),
          priority: operation.priority,
          status: 'pending',
          transition: null,
        });
        recordChange('action', id, operation.reason, operation.source_basis_ids);
        break;
      }
      case 'update_action': {
        const index = actions.findIndex((action) => action.id === operation.target_id);
        if (index < 0) throw new Error('Action update target not found: ' + operation.target_id);
        const current = actions[index];
        actions[index] = {
          ...current,
          ...(operation.title === undefined ? {} : { title: operation.title }),
          ...(operation.description === undefined ? {} : { description: operation.description }),
          ...(operation.priority === undefined ? {} : { priority: operation.priority }),
          ...(operation.target_gap_refs === undefined
            ? {}
            : { target_gap_ids: operation.target_gap_refs.map(resolveGap) }),
        };
        recordChange('action', current.id, operation.reason, operation.source_basis_ids);
        break;
      }
      case 'transition_action': {
        const index = actions.findIndex((action) => action.id === operation.target_ref);
        if (index < 0) throw new Error('Action transition target not found: ' + operation.target_ref);
        const current = actions[index];
        actions[index] = {
          ...current,
          status: operation.resulting_status,
          transition: {
            previous_status: current.status,
            resulting_status: operation.resulting_status,
            transition_revision_id: prepared.revision_id,
            reason: operation.reason,
            supporting_source_ids: canonicalizeSources(operation.source_basis_ids, canonicalSourceOrder),
          },
        };
        recordChange('action', current.id, operation.reason, operation.source_basis_ids);
        break;
      }
      case 'inspect_source': {
        const evidenceItem = evidence.find((item) => item.id === operation.evidence_id);
        if (evidenceItem?.acquisition_method === 'authoritative_web_retrieval') {
          throw new Error('Authoritative web evidence inspection is server-owned: ' + operation.evidence_id);
        }
        const index = inspections.findIndex((inspection) => inspection.evidence_id === operation.evidence_id);
        const inspection: EvidenceInspection = {
          id: index < 0
            ? reservedInspectionIds.get(operation.evidence_id) ?? allocator.nextInspectionId()
            : inspections[index].id,
          evidence_id: operation.evidence_id,
          source_attribution: operation.source_attribution,
          case_object_match: operation.case_object_match,
          match_status: operation.match_status,
          completeness_context: operation.completeness_context,
          integrity_signals: operation.integrity_signals,
          limitations: [...operation.limitations],
        };
        if (index < 0) inspections.push(inspection);
        else inspections[index] = inspection;
        recordChange('inspection', inspection.id, operation.reason, [operation.evidence_id]);
        break;
      }
      case 'disposition_source': {
        if (!availableSourceIds.has(operation.source_id)) {
          throw new Error('Disposition source unavailable: ' + operation.source_id);
        }
        const id = allocator.nextRelationshipId();
        if (
          operation.relationship_type === 'supports_claim' ||
          operation.relationship_type === 'qualifies_claim' ||
          operation.relationship_type === 'conflicts_with_claim'
        ) {
          newRelationships.push({
            id,
            relationship_type: operation.relationship_type,
            source_id: operation.source_id,
            target_id: resolveClaim(operation.target_ref),
            reason: operation.reason,
            created_in_revision_id: prepared.revision_id,
          });
        } else if (operation.relationship_type === 'raises_gap') {
          newRelationships.push({
            id,
            relationship_type: 'raises_gap',
            source_id: operation.source_id,
            target_id: resolveGap(operation.target_ref),
            reason: operation.reason,
            created_in_revision_id: prepared.revision_id,
          });
        } else if (operation.relationship_type === 'corrects_statement') {
          newRelationships.push({
            id,
            relationship_type: 'corrects_statement',
            source_id: operation.source_id,
            target_id: operation.target_ref,
            reason: operation.reason,
            created_in_revision_id: prepared.revision_id,
          });
        } else {
          newRelationships.push({
            id,
            relationship_type: 'not_yet_classified',
            source_id: operation.source_id,
            target_id: null,
            reason: operation.reason,
            created_in_revision_id: prepared.revision_id,
          });
        }
        break;
      }
    }
  }

  for (const item of prepared.evidence) {
    if (item.acquisition_method !== 'authoritative_web_retrieval') continue;
    if (inspections.some((inspection) => inspection.evidence_id === item.id)) {
      throw new Error('Authoritative web evidence received a provider-authored inspection: ' + item.id);
    }
    const provenance = item.web_provenance;
    if (provenance === undefined) {
      throw new Error('Authoritative web evidence is missing server provenance: ' + item.id);
    }
    const inspection: EvidenceInspection = {
      id: reservedInspectionIds.get(item.id) ?? allocator.nextInspectionId(),
      evidence_id: item.id,
      source_attribution: SemanticTextSchema.parse(
        `${provenance.publisher} — ${provenance.page_title} (${provenance.source_url})`
      ),
      case_object_match: SemanticTextSchema.parse(
        `Authority is limited to this public scope: ${provenance.authority_scope}`
      ),
      match_status: 'not_assessed',
      completeness_context: SemanticTextSchema.parse(
        'The ledger preserves the admitted source excerpt and provenance, not a full webpage snapshot.'
      ),
      integrity_signals: SemanticTextSchema.parse(
        'The source URL was returned by Google Search grounding and passed server-owned HTTPS, domain-authority, and source-class admission.'
      ),
      limitations: [
        SemanticTextSchema.parse('The excerpt supports only its stated authority scope and retrieval time.'),
        SemanticTextSchema.parse('It does not verify a private account, transaction, identity, eligibility decision, or physical object.'),
      ],
    };
    inspections.push(inspection);
    recordChange(
      'inspection',
      inspection.id,
      SemanticTextSchema.parse('Recorded a server-admitted authoritative web excerpt.'),
      [item.id]
    );
  }

  const uncoveredOpenGaps = gaps.filter((gap) =>
    gap.status === 'open' && !actions.some((action) =>
      action.target_gap_ids.includes(gap.id) &&
      (action.status === 'pending' || action.status === 'in_progress')
    )
  );
  if (uncoveredOpenGaps.length > 0) {
    throw new Error(
      `Every open gap requires a pending or in-progress action: ${uncoveredOpenGaps.map((gap) => gap.id).join(', ')}`
    );
  }

  const introducedSources: SourceId[] = [
    ...prepared.statements.map((statement) => statement.id),
    ...prepared.evidence.map((item) => item.id),
  ];
  for (const sourceId of introducedSources) {
    if (!newRelationships.some((relationship) => relationship.source_id === sourceId)) {
      throw new Error('Every introduced source requires an explicit disposition: ' + sourceId);
    }
  }

  for (const item of prepared.evidence) {
    if (item.acquisition_method !== 'authoritative_web_retrieval') continue;
    const dispositions = newRelationships.filter((relationship) => relationship.source_id === item.id);
    if (!dispositions.some((relationship) =>
      relationship.relationship_type === 'supports_claim' ||
      relationship.relationship_type === 'qualifies_claim' ||
      relationship.relationship_type === 'conflicts_with_claim'
    )) {
      throw new Error('Authoritative web evidence must be admitted against a bounded claim: ' + item.id);
    }
  }

  for (const item of prepared.evidence) {
    if (!inspections.some((inspection) => inspection.evidence_id === item.id)) {
      throw new Error('Every introduced evidence item requires an inspection: ' + item.id);
    }
  }

  const allRelationships = [...parent.relationships, ...newRelationships];
  const revisionOrder = new Map<string, number>();
  parent.revisions.forEach((revision, index) => revisionOrder.set(revision.id, index));
  revisionOrder.set(prepared.revision_id, parent.revisions.length);

  const effectiveRelationships = new Map<string, AcceptedRelationship[]>();
  for (const sourceId of canonicalSourceOrder) {
    const relationships = allRelationships.filter((relationship) => relationship.source_id === sourceId);
    let highestRevision = -1;
    for (const relationship of relationships) {
      highestRevision = Math.max(highestRevision, revisionOrder.get(relationship.created_in_revision_id) ?? -1);
    }
    effectiveRelationships.set(
      sourceId,
      relationships.filter(
        (relationship) => revisionOrder.get(relationship.created_in_revision_id) === highestRevision
      )
    );
  }

  claims = claims.map((claim) => {
    const supporting = canonicalSourceOrder.filter((sourceId) =>
      (effectiveRelationships.get(sourceId) ?? []).some(
        (relationship) =>
          relationship.relationship_type === 'supports_claim' &&
          relationship.target_id === claim.id
      )
    );
    const qualifying = canonicalSourceOrder.filter((sourceId) =>
      (effectiveRelationships.get(sourceId) ?? []).some(
        (relationship) =>
          relationship.relationship_type === 'qualifies_claim' &&
          relationship.target_id === claim.id
      )
    );
    const conflicting = canonicalSourceOrder.filter((sourceId) =>
      (effectiveRelationships.get(sourceId) ?? []).some(
        (relationship) =>
          relationship.relationship_type === 'conflicts_with_claim' &&
          relationship.target_id === claim.id
      )
    );
    const nextClaim: Claim = {
      ...claim,
      supporting_source_ids: supporting,
      qualifying_source_ids: qualifying,
      conflicting_source_ids: conflicting,
    };

    if (!sameValue(claim, nextClaim) && !changes.has(entityKey('claim', claim.id))) {
      const affecting = newRelationships.filter(
        (relationship) =>
          relationship.source_id !== null &&
          (
            relationship.relationship_type === 'supports_claim' ||
            relationship.relationship_type === 'qualifies_claim' ||
            relationship.relationship_type === 'conflicts_with_claim' ||
            relationship.relationship_type === 'not_yet_classified' ||
            relationship.relationship_type === 'raises_gap'
          )
      );
      const sourceIds = canonicalSourceOrder.filter((sourceId) =>
        affecting.some((relationship) => relationship.source_id === sourceId)
      );
      if (sourceIds.length === 0) {
        throw new Error('Claim source categories changed without a traceable disposition');
      }
      recordChange(
        'claim',
        claim.id,
        'Source disposition updated claim support' as SemanticText,
        sourceIds
      );
    }
    return nextClaim;
  });

  const inspectionByEvidence = new Map(inspections.map((inspection) => [inspection.evidence_id, inspection]));
  inspections = evidence.map((item) => {
    const inspection = inspectionByEvidence.get(item.id);
    if (inspection === undefined) {
      throw new Error('Inspection coverage missing for evidence: ' + item.id);
    }
    return inspection;
  });

  const deltaEntries: DeltaEntry[] = [];
  const intakeSourceIds = canonicalizeSources(introducedSources, canonicalSourceOrder);
  deltaEntries.push({
    entity_type: 'intake',
    entity_id: prepared.intake.id,
    operation: 'add',
    reason: 'Accepted intake' as SemanticText,
    source_ids: intakeSourceIds,
  });
  for (const statement of prepared.statements) {
    deltaEntries.push({
      entity_type: 'statement',
      entity_id: statement.id,
      operation: 'add',
      reason: 'Accepted source statement' as SemanticText,
      source_ids: [statement.id],
    });
  }
  for (const item of prepared.evidence) {
    deltaEntries.push({
      entity_type: 'evidence',
      entity_id: item.id,
      operation: 'add',
      reason: 'Accepted evidence source' as SemanticText,
      source_ids: [item.id],
    });
  }
  for (const relationship of newRelationships) {
    deltaEntries.push({
      entity_type: 'relationship',
      entity_id: relationship.id,
      operation: 'add',
      reason: relationship.reason,
      source_ids: [relationship.source_id],
    });
  }

  const previousEvents = previousRevision?.events ?? [];
  events.forEach((event, index) => {
    const previous = previousEvents[index];
    if (previous !== undefined && sameValue(previous, event)) return;
    const change = changes.get(entityKey('event', event.id));
    if (change === undefined) throw new Error('Missing event delta evidence: ' + event.id);
    deltaEntries.push({
      entity_type: 'event',
      entity_id: event.id,
      operation: previous === undefined ? 'add' : 'update',
      reason: change.reason,
      source_ids: change.sourceIds,
    });
  });

  const previousClaims = previousRevision?.claims ?? [];
  claims.forEach((claim, index) => {
    const previous = previousClaims[index];
    if (previous !== undefined && sameValue(previous, claim)) return;
    const change = changes.get(entityKey('claim', claim.id));
    if (change === undefined) throw new Error('Missing claim delta evidence: ' + claim.id);
    deltaEntries.push({
      entity_type: 'claim',
      entity_id: claim.id,
      operation: previous === undefined ? 'add' : 'update',
      reason: change.reason,
      source_ids: change.sourceIds,
    });
  });

  const previousGaps = previousRevision?.gaps ?? [];
  gaps.forEach((gap, index) => {
    const previous = previousGaps[index];
    if (previous !== undefined && sameValue(previous, gap)) return;
    const change = changes.get(entityKey('gap', gap.id));
    if (change === undefined) throw new Error('Missing gap delta evidence: ' + gap.id);
    deltaEntries.push({
      entity_type: 'gap',
      entity_id: gap.id,
      operation: previous === undefined
        ? 'add'
        : previous.status === gap.status
          ? 'update'
          : 'transition',
      reason: change.reason,
      source_ids: change.sourceIds,
    });
  });

  const previousActions = previousRevision?.actions ?? [];
  actions.forEach((action, index) => {
    const previous = previousActions[index];
    if (previous !== undefined && sameValue(previous, action)) return;
    const change = changes.get(entityKey('action', action.id));
    if (change === undefined) throw new Error('Missing action delta evidence: ' + action.id);
    deltaEntries.push({
      entity_type: 'action',
      entity_id: action.id,
      operation: previous === undefined
        ? 'add'
        : previous.status === action.status
          ? 'update'
          : 'transition',
      reason: change.reason,
      source_ids: change.sourceIds,
    });
  });

  const previousInspections = previousRevision?.inspections ?? [];
  inspections.forEach((inspection, index) => {
    const previous = previousInspections[index];
    if (previous !== undefined && sameValue(previous, inspection)) return;
    const change = changes.get(entityKey('inspection', inspection.id));
    if (change === undefined) throw new Error('Missing inspection delta evidence: ' + inspection.id);
    deltaEntries.push({
      entity_type: 'inspection',
      entity_id: inspection.id,
      operation: previous === undefined ? 'add' : 'update',
      reason: change.reason,
      source_ids: change.sourceIds,
    });
  });

  const summary = {
    total_evidence_count: evidence.length,
    established_claims_count: claims.filter(
      (claim) => claim.assessment === 'Established within current record'
    ).length,
    unresolved_claims_count: claims.filter((claim) =>
      ['Reported', 'Corroborated', 'Contested'].includes(claim.assessment)
    ).length,
    conflicted_claims_count: claims.filter((claim) => claim.assessment === 'Contested').length,
    user_reported_claims_count: claims.filter((claim) => claim.assessment === 'Reported').length,
  };

  return parseLedgerV3({
    ...parent,
    current_revision_id: prepared.revision_id,
    intake_ledger: [...parent.intake_ledger, prepared.intake],
    statements,
    evidence,
    relationships: allRelationships,
    revisions: [
      ...parent.revisions,
      {
        id: prepared.revision_id,
        parent_id: parent.current_revision_id,
        created_at: prepared.created_at,
        objective: input.proposal.explanation.user_goal,
        explanation: input.proposal.explanation.text,
        assistant_message: input.proposal.explanation.text,
        accepted_model_run_id: prepared.model_run_id,
        triggering_intake_ids: [prepared.intake.id],
        input_statement_ids: statements.map((statement) => statement.id),
        input_evidence_ids: evidence.map((item) => item.id),
        events,
        claims,
        gaps,
        actions,
        inspections,
        delta: { entries: deltaEntries },
        summary,
      },
    ],
  });
}

export function applyProposal(input: ApplyProposalInput): LedgerV3Case {
  const parentBefore = JSON.stringify(input.parent);
  try {
    const result = applyValidatedProposal(input);
    if (JSON.stringify(input.parent) !== parentBefore) {
      throw new Error('Proposal application mutated the accepted parent');
    }
    return result;
  } catch (error: unknown) {
    if (error instanceof ProposalApplicationError) throw error;
    const message = error instanceof Error ? error.message : 'Unknown proposal application failure';
    throw new ProposalApplicationError(message);
  }
}
