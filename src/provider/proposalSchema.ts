import { z } from 'zod';
import type * as T from '../ledger/types';
import type * as P from './proposalTypes';
import {
  StatementIdSchema,
  EvidenceIdSchema,
  EventIdSchema,
  ClaimIdSchema,
  GapIdSchema,
  ActionIdSchema,
  DomainTimeTextSchema,
  SemanticTextSchema,
  PrioritySchema,
  AssessmentStateSchema,
  EvidenceMatchStatusSchema,
} from '../ledger/schema';

// Local references for new entities by family
export const EventLocalRefSchema = z.string().regex(/^new_event_[1-9][0-9]*$/).transform(v => v as P.EventLocalRef);
export const ClaimLocalRefSchema = z.string().regex(/^new_claim_[1-9][0-9]*$/).transform(v => v as P.ClaimLocalRef);
export const GapLocalRefSchema = z.string().regex(/^new_gap_[1-9][0-9]*$/).transform(v => v as P.GapLocalRef);
export const ActionLocalRefSchema = z.string().regex(/^new_action_[1-9][0-9]*$/).transform(v => v as P.ActionLocalRef);

const SourceIdSchema = z.union([StatementIdSchema, EvidenceIdSchema]);

const AssistantExplanationSchema = z.object({
  text: SemanticTextSchema,
}).strict();

// Disposition variants
const DispositionSupportsClaimSchema = z.object({
  operation_type: z.literal('disposition_source'),
  relationship_type: z.enum(['supports_claim', 'qualifies_claim', 'conflicts_with_claim']),
  source_id: SourceIdSchema,
  target_ref: z.union([ClaimIdSchema, ClaimLocalRefSchema]),
  reason: SemanticTextSchema,
}).strict();

const DispositionRaisesGapSchema = z.object({
  operation_type: z.literal('disposition_source'),
  relationship_type: z.literal('raises_gap'),
  source_id: SourceIdSchema,
  target_ref: z.union([GapIdSchema, GapLocalRefSchema]),
  reason: SemanticTextSchema,
}).strict();

const DispositionCorrectsStatementSchema = z.object({
  operation_type: z.literal('disposition_source'),
  relationship_type: z.literal('corrects_statement'),
  source_id: StatementIdSchema,
  target_ref: StatementIdSchema,
  reason: SemanticTextSchema,
}).strict();

const DispositionNotYetClassifiedSchema = z.object({
  operation_type: z.literal('disposition_source'),
  relationship_type: z.literal('not_yet_classified'),
  source_id: SourceIdSchema,
  target_ref: z.null(),
  reason: SemanticTextSchema,
}).strict();

const EvidenceInspectionSchema = z.object({
  operation_type: z.literal('inspect_source'),
  evidence_id: EvidenceIdSchema,
  source_attribution: SemanticTextSchema,
  case_object_match: SemanticTextSchema,
  match_status: EvidenceMatchStatusSchema,
  completeness_context: SemanticTextSchema,
  integrity_signals: SemanticTextSchema,
  limitations: z.array(SemanticTextSchema).refine((arr) => new Set(arr).size === arr.length, 'Duplicate items'),
  reason: SemanticTextSchema,
}).strict();

const AddEventOperationSchema = z.object({
  operation_type: z.literal('add_event'),
  local_ref: EventLocalRefSchema,
  domain_time: DomainTimeTextSchema,
  actor: SemanticTextSchema,
  action: SemanticTextSchema,
  target: SemanticTextSchema,
  effect: SemanticTextSchema,
  assessment: AssessmentStateSchema,
  source_basis_ids: z.array(SourceIdSchema).min(1).refine((arr) => new Set(arr).size === arr.length, 'Duplicate items'),
  reason: SemanticTextSchema,
}).strict();

const UpdateEventOperationSchema = z.object({
  operation_type: z.literal('update_event'),
  target_id: EventIdSchema,
  domain_time: DomainTimeTextSchema.optional(),
  actor: SemanticTextSchema.optional(),
  action: SemanticTextSchema.optional(),
  target: SemanticTextSchema.optional(),
  effect: SemanticTextSchema.optional(),
  assessment: AssessmentStateSchema.optional(),
  source_basis_ids: z.array(SourceIdSchema).min(1).refine((arr) => new Set(arr).size === arr.length, 'Duplicate items'),
  reason: SemanticTextSchema,
}).strict().superRefine((val, ctx) => {
  if (val.domain_time === undefined && val.actor === undefined && val.action === undefined && val.target === undefined && val.effect === undefined && val.assessment === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Update operation must contain at least one actual mutable-field change.' });
  }
});

