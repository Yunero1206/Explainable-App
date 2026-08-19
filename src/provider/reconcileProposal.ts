import type {
  Action,
  ActionId,
  Claim,
  ClaimId,
  Event,
  EventId,
  Gap,
  GapId,
  LedgerV3Case,
} from '../ledger/types.js';
import type {
  ActionLocalRef,
  ClaimLocalRef,
  EventLocalRef,
  GapLocalRef,
  ProposalOperation,
  ProviderProposal,
} from './proposalTypes.js';

export interface ProposalReconciliationTrace {
  converted_adds_to_updates: number;
  canonical_refs_retargeted: number;
}

export interface ReconciledProposal {
  proposal: ProviderProposal;
  trace: ProposalReconciliationTrace;
}

export class ProposalReconciliationError extends Error {
  readonly code = 'AMBIGUOUS_ENTITY_CORRECTION';

  constructor(message: string) {
    super(message);
    this.name = 'ProposalReconciliationError';
  }
}

function normalized(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value: string): Set<string> {
  return new Set(normalized(value).split(' ').filter((token) => token.length >= 2));
}

function similarity(left: string, right: string): number {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  let intersection = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) intersection++;
  return intersection / (leftTokens.size + rightTokens.size - intersection);
}

export function isCorrectionIntent(message: string): boolean {
  return /(?:\bcorrect(?:ion|ed)?\b|\bupdate\b|\bchange\b|\bwrong\b|\bactually\b|\binstead\b|\bnot\s+.+\s+but\b|sửa|đính\s*chính|cập\s*nhật|nhầm|sai|thực\s*ra|không\s*phải|mà\s*là|ngày\s*đúng|corregir|correction|corriger|訂正|修正)/iu.test(message);
}

type EntityFamily = 'event' | 'claim' | 'gap' | 'action';

function explicitId(message: string, family: EntityFamily): string | null {
  const prefix = family === 'event' ? 'EV' : family === 'claim' ? 'C' : family === 'gap' ? 'G' : 'A';
  const matches = [...message.toUpperCase().matchAll(new RegExp(`\\b${prefix}[0-9]{2}\\b`, 'g'))].map((match) => match[0]);
  const unique = [...new Set(matches)];
  return unique.length === 1 ? unique[0] : null;
}

interface MatchCandidate<Id extends string> {
  id: Id;
  exactKey: string;
  comparisonText: string;
}

function selectTarget<Id extends string>(input: {
  family: EntityFamily;
  message: string;
  correction: boolean;
  proposedExactKey: string;
  proposedText: string;
  candidates: MatchCandidate<Id>[];
}): Id | null {
  const direct = explicitId(input.message, input.family);
  if (direct !== null) {
    const target = input.candidates.find((candidate) => candidate.id === direct);
    if (target !== undefined) return target.id;
  }

  const exact = input.candidates.filter((candidate) => candidate.exactKey === input.proposedExactKey);
  if (exact.length === 1) return exact[0].id;
  if (exact.length > 1) {
    throw new ProposalReconciliationError(`Multiple existing ${input.family} records match the proposed correction. Name the canonical ID to update.`);
  }
  if (!input.correction || input.candidates.length === 0) return null;
  if (input.candidates.length === 1) {
    return similarity(input.proposedText, input.candidates[0].comparisonText) >= 0.2
      ? input.candidates[0].id
      : null;
  }

  const ranked = input.candidates
    .map((candidate) => ({ candidate, score: similarity(input.proposedText, candidate.comparisonText) }))
    .sort((left, right) => right.score - left.score || left.candidate.id.localeCompare(right.candidate.id));
  const best = ranked[0];
  const second = ranked[1];
  if (best.score >= 0.34 && best.score - second.score >= 0.12) return best.candidate.id;
  if (best.score < 0.25) return null;

  throw new ProposalReconciliationError(
    `The correction could refer to more than one existing ${input.family}. Include one canonical ID (${input.candidates.map((candidate) => candidate.id).join(', ')}) and retry.`,
  );
}

function eventCandidate(event: Event): MatchCandidate<EventId> {
  return {
    id: event.id,
    exactKey: normalized([event.domain_time, event.actor, event.action, event.target].join(' | ')),
    comparisonText: [event.domain_time, event.actor, event.action, event.target, event.effect].join(' '),
  };
}

