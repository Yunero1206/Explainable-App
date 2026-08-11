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
} from '../ledger/schema';

// Local references for new entities
export const LocalRefSchema = z.string().regex(/^new_[a-z_]+_[0-9]+$/).transform((v) => v as P.LocalRef);

// Reference or ID helper
function referenceOrId<S extends z.ZodTypeAny>(idSchema: S) {
  return z.union([idSchema, LocalRefSchema]);
}

const SourceIdSchema = z.union([StatementIdSchema, EvidenceIdSchema]);

const AssistantExplanationSchema = z.object({
  text: SemanticTextSchema,
}).strict().strict();

const DispositionOperationSchema = z.object({
  operation_type: z.literal('disposition_source'),
  source_id: SourceIdSchema,
  reason: SemanticTextSchema,
  relationship_type: z.enum(['supports_claim', 'qualifies_claim', 'conflicts_with_claim', 'raises_gap', 'corrects_statement', 'not_yet_classified']),
  target_ref: z.union([referenceOrId(ClaimIdSchema), referenceOrId(GapIdSchema), referenceOrId(StatementIdSchema)]).nullable(),
}).strict().strict();

const InspectSourceOperationSchema = z.object({
  operation_type: z.literal('inspect_source'),
  source_id: SourceIdSchema,
  reason: SemanticTextSchema,
}).strict().strict();

const AssessmentStateEnum = z.enum(['Reported', 'Corroborated', 'Contested', 'Established within current record', 'Mutually acknowledged']);

const AddEventOperationSchema = z.object({
  operation_type: z.literal('add_event'),
  local_ref: LocalRefSchema,
  domain_time: DomainTimeTextSchema,
  actor: SemanticTextSchema,
  action: SemanticTextSchema,
  target: SemanticTextSchema,
  effect: SemanticTextSchema,
  assessment: AssessmentStateEnum,
  reason: SemanticTextSchema,
}).strict().strict();

const UpdateEventOperationSchema = z.object({
  operation_type: z.literal('update_event'),
  target_id: EventIdSchema,
  domain_time: DomainTimeTextSchema.optional(),
  actor: SemanticTextSchema.optional(),
  action: SemanticTextSchema.optional(),
  target: SemanticTextSchema.optional(),
  effect: SemanticTextSchema.optional(),
  assessment: AssessmentStateEnum.optional(),
  reason: SemanticTextSchema,
}).strict().strict();

const AddClaimOperationSchema = z.object({
  operation_type: z.literal('add_claim'),
  local_ref: LocalRefSchema,
  proposition: SemanticTextSchema,
  actor: SemanticTextSchema,
  action: SemanticTextSchema,
  target: SemanticTextSchema,
  domain_time: DomainTimeTextSchema,
  assessment: AssessmentStateEnum,
  reasoning: SemanticTextSchema,
  scope: SemanticTextSchema,
  limits: z.array(SemanticTextSchema),
  integrity_signals: SemanticTextSchema,
  limitations: z.array(SemanticTextSchema),
  reason: SemanticTextSchema,
}).strict().strict();

const UpdateClaimOperationSchema = z.object({
  operation_type: z.literal('update_claim'),
  target_id: ClaimIdSchema,
  proposition: SemanticTextSchema.optional(),
  actor: SemanticTextSchema.optional(),
  action: SemanticTextSchema.optional(),
  target: SemanticTextSchema.optional(),
  domain_time: DomainTimeTextSchema.optional(),
  assessment: AssessmentStateEnum.optional(),
  reasoning: SemanticTextSchema.optional(),
  scope: SemanticTextSchema.optional(),
  limits: z.array(SemanticTextSchema).optional(),
  integrity_signals: SemanticTextSchema.optional(),
  limitations: z.array(SemanticTextSchema).optional(),
  reason: SemanticTextSchema,
}).strict().strict();

const AddGapOperationSchema = z.object({
  operation_type: z.literal('add_gap'),
  local_ref: LocalRefSchema,
  question: SemanticTextSchema,
  target_claim_refs: z.array(referenceOrId(ClaimIdSchema)),
  reason: SemanticTextSchema,
}).strict().strict();

const UpdateGapOperationSchema = z.object({
  operation_type: z.literal('update_gap'),
  target_id: GapIdSchema,
  question: SemanticTextSchema.optional(),
  target_claim_refs: z.array(referenceOrId(ClaimIdSchema)).optional(),
  reason: SemanticTextSchema,
}).strict().strict();

const GapStatusEnum = z.enum(['open', 'resolved', 'superseded', 'unavailable', 'no_longer_material']);

const TransitionGapOperationSchema = z.object({
  operation_type: z.literal('transition_gap'),
  target_ref: referenceOrId(GapIdSchema),
  resulting_status: GapStatusEnum,
  reason: SemanticTextSchema,
}).strict().strict();

const PriorityEnum = z.enum(['high', 'medium', 'low']);

const AddActionOperationSchema = z.object({
  operation_type: z.literal('add_action'),
  local_ref: LocalRefSchema,
  description: SemanticTextSchema,
  priority: PriorityEnum,
  target_gap_refs: z.array(referenceOrId(GapIdSchema)),
  reason: SemanticTextSchema,
}).strict().strict();