const AddClaimOperationSchema = z.object({
  operation_type: z.literal('add_claim'),
  local_ref: ClaimLocalRefSchema,
  proposition: SemanticTextSchema,
  actor: SemanticTextSchema,
  action: SemanticTextSchema,
  target: SemanticTextSchema,
  domain_time: DomainTimeTextSchema,
  assessment: AssessmentStateSchema,
  reasoning: SemanticTextSchema,
  scope: SemanticTextSchema,
  limits: z.array(SemanticTextSchema).refine((arr) => new Set(arr).size === arr.length, 'Duplicate items'),
  source_basis_ids: z.array(SourceIdSchema).min(1).refine((arr) => new Set(arr).size === arr.length, 'Duplicate items'),
  reason: SemanticTextSchema,
}).strict();

const UpdateClaimOperationSchema = z.object({
  operation_type: z.literal('update_claim'),
  target_id: ClaimIdSchema,
  proposition: SemanticTextSchema.optional(),
  actor: SemanticTextSchema.optional(),
  action: SemanticTextSchema.optional(),
  target: SemanticTextSchema.optional(),
  domain_time: DomainTimeTextSchema.optional(),
  assessment: AssessmentStateSchema.optional(),
  reasoning: SemanticTextSchema.optional(),
  scope: SemanticTextSchema.optional(),
  limits: z.array(SemanticTextSchema).refine((arr) => new Set(arr).size === arr.length, 'Duplicate items').optional(),
  source_basis_ids: z.array(SourceIdSchema).min(1).refine((arr) => new Set(arr).size === arr.length, 'Duplicate items'),
  reason: SemanticTextSchema,
}).strict().superRefine((val, ctx) => {
  if (val.proposition === undefined && val.actor === undefined && val.action === undefined && val.target === undefined && val.domain_time === undefined && val.assessment === undefined && val.reasoning === undefined && val.scope === undefined && val.limits === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Update operation must contain at least one actual mutable-field change.' });
  }
});

const AddGapOperationSchema = z.object({
  operation_type: z.literal('add_gap'),
  local_ref: GapLocalRefSchema,
  question: SemanticTextSchema,
  relevance: SemanticTextSchema,
  resolving_evidence: SemanticTextSchema,
  acquisition_guidance: SemanticTextSchema,
  collection_boundary: SemanticTextSchema,
  target_claim_refs: z.array(z.union([ClaimIdSchema, ClaimLocalRefSchema])).min(1).refine((arr) => new Set(arr).size === arr.length, 'Duplicate items'),
  source_basis_ids: z.array(SourceIdSchema).min(1).refine((arr) => new Set(arr).size === arr.length, 'Duplicate items'),
  reason: SemanticTextSchema,
}).strict();

const UpdateGapOperationSchema = z.object({
  operation_type: z.literal('update_gap'),
  target_id: GapIdSchema,
  question: SemanticTextSchema.optional(),
  relevance: SemanticTextSchema.optional(),
  resolving_evidence: SemanticTextSchema.optional(),
  acquisition_guidance: SemanticTextSchema.optional(),
  collection_boundary: SemanticTextSchema.optional(),
  target_claim_refs: z.array(z.union([ClaimIdSchema, ClaimLocalRefSchema])).min(1).refine((arr) => new Set(arr).size === arr.length, 'Duplicate items').optional(),
  source_basis_ids: z.array(SourceIdSchema).min(1).refine((arr) => new Set(arr).size === arr.length, 'Duplicate items'),
  reason: SemanticTextSchema,
}).strict().superRefine((val, ctx) => {
  if (val.question === undefined && val.relevance === undefined && val.resolving_evidence === undefined && val.acquisition_guidance === undefined && val.collection_boundary === undefined && val.target_claim_refs === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Update operation must contain at least one actual mutable-field change.' });
  }
});

