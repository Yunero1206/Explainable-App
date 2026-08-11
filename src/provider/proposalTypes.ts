import type {
  Brand,
  EventId,
  ClaimId,
  GapId,
  ActionId,
  SourceId,
  StatementId,
  DomainTimeText,
  SemanticText,
  AssessmentState,
  Priority
} from '../ledger/types';

export type EventLocalRef = Brand<string, 'EventLocalRef'>;
export type ClaimLocalRef = Brand<string, 'ClaimLocalRef'>;
export type GapLocalRef = Brand<string, 'GapLocalRef'>;
export type ActionLocalRef = Brand<string, 'ActionLocalRef'>;

export type ReferenceOrId<IdType extends string, RefType extends string> = IdType | RefType;

export interface AssistantExplanation {
  text: SemanticText;
}

export interface DispositionSupportsClaim {
  operation_type: 'disposition_source';
  relationship_type: 'supports_claim' | 'qualifies_claim' | 'conflicts_with_claim';
  source_id: SourceId;
  target_ref: ReferenceOrId<ClaimId, ClaimLocalRef>;
  reason: SemanticText;
}

export interface DispositionRaisesGap {
  operation_type: 'disposition_source';
  relationship_type: 'raises_gap';
  source_id: SourceId;
  target_ref: ReferenceOrId<GapId, GapLocalRef>;
  reason: SemanticText;
}

export interface DispositionCorrectsStatement {
  operation_type: 'disposition_source';
  relationship_type: 'corrects_statement';
  source_id: StatementId;
  target_ref: StatementId;
  reason: SemanticText;
}

export interface DispositionNotYetClassified {
  operation_type: 'disposition_source';
  relationship_type: 'not_yet_classified';
  source_id: SourceId;
  target_ref: null;
  reason: SemanticText;
}

export type DispositionOperation =
  | DispositionSupportsClaim
  | DispositionRaisesGap
  | DispositionCorrectsStatement
  | DispositionNotYetClassified;

export interface InspectSourceOperation {
  operation_type: 'inspect_source';
  source_id: SourceId; // evidence ID only in reality, but for schema union let's just say SourceId
  match_status: 'matched' | 'mismatched' | 'unclear' | 'not_assessed';
  completeness_context: SemanticText;
  integrity_signals: SemanticText;
  limitations: SemanticText[];
  reason: SemanticText;
}

export interface AddEventOperation {
  operation_type: 'add_event';
  local_ref: EventLocalRef;
  domain_time: DomainTimeText;
  actor: SemanticText;
  action: SemanticText;
  target: SemanticText;
  effect: SemanticText;
  assessment: AssessmentState;
  source_basis_ids: SourceId[];
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
  local_ref: ClaimLocalRef;
  proposition: SemanticText;
  actor: SemanticText;
  action: SemanticText;
  target: SemanticText;
  domain_time: DomainTimeText;
  assessment: AssessmentState;
  reasoning: SemanticText;
  scope: SemanticText;
  limits: SemanticText[];
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
  reason: SemanticText;
}

export interface AddGapOperation {
  operation_type: 'add_gap';
  local_ref: GapLocalRef;
  question: SemanticText;
  relevance: SemanticText;
  resolving_evidence: SemanticText;
  acquisition_guidance: SemanticText;
  collection_boundary: SemanticText;
  target_claim_refs: ReferenceOrId<ClaimId, ClaimLocalRef>[];
  source_basis_ids: SourceId[];
  reason: SemanticText;
}

export interface UpdateGapOperation {
  operation_type: 'update_gap';
  target_id: GapId;
  question?: SemanticText;
  relevance?: SemanticText;
  resolving_evidence?: SemanticText;
  acquisition_guidance?: SemanticText;
  collection_boundary?: SemanticText;
  target_claim_refs?: ReferenceOrId<ClaimId, ClaimLocalRef>[];
  reason: SemanticText;
}

export interface TransitionGapOperation {
  operation_type: 'transition_gap';
  target_ref: GapId; // explicitly canonical gap id only
  resulting_status: 'resolved' | 'superseded' | 'unavailable' | 'no_longer_material';
  source_basis_ids: SourceId[];
  reason: SemanticText;
}

export interface AddActionOperation {
  operation_type: 'add_action';
  local_ref: ActionLocalRef;
  title: SemanticText;
  description: SemanticText;
  priority: Priority;
  target_gap_refs: ReferenceOrId<GapId, GapLocalRef>[];
  source_basis_ids: SourceId[];
  reason: SemanticText;
}

export interface UpdateActionOperation {
  operation_type: 'update_action';
  target_id: ActionId;
  title?: SemanticText;
  description?: SemanticText;
  priority?: Priority;
  target_gap_refs?: ReferenceOrId<GapId, GapLocalRef>[];
  reason: SemanticText;
}

export interface TransitionActionOperation {
  operation_type: 'transition_action';
  target_ref: ActionId; // canonical only
  resulting_status: 'in_progress' | 'completed' | 'cancelled';
  source_basis_ids: SourceId[];
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