const UpdateActionOperationSchema = z.object({
  operation_type: z.literal('update_action'),
  target_id: ActionIdSchema,
  description: SemanticTextSchema.optional(),
  priority: PriorityEnum.optional(),
  target_gap_refs: z.array(referenceOrId(GapIdSchema)).optional(),
  reason: SemanticTextSchema,
}).strict().strict();

const ActionStatusEnum = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);

const TransitionActionOperationSchema = z.object({
  operation_type: z.literal('transition_action'),
  target_ref: referenceOrId(ActionIdSchema),
  resulting_status: ActionStatusEnum,
  reason: SemanticTextSchema,
}).strict().strict();

export const ProposalOperationSchema = z.discriminatedUnion('operation_type', [
  DispositionOperationSchema,
  InspectSourceOperationSchema,
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
}).strict().strict();

// Semantic validation context
export interface ProposalValidationContext {
  availableSourceIds: Set<T.SourceId>;
  existingClaimIds: Set<T.ClaimId>;
  existingGapIds: Set<T.GapId>;
  existingEventIds: Set<T.EventId>;
  existingActionIds: Set<T.ActionId>;
}

export function parseProviderProposal(raw: unknown, ctx: ProposalValidationContext): P.ProviderProposal {
  // 1. Structural validation
  let parsed: P.ProviderProposal;
  try {
    parsed = ProviderProposalSchema.parse(raw) as P.ProviderProposal;
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw new Error(`Proposal structural validation failed: ${err.message}`);
    }
    throw err;
  }

  // 2. Semantic cross-operation validation
  const declaredLocalRefs = new Set<string>();

  for (const op of parsed.operations) {
    // Collect local refs to prevent duplicates
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

    // Check disposition targets
    if (op.operation_type === 'disposition_source') {
      if (!ctx.availableSourceIds.has(op.source_id)) {
        throw new Error(`Cannot disposition unavailable source: ${op.source_id}`);
      }
      if (op.target_ref !== null) {
        if (op.target_ref.startsWith('new_')) {
          if (!declaredLocalRefs.has(op.target_ref)) {
            throw new Error(`Forward or undeclared local reference in disposition target: ${op.target_ref}`);
          }
          // Note: Full typed-family checking of local refs can be added if we tracked family in declaredLocalRefs, but for now strict regex + declared is sufficient as they are strongly isolated by the model.
          // Wait, 'wrong-family references' applies to canonical existing IDs too.
        } else {
          // It's a canonical ID. Check if it exists.
          if (op.relationship_type === 'supports_claim' || op.relationship_type === 'qualifies_claim' || op.relationship_type === 'conflicts_with_claim') {
            if (!ctx.existingClaimIds.has(op.target_ref as Extract<typeof op.target_ref, T.ClaimId>)) {
              throw new Error(`Disposition target claim not found: ${op.target_ref}`);
            }
          } else if (op.relationship_type === 'raises_gap') {
            if (!ctx.existingGapIds.has(op.target_ref as Extract<typeof op.target_ref, T.GapId>)) {
              throw new Error(`Disposition target gap not found: ${op.target_ref}`);
            }
          } else if (op.relationship_type === 'corrects_statement') {
            if (!ctx.availableSourceIds.has(op.target_ref as Extract<typeof op.target_ref, T.StatementId>)) {
              throw new Error(`Disposition target statement not found: ${op.target_ref}`);
            }
          }
        }
      }
    }

    // Check inspect source
    if (op.operation_type === 'inspect_source') {
      if (!ctx.availableSourceIds.has(op.source_id)) {
        throw new Error(`Cannot inspect unavailable source: ${op.source_id}`);
      }
    }

    // Check update targets
    if (op.operation_type === 'update_event') {
      if (!ctx.existingEventIds.has(op.target_id)) {
        throw new Error(`Target event for update not found: ${op.target_id}`);
      }
    }
    if (op.operation_type === 'update_claim') {
      if (!ctx.existingClaimIds.has(op.target_id)) {
        throw new Error(`Target claim for update not found: ${op.target_id}`);
      }
    }
    if (op.operation_type === 'update_gap') {
      if (!ctx.existingGapIds.has(op.target_id)) {
        throw new Error(`Target gap for update not found: ${op.target_id}`);
      }
      if (op.target_claim_refs) {
        for (const ref of op.target_claim_refs) {
          if (ref.startsWith('new_')) {
            if (!declaredLocalRefs.has(ref)) {
              throw new Error(`Forward or undeclared local reference in gap target_claim_refs: ${ref}`);
            }
          } else if (!ctx.existingClaimIds.has(ref as Extract<typeof ref, T.ClaimId>)) {
            throw new Error(`Target claim in gap update not found: ${ref}`);
          }
        }
      }
    }
    if (op.operation_type === 'update_action') {
      if (!ctx.existingActionIds.has(op.target_id)) {
        throw new Error(`Target action for update not found: ${op.target_id}`);
      }
      if (op.target_gap_refs) {
        for (const ref of op.target_gap_refs) {
          if (ref.startsWith('new_')) {
            if (!declaredLocalRefs.has(ref)) {
              throw new Error(`Forward or undeclared local reference in action target_gap_refs: ${ref}`);
            }
          } else if (!ctx.existingGapIds.has(ref as Extract<typeof ref, T.GapId>)) {
            throw new Error(`Target gap in action update not found: ${ref}`);
          }
        }
      }
    }

    // Check transition targets
    if (op.operation_type === 'transition_gap') {
      if (op.target_ref.startsWith('new_')) {
        if (!declaredLocalRefs.has(op.target_ref)) {
          throw new Error(`Forward or undeclared local reference in gap transition: ${op.target_ref}`);
        }
      } else if (!ctx.existingGapIds.has(op.target_ref as Extract<typeof op.target_ref, T.GapId>)) {
        throw new Error(`Target gap for transition not found: ${op.target_ref}`);
      }
    }
    if (op.operation_type === 'transition_action') {
      if (op.target_ref.startsWith('new_')) {
        if (!declaredLocalRefs.has(op.target_ref)) {
          throw new Error(`Forward or undeclared local reference in action transition: ${op.target_ref}`);
        }
      } else if (!ctx.existingActionIds.has(op.target_ref as Extract<typeof op.target_ref, T.ActionId>)) {
        throw new Error(`Target action for transition not found: ${op.target_ref}`);
      }
    }

    // Check add targets
    if (op.operation_type === 'add_gap') {
      for (const ref of op.target_claim_refs) {
        if (ref.startsWith('new_')) {
          if (!declaredLocalRefs.has(ref)) {
            throw new Error(`Forward or undeclared local reference in gap target_claim_refs: ${ref}`);
          }
        } else if (!ctx.existingClaimIds.has(ref as Extract<typeof ref, T.ClaimId>)) {
          throw new Error(`Target claim in gap addition not found: ${ref}`);
        }
      }
    }
    if (op.operation_type === 'add_action') {
      for (const ref of op.target_gap_refs) {
        if (ref.startsWith('new_')) {
          if (!declaredLocalRefs.has(ref)) {
            throw new Error(`Forward or undeclared local reference in action target_gap_refs: ${ref}`);
          }
        } else if (!ctx.existingGapIds.has(ref as Extract<typeof ref, T.GapId>)) {
          throw new Error(`Target gap in action addition not found: ${ref}`);
        }
      }
    }
  }

  // Type-check local ref prefixes against expected families.
  // We can enforce that local refs follow naming conventions like 'new_claim_*', 'new_gap_*' to ensure they aren't used in wrong contexts.
  for (const op of parsed.operations) {
    if (op.operation_type === 'disposition_source' && op.target_ref !== null && op.target_ref.startsWith('new_')) {
      if (op.relationship_type === 'supports_claim' || op.relationship_type === 'qualifies_claim' || op.relationship_type === 'conflicts_with_claim') {
        if (!op.target_ref.startsWith('new_claim_')) throw new Error(`Wrong local reference family for claim disposition: ${op.target_ref}`);
      } else if (op.relationship_type === 'raises_gap') {
        if (!op.target_ref.startsWith('new_gap_')) throw new Error(`Wrong local reference family for gap disposition: ${op.target_ref}`);
      }
    }
    if (op.operation_type === 'add_gap' || op.operation_type === 'update_gap') {
      for (const ref of op.target_claim_refs || []) {
        if (ref.startsWith('new_') && !ref.startsWith('new_claim_')) throw new Error(`Wrong local reference family for gap target_claim_refs: ${ref}`);
      }
    }
    if (op.operation_type === 'add_action' || op.operation_type === 'update_action') {
      for (const ref of op.target_gap_refs || []) {
        if (ref.startsWith('new_') && !ref.startsWith('new_gap_')) throw new Error(`Wrong local reference family for action target_gap_refs: ${ref}`);
      }
    }
    if (op.operation_type === 'transition_gap' && op.target_ref.startsWith('new_')) {
      if (!op.target_ref.startsWith('new_gap_')) throw new Error(`Wrong local reference family for gap transition: ${op.target_ref}`);
    }
    if (op.operation_type === 'transition_action' && op.target_ref.startsWith('new_')) {
      if (!op.target_ref.startsWith('new_action_')) throw new Error(`Wrong local reference family for action transition: ${op.target_ref}`);
    }
    if (op.operation_type === 'add_claim' && !op.local_ref.startsWith('new_claim_')) {
      throw new Error(`Invalid local ref family for new claim: ${op.local_ref}`);
    }
    if (op.operation_type === 'add_gap' && !op.local_ref.startsWith('new_gap_')) {
      throw new Error(`Invalid local ref family for new gap: ${op.local_ref}`);
    }
    if (op.operation_type === 'add_action' && !op.local_ref.startsWith('new_action_')) {
      throw new Error(`Invalid local ref family for new action: ${op.local_ref}`);
    }
    if (op.operation_type === 'add_event' && !op.local_ref.startsWith('new_event_')) {
      throw new Error(`Invalid local ref family for new event: ${op.local_ref}`);
    }
  }

  return parsed;
}