const TransitionGapOperationSchema = z.object({
  operation_type: z.literal('transition_gap'),
  target_ref: GapIdSchema, // canonical only
  resulting_status: z.enum(['resolved', 'superseded', 'unavailable', 'no_longer_material']),
  source_basis_ids: z.array(SourceIdSchema).min(1).refine((arr) => new Set(arr).size === arr.length, 'Duplicate items'),
  reason: SemanticTextSchema,
}).strict();

const AddActionOperationSchema = z.object({
  operation_type: z.literal('add_action'),
  local_ref: ActionLocalRefSchema,
  title: SemanticTextSchema,
  description: SemanticTextSchema,
  priority: PrioritySchema,
  target_gap_refs: z.array(z.union([GapIdSchema, GapLocalRefSchema])).min(1).refine((arr) => new Set(arr).size === arr.length, 'Duplicate items'),
  source_basis_ids: z.array(SourceIdSchema).min(1).refine((arr) => new Set(arr).size === arr.length, 'Duplicate items'),
  reason: SemanticTextSchema,
}).strict();

const UpdateActionOperationSchema = z.object({
  operation_type: z.literal('update_action'),
  target_id: ActionIdSchema,
  title: SemanticTextSchema.optional(),
  description: SemanticTextSchema.optional(),
  priority: PrioritySchema.optional(),
  target_gap_refs: z.array(z.union([GapIdSchema, GapLocalRefSchema])).min(1).refine((arr) => new Set(arr).size === arr.length, 'Duplicate items').optional(),
  source_basis_ids: z.array(SourceIdSchema).min(1).refine((arr) => new Set(arr).size === arr.length, 'Duplicate items'),
  reason: SemanticTextSchema,
}).strict().superRefine((val, ctx) => {
  if (val.title === undefined && val.description === undefined && val.priority === undefined && val.target_gap_refs === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Update operation must contain at least one actual mutable-field change.' });
  }
});

const TransitionActionOperationSchema = z.object({
  operation_type: z.literal('transition_action'),
  target_ref: ActionIdSchema, // canonical only
  resulting_status: z.enum(['in_progress', 'completed', 'cancelled']),
  source_basis_ids: z.array(SourceIdSchema).min(1).refine((arr) => new Set(arr).size === arr.length, 'Duplicate items'),
  reason: SemanticTextSchema,
}).strict();

export const ProposalOperationSchema = z.union([
  DispositionSupportsClaimSchema,
  DispositionRaisesGapSchema,
  DispositionCorrectsStatementSchema,
  DispositionNotYetClassifiedSchema,
  EvidenceInspectionSchema,
  AddEventOperationSchema,
  UpdateEventOperationSchema,
  AddClaimOperationSchema,
  UpdateClaimOperationSchema,
  AddGapOperationSchema,
  UpdateGapOperationSchema,
  TransitionGapOperationSchema,
  AddActionOperationSchema,
  UpdateActionOperationSchema,
  TransitionActionOperationSchema,
]);

export const ProviderProposalSchema = z.object({
  explanation: AssistantExplanationSchema,
  operations: z.array(ProposalOperationSchema),
}).strict();

export interface ProposalValidationContext {
  availableSourceIds: Set<T.SourceId>;
  existingClaimIds: Set<T.ClaimId>;
  existingGapIds: Set<T.GapId>;
  existingEventIds: Set<T.EventId>;
  existingActionIds: Set<T.ActionId>;
}

