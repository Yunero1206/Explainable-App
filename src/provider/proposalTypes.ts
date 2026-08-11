import type {
  Brand,
  EventId,
  ClaimId,
  GapId,
  ActionId,
  SourceId,
  DomainTimeText,
  SemanticText,
  AssessmentState,
  GapStatus,
  ActionStatus,
  Priority
} from '../ledger/types';

export type LocalRef = Brand<string, 'LocalRef'>;
export type ReferenceOrId<T extends string> = T | LocalRef;

export interface AssistantExplanation {
  text: SemanticText;
}

export interface DispositionOperation {
  operation_type: 'disposition_source';
  source_id: SourceId;
  reason: SemanticText;
  relationship_type: 'supports_claim' | 'qualifies_claim' | 'conflicts_with_claim' | 'raises_gap' | 'corrects_statement' | 'not_yet_classified';
  target_ref: ReferenceOrId<ClaimId | GapId | SourceId> | null;
}

export interface InspectSourceOperation {
  operation_type: 'inspect_source';
  source_id: SourceId;
  reason: SemanticText;
}

export interface AddEventOperation {
  operation_type: 'add_event';
  local_ref: LocalRef;
  domain_time: DomainTimeText;
  actor: SemanticText;
  action: SemanticText;
  target: SemanticText;
  effect: SemanticText;
  assessment: AssessmentState;
  reason: SemanticText;
}

export interface UpdateEventOperation {
  operation_type: 'update_event';
  target_id: EventId;
  domain_time?: DomainTimeText;
  actor?: SemanticText;
  action?: SemanticText;
  target?: SemanticText;
  effect?: SemanticText;
  assessment?: AssessmentState;
  reason: SemanticText;
}

export interface AddClaimOperation {
  operation_type: 'add_claim';
  local_ref: LocalRef;
  proposition: SemanticText;
  actor: SemanticText;
  action: SemanticText;
  target: SemanticText;
  domain_time: DomainTimeText;
  assessment: AssessmentState;
  reasoning: SemanticText;
  scope: SemanticText;
  limits: SemanticText[];
  integrity_signals: SemanticText;
  limitations: SemanticText[];
  reason: SemanticText;
}

export interface UpdateClaimOperation {
  operation_type: 'update_claim';
  target_id: ClaimId;
  proposition?: SemanticText;
  actor?: SemanticText;
  action?: SemanticText;
  target?: SemanticText;
  domain_time?: DomainTimeText;
  assessment?: AssessmentState;
  reasoning?: SemanticText;
  scope?: SemanticText;
  limits?: SemanticText[];
  integrity_signals?: SemanticText;
  limitations?: SemanticText[];
  reason: SemanticText;
}

export interface AddGapOperation {
  operation_type: 'add_gap';
  local_ref: LocalRef;
  question: SemanticText;
  target_claim_refs: ReferenceOrId<ClaimId>[];
  reason: SemanticText;
}

export interface UpdateGapOperation {
  operation_type: 'update_gap';
  target_id: GapId;
  question?: SemanticText;
  target_claim_refs?: ReferenceOrId<ClaimId>[];
  reason: SemanticText;
}

export interface TransitionGapOperation {
  operation_type: 'transition_gap';
  target_ref: ReferenceOrId<GapId>;
  resulting_status: GapStatus;
  reason: SemanticText;
}

export interface AddActionOperation {
  operation_type: 'add_action';
  local_ref: LocalRef;
  description: SemanticText;
  priority: Priority;
  target_gap_refs: ReferenceOrId<GapId>[];
  reason: SemanticText;
}

export interface UpdateActionOperation {
  operation_type: 'update_action';
  target_id: ActionId;
  description?: SemanticText;
  priority?: Priority;
  target_gap_refs?: ReferenceOrId<GapId>[];
  reason: SemanticText;
}

export interface TransitionActionOperation {
  operation_type: 'transition_action';
  target_ref: ReferenceOrId<ActionId>;
  resulting_status: ActionStatus;
  reason: SemanticText;
}

export type ProposalOperation =
  | DispositionOperation
  | InspectSourceOperation
  | AddEventOperation
  | UpdateEventOperation
  | AddClaimOperation
  | UpdateClaimOperation
  | AddGapOperation
  | UpdateGapOperation
  | TransitionGapOperation
  | AddActionOperation
  | UpdateActionOperation
  | TransitionActionOperation;

export interface ProviderProposal {
  explanation: AssistantExplanation;
  operations: ProposalOperation[];
}