function claimCandidate(claim: Claim): MatchCandidate<ClaimId> {
  return {
    id: claim.id,
    exactKey: normalized(claim.proposition),
    comparisonText: [claim.proposition, claim.actor, claim.action, claim.target, claim.domain_time].join(' '),
  };
}

function gapCandidate(gap: Gap): MatchCandidate<GapId> {
  return {
    id: gap.id,
    exactKey: normalized(gap.question),
    comparisonText: [gap.question, gap.relevance, gap.resolving_evidence].join(' '),
  };
}

function actionCandidate(action: Action): MatchCandidate<ActionId> {
  return {
    id: action.id,
    exactKey: normalized(action.title),
    comparisonText: [action.title, action.description].join(' '),
  };
}

export function reconcileProposal(input: {
  ledger: LedgerV3Case;
  message: string;
  proposal: ProviderProposal;
}): ReconciledProposal {
  const head = input.ledger.current_revision_id === null
    ? null
    : input.ledger.revisions.find((revision) => revision.id === input.ledger.current_revision_id) ?? null;
  if (head === null) {
    return {
      proposal: input.proposal,
      trace: { converted_adds_to_updates: 0, canonical_refs_retargeted: 0 },
    };
  }

  const correction = input.proposal.reasoning?.turn_intent === 'correct' || isCorrectionIntent(input.message);
  const claimRefs = new Map<ClaimLocalRef, ClaimId>();
  const eventRefs = new Map<EventLocalRef, EventId>();
  const gapRefs = new Map<GapLocalRef, GapId>();
  const actionRefs = new Map<ActionLocalRef, ActionId>();
  let converted = 0;
  let retargeted = 0;

  const mapClaim = (ref: ClaimId | ClaimLocalRef): ClaimId | ClaimLocalRef => {
    if (!ref.startsWith('new_claim_')) return ref;
    const mapped = claimRefs.get(ref as ClaimLocalRef);
    if (mapped === undefined) return ref;
    retargeted++;
    return mapped;
  };
  const mapGap = (ref: GapId | GapLocalRef): GapId | GapLocalRef => {
    if (!ref.startsWith('new_gap_')) return ref;
    const mapped = gapRefs.get(ref as GapLocalRef);
    if (mapped === undefined) return ref;
    retargeted++;
    return mapped;
  };

  const claimPass: ProposalOperation[] = input.proposal.operations.map((operation) => {
    if (operation.operation_type !== 'add_claim') return operation;
    const targetId = selectTarget({
      family: 'claim',
      message: input.message,
      correction,
      proposedExactKey: normalized(operation.proposition),
      proposedText: [operation.proposition, operation.actor, operation.action, operation.target, operation.domain_time].join(' '),
      candidates: head.claims.map(claimCandidate),
    });
    if (targetId === null) return operation;
    claimRefs.set(operation.local_ref, targetId);
    converted++;
    return {
      operation_type: 'update_claim',
      target_id: targetId,
      proposition: operation.proposition,
      actor: operation.actor,
      action: operation.action,
      target: operation.target,
      domain_time: operation.domain_time,
      assessment: operation.assessment,
      reasoning: operation.reasoning,
      scope: operation.scope,
      limits: [...operation.limits],
      source_basis_ids: [...operation.source_basis_ids],
      reason: operation.reason,
    };
  });

  const eventPass: ProposalOperation[] = claimPass.map((operation) => {
    if (operation.operation_type !== 'add_event') return operation;
    const targetId = selectTarget({
      family: 'event',
      message: input.message,
      correction,
      proposedExactKey: normalized([operation.domain_time, operation.actor, operation.action, operation.target].join(' | ')),
      proposedText: [operation.domain_time, operation.actor, operation.action, operation.target, operation.effect].join(' '),
      candidates: head.events.map(eventCandidate),
    });
    if (targetId === null) return { ...operation, finding_refs: operation.finding_refs.map(mapClaim) };
    eventRefs.set(operation.local_ref, targetId);
    converted++;
    return {
      operation_type: 'update_event',
      target_id: targetId,
      domain_time: operation.domain_time,
      actor: operation.actor,
      action: operation.action,
      target: operation.target,
      effect: operation.effect,
      assessment: operation.assessment,
      finding_refs: operation.finding_refs.map(mapClaim),
      source_basis_ids: [...operation.source_basis_ids],
      reason: operation.reason,
    };
  });

  const gapPass: ProposalOperation[] = eventPass.map((operation) => {
    if (operation.operation_type !== 'add_gap') return operation;
    const targetId = selectTarget({
      family: 'gap',
      message: input.message,
      correction,
      proposedExactKey: normalized(operation.question),
      proposedText: [operation.question, operation.relevance, operation.resolving_evidence].join(' '),
      candidates: head.gaps.map(gapCandidate),
    });
    if (targetId === null) return { ...operation, target_claim_refs: operation.target_claim_refs.map(mapClaim) };
    gapRefs.set(operation.local_ref, targetId);
    converted++;
    return {
      operation_type: 'update_gap',
      target_id: targetId,
      question: operation.question,
      relevance: operation.relevance,
      resolving_evidence: operation.resolving_evidence,
      acquisition_guidance: operation.acquisition_guidance,
      collection_boundary: operation.collection_boundary,
      target_claim_refs: operation.target_claim_refs.map(mapClaim),
      source_basis_ids: [...operation.source_basis_ids],
      reason: operation.reason,
    };
  });

  const actionPass: ProposalOperation[] = gapPass.map((operation) => {
    if (operation.operation_type !== 'add_action') return operation;
    const targetId = selectTarget({
      family: 'action',
      message: input.message,
      correction,
      proposedExactKey: normalized(operation.title),
      proposedText: [operation.title, operation.description].join(' '),
      candidates: head.actions.map(actionCandidate),
    });
    if (targetId === null) return { ...operation, target_gap_refs: operation.target_gap_refs.map(mapGap) };
    actionRefs.set(operation.local_ref, targetId);
    converted++;
    return {
      operation_type: 'update_action',
      target_id: targetId,
      title: operation.title,
      description: operation.description,
      priority: operation.priority,
      target_gap_refs: operation.target_gap_refs.map(mapGap),
      source_basis_ids: [...operation.source_basis_ids],
      reason: operation.reason,
    };
  });

  const operations = actionPass.map((operation): ProposalOperation => {
    if (operation.operation_type === 'add_event' || operation.operation_type === 'update_event') {
      const mapped = operation.finding_refs?.map(mapClaim);
      return { ...operation, finding_refs: mapped === undefined ? undefined : [...new Set(mapped)] } as ProposalOperation;
    }
    if (operation.operation_type === 'add_gap' || operation.operation_type === 'update_gap') {
      const mapped = operation.target_claim_refs?.map(mapClaim);
      return { ...operation, target_claim_refs: mapped === undefined ? undefined : [...new Set(mapped)] } as ProposalOperation;
    }
    if (operation.operation_type === 'add_action' || operation.operation_type === 'update_action') {
      const mapped = operation.target_gap_refs?.map(mapGap);
      return { ...operation, target_gap_refs: mapped === undefined ? undefined : [...new Set(mapped)] } as ProposalOperation;
    }
    if (operation.operation_type === 'disposition_source' && operation.target_ref !== null) {
      if (operation.relationship_type === 'supports_claim' || operation.relationship_type === 'qualifies_claim' || operation.relationship_type === 'conflicts_with_claim') {
        return { ...operation, target_ref: mapClaim(operation.target_ref) };
      }
      if (operation.relationship_type === 'raises_gap') {
        return { ...operation, target_ref: mapGap(operation.target_ref) };
      }
    }
    return operation;
  });

  const reasoning = input.proposal.reasoning === undefined ? undefined : {
    ...input.proposal.reasoning,
    steps: input.proposal.reasoning.steps.map((step) => ({
      ...step,
      claim_refs: [...new Set(step.claim_refs.map(mapClaim))],
      gap_refs: [...new Set(step.gap_refs.map(mapGap))],
    })),
  };

  // Event and action refs are currently declaration identities only; keeping
  // these maps explicit prevents a future reference-bearing operation from
  // silently bypassing reconciliation.
  void eventRefs;
  void actionRefs;

  return {
    proposal: {
      ...input.proposal,
      ...(reasoning === undefined ? {} : { reasoning }),
      operations,
    },
    trace: {
      converted_adds_to_updates: converted,
      canonical_refs_retargeted: retargeted,
    },
  };
}