export function parseProviderProposal(raw: unknown, ctx: ProposalValidationContext): P.ProviderProposal {
  // 1. Structural validation
  let parsed: z.infer<typeof ProviderProposalSchema>;
  try {
    parsed = ProviderProposalSchema.parse(raw);
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw new Error(`Proposal structural validation failed: ${err.message}`);
    }
    throw err;
  }

  // 2. Semantic validation
  const declaredLocalRefs = new Set<string>();
  const targetedNewClaims = new Set<string>();

  for (const op of parsed.operations) {
    // Check local ref uniqueness
    if (
      op.operation_type === 'add_event' ||
      op.operation_type === 'add_claim' ||
      op.operation_type === 'add_gap' ||
      op.operation_type === 'add_action'
    ) {
      if (declaredLocalRefs.has(op.local_ref)) {
        throw new Error(`Duplicate local reference declared: ${op.local_ref}`);
      }
      declaredLocalRefs.add(op.local_ref);
    }

    // Check source bases for duplicates and availability
    if ('source_basis_ids' in op) {
      const srcIds = (op as { source_basis_ids: T.SourceId[] }).source_basis_ids;
      if (srcIds) {
        const seen = new Set<string>();
        for (const src of srcIds) {
          if (!ctx.availableSourceIds.has(src)) throw new Error(`Unavailable source basis: ${src}`);
          if (seen.has(src)) throw new Error(`Duplicate source basis: ${src}`);
          seen.add(src);
        }
      }
    }

    if (op.operation_type === 'disposition_source') {
      if (!ctx.availableSourceIds.has(op.source_id)) {
        throw new Error(`Cannot disposition unavailable source: ${op.source_id}`);
      }
      if (op.target_ref !== null) {
        const ref = op.target_ref;
        if (ref.startsWith('new_')) {
          if (!declaredLocalRefs.has(ref)) {
            throw new Error(`Forward or undeclared local reference in disposition target: ${ref}`);
          }
          if (op.relationship_type === 'supports_claim' || op.relationship_type === 'qualifies_claim' || op.relationship_type === 'conflicts_with_claim') {
            targetedNewClaims.add(ref);
          }
        } else {
          if (op.relationship_type === 'supports_claim' || op.relationship_type === 'qualifies_claim' || op.relationship_type === 'conflicts_with_claim') {
            if (!ctx.existingClaimIds.has(ref as T.ClaimId)) throw new Error(`Disposition target claim not found: ${ref}`);
          } else if (op.relationship_type === 'raises_gap') {
            if (!ctx.existingGapIds.has(ref as T.GapId)) throw new Error(`Disposition target gap not found: ${ref}`);
          } else if (op.relationship_type === 'corrects_statement') {
            if (!ctx.availableSourceIds.has(ref as T.StatementId)) throw new Error(`Disposition target statement not found: ${ref}`);
          }
        }
      }
    }

    if (op.operation_type === 'inspect_source') {
      if (!ctx.availableSourceIds.has(op.evidence_id)) {
        throw new Error(`Cannot inspect unavailable source: ${op.evidence_id}`);
      }
    }

    if (op.operation_type === 'update_event') {
      if (!ctx.existingEventIds.has(op.target_id)) throw new Error(`Target event not found: ${op.target_id}`);
      const keys = Object.keys(op).filter(k => k !== 'operation_type' && k !== 'target_id' && k !== 'source_basis_ids' && k !== 'reason');
      if (keys.length === 0) throw new Error(`Update event must contain at least one mutation`);
    }
    if (op.operation_type === 'update_claim') {
      if (!ctx.existingClaimIds.has(op.target_id)) throw new Error(`Target claim not found: ${op.target_id}`);
      const keys = Object.keys(op).filter(k => k !== 'operation_type' && k !== 'target_id' && k !== 'source_basis_ids' && k !== 'reason');
      if (keys.length === 0) throw new Error(`Update claim must contain at least one mutation`);
    }
    if (op.operation_type === 'update_gap') {
      if (!ctx.existingGapIds.has(op.target_id)) throw new Error(`Target gap not found: ${op.target_id}`);
      const keys = Object.keys(op).filter(k => k !== 'operation_type' && k !== 'target_id' && k !== 'source_basis_ids' && k !== 'reason');
      if (keys.length === 0) throw new Error(`Update gap must contain at least one mutation`);
      if (op.target_claim_refs) {
        for (const ref of op.target_claim_refs) {
          if (ref.startsWith('new_')) {
            if (!declaredLocalRefs.has(ref)) throw new Error(`Forward or undeclared local reference in gap target_claim_refs: ${ref}`);
          } else {
            if (!ctx.existingClaimIds.has(ref as T.ClaimId)) throw new Error(`Target claim in gap update not found: ${ref}`);
          }
        }
      }
    }
    if (op.operation_type === 'update_action') {
      if (!ctx.existingActionIds.has(op.target_id)) throw new Error(`Target action not found: ${op.target_id}`);
      const keys = Object.keys(op).filter(k => k !== 'operation_type' && k !== 'target_id' && k !== 'source_basis_ids' && k !== 'reason');
      if (keys.length === 0) throw new Error(`Update action must contain at least one mutation`);
      if (op.target_gap_refs) {
        for (const ref of op.target_gap_refs) {
          if (ref.startsWith('new_')) {
            if (!declaredLocalRefs.has(ref)) throw new Error(`Forward or undeclared local reference in action target_gap_refs: ${ref}`);
          } else {
            if (!ctx.existingGapIds.has(ref as T.GapId)) throw new Error(`Target gap in action update not found: ${ref}`);
          }
        }
      }
    }

    if (op.operation_type === 'transition_gap') {
      if (!ctx.existingGapIds.has(op.target_ref)) throw new Error(`Target gap for transition not found: ${op.target_ref}`);
    }
    if (op.operation_type === 'transition_action') {
      if (!ctx.existingActionIds.has(op.target_ref)) throw new Error(`Target action for transition not found: ${op.target_ref}`);
    }

    if (op.operation_type === 'add_gap') {
      for (const ref of op.target_claim_refs) {
        if (ref.startsWith('new_')) {
          if (!declaredLocalRefs.has(ref)) throw new Error(`Forward or undeclared local reference in gap target_claim_refs: ${ref}`);
        } else {
          if (!ctx.existingClaimIds.has(ref as T.ClaimId)) throw new Error(`Target claim in gap addition not found: ${ref}`);
        }
      }
    }
    if (op.operation_type === 'add_action') {
      for (const ref of op.target_gap_refs) {
        if (ref.startsWith('new_')) {
          if (!declaredLocalRefs.has(ref)) throw new Error(`Forward or undeclared local reference in action target_gap_refs: ${ref}`);
        } else {
          if (!ctx.existingGapIds.has(ref as T.GapId)) throw new Error(`Target gap in action addition not found: ${ref}`);
        }
      }
    }
  }

  // Reject the same source being assigned to more than one of supports_claim, qualifies_claim and conflicts_with_claim for the same claim within one proposal
  const claimSourceDispositions = new Map<string, Set<string>>();
  for (const op of parsed.operations) {
    if (op.operation_type === 'disposition_source') {
      if (op.relationship_type === 'supports_claim' || op.relationship_type === 'qualifies_claim' || op.relationship_type === 'conflicts_with_claim') {
        const claimRef = op.target_ref;
        if (!claimSourceDispositions.has(claimRef)) claimSourceDispositions.set(claimRef, new Set());
        const sourceSet = claimSourceDispositions.get(claimRef)!;
        if (sourceSet.has(op.source_id)) {
          throw new Error(`Duplicate source basis: ${op.source_id} used multiple times for claim ${claimRef} in dispositions`);
        }
        sourceSet.add(op.source_id);
      }
    }
  }

  // Every new claim must have at least one valid source disposition targeting it.
  for (const ref of declaredLocalRefs) {
    if (ref.startsWith('new_claim_') && !targetedNewClaims.has(ref)) {
      throw new Error(`New claim ${ref} lacks a valid source disposition targeting it.`);
    }
  }

  // Map explicitly without TS suppression or broad optionality.
  const typedOperations: P.ProposalOperation[] = [];
  for (const op of parsed.operations) {
    if (op.operation_type === 'disposition_source') {
      if (op.relationship_type === 'supports_claim') {
        typedOperations.push({ operation_type: 'disposition_source', relationship_type: 'supports_claim', source_id: op.source_id, target_ref: op.target_ref, reason: op.reason });
      } else if (op.relationship_type === 'qualifies_claim') {
        typedOperations.push({ operation_type: 'disposition_source', relationship_type: 'qualifies_claim', source_id: op.source_id, target_ref: op.target_ref, reason: op.reason });
      } else if (op.relationship_type === 'conflicts_with_claim') {
        typedOperations.push({ operation_type: 'disposition_source', relationship_type: 'conflicts_with_claim', source_id: op.source_id, target_ref: op.target_ref, reason: op.reason });
      } else if (op.relationship_type === 'raises_gap') {
        typedOperations.push({ operation_type: 'disposition_source', relationship_type: 'raises_gap', source_id: op.source_id, target_ref: op.target_ref, reason: op.reason });
      } else if (op.relationship_type === 'corrects_statement') {
        typedOperations.push({ operation_type: 'disposition_source', relationship_type: 'corrects_statement', source_id: op.source_id, target_ref: op.target_ref, reason: op.reason });
      } else if (op.relationship_type === 'not_yet_classified') {
        typedOperations.push({ operation_type: 'disposition_source', relationship_type: 'not_yet_classified', source_id: op.source_id, target_ref: op.target_ref, reason: op.reason });
      }
    } else if (op.operation_type === 'inspect_source') {
      typedOperations.push({ operation_type: 'inspect_source', evidence_id: op.evidence_id, source_attribution: op.source_attribution, case_object_match: op.case_object_match, match_status: op.match_status, completeness_context: op.completeness_context, integrity_signals: op.integrity_signals, limitations: op.limitations, reason: op.reason });
    } else if (op.operation_type === 'add_event') {
      typedOperations.push({ operation_type: 'add_event', local_ref: op.local_ref, domain_time: op.domain_time, actor: op.actor, action: op.action, target: op.target, effect: op.effect, assessment: op.assessment, source_basis_ids: op.source_basis_ids, reason: op.reason });
    } else if (op.operation_type === 'update_event') {
      typedOperations.push({ operation_type: 'update_event', target_id: op.target_id, domain_time: op.domain_time, actor: op.actor, action: op.action, target: op.target, effect: op.effect, assessment: op.assessment, source_basis_ids: op.source_basis_ids, reason: op.reason });
    } else if (op.operation_type === 'add_claim') {
      typedOperations.push({ operation_type: 'add_claim', local_ref: op.local_ref, proposition: op.proposition, actor: op.actor, action: op.action, target: op.target, domain_time: op.domain_time, assessment: op.assessment, reasoning: op.reasoning, scope: op.scope, limits: op.limits, source_basis_ids: op.source_basis_ids, reason: op.reason });
    } else if (op.operation_type === 'update_claim') {
      typedOperations.push({ operation_type: 'update_claim', target_id: op.target_id, proposition: op.proposition, actor: op.actor, action: op.action, target: op.target, domain_time: op.domain_time, assessment: op.assessment, reasoning: op.reasoning, scope: op.scope, limits: op.limits, source_basis_ids: op.source_basis_ids, reason: op.reason });
    } else if (op.operation_type === 'add_gap') {
      typedOperations.push({ operation_type: 'add_gap', local_ref: op.local_ref, question: op.question, relevance: op.relevance, resolving_evidence: op.resolving_evidence, acquisition_guidance: op.acquisition_guidance, collection_boundary: op.collection_boundary, target_claim_refs: op.target_claim_refs, source_basis_ids: op.source_basis_ids, reason: op.reason });
    } else if (op.operation_type === 'update_gap') {
      typedOperations.push({ operation_type: 'update_gap', target_id: op.target_id, question: op.question, relevance: op.relevance, resolving_evidence: op.resolving_evidence, acquisition_guidance: op.acquisition_guidance, collection_boundary: op.collection_boundary, target_claim_refs: op.target_claim_refs, source_basis_ids: op.source_basis_ids, reason: op.reason });
    } else if (op.operation_type === 'transition_gap') {
      typedOperations.push({ operation_type: 'transition_gap', target_ref: op.target_ref, resulting_status: op.resulting_status, source_basis_ids: op.source_basis_ids, reason: op.reason });
    } else if (op.operation_type === 'add_action') {
      typedOperations.push({ operation_type: 'add_action', local_ref: op.local_ref, title: op.title, description: op.description, priority: op.priority, target_gap_refs: op.target_gap_refs, source_basis_ids: op.source_basis_ids, reason: op.reason });
    } else if (op.operation_type === 'update_action') {
      typedOperations.push({ operation_type: 'update_action', target_id: op.target_id, title: op.title, description: op.description, priority: op.priority, target_gap_refs: op.target_gap_refs, source_basis_ids: op.source_basis_ids, reason: op.reason });
    } else if (op.operation_type === 'transition_action') {
      typedOperations.push({ operation_type: 'transition_action', target_ref: op.target_ref, resulting_status: op.resulting_status, source_basis_ids: op.source_basis_ids, reason: op.reason });
    }
  }

  const proposal: P.ProviderProposal = {
    explanation: { text: parsed.explanation.text },
    operations: typedOperations,
  };

  return proposal;
}

