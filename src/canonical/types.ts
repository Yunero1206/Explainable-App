export const SCHEMA_VERSION = '2.0.0' as const;

export const CANONICAL_ASSESSMENT_VALUES = [
  'Reported',
  'Corroborated',
  'Contested',
  'Established within current record',
  'Mutually acknowledged'
] as const;

export type CanonicalAssessment = typeof CANONICAL_ASSESSMENT_VALUES[number];

export const CANONICAL_GAP_STATUSES = [
  'open',
  'resolved',
  'superseded',
  'unavailable',
  'no_longer_material'
] as const;

export type CanonicalGapStatus = typeof CANONICAL_GAP_STATUSES[number];

export const DELTA_ENTITY_TYPES = ['event', 'claim', 'gap', 'action', 'statement', 'evidence', 'relationship'] as const;
export type DeltaEntityType = typeof DELTA_ENTITY_TYPES[number];

export const DELTA_OPERATIONS = ['added', 'updated', 'resolved', 'reopened'] as const;
export type DeltaOperation = typeof DELTA_OPERATIONS[number];

export type StatementId = string;
export type EvidenceId = string;
export type ClaimId = string;
export type GapId = string;
export type ActionId = string;
export type RevisionId = string;
export type RelationshipId = string;
export type IntakeId = string;

export interface CanonicalStatement {
  id: StatementId;
  text: string;
  submitted_at: string;
  source_intake_id: IntakeId;
}

export interface CanonicalEvidence {
  id: EvidenceId;
  label: string;
  origin_type: string;
  input_form: string;
  byte_size?: number;
  sha256?: string;
  storage_key?: string;
  mime_type?: string;
  submitted_at: string;
  source_intake_id: IntakeId;
}

export type DispositionRelationship =
  | {
      id: RelationshipId;
      source_id: StatementId | EvidenceId;
      target_id: ClaimId;
      relationship_type: 'supports_claim' | 'qualifies_claim' | 'conflicts_with_claim';
      reason: string;
      created_in_revision_id: RevisionId;
    }
  | {
      id: RelationshipId;
      source_id: StatementId | EvidenceId;
      target_id: GapId;
      relationship_type: 'raises_gap';
      reason: string;
      created_in_revision_id: RevisionId;
    }
  | {
      id: RelationshipId;
      source_id: StatementId;
      target_id: StatementId;
      relationship_type: 'corrects_statement';
      reason: string;
      created_in_revision_id: RevisionId;
    }
  | {
      id: RelationshipId;
      source_id: StatementId | EvidenceId;
      target_id: null;
      relationship_type: 'not_yet_classified';
      reason: string;
      created_in_revision_id: RevisionId;
    };

export type IntakePart =
  | {
      kind: 'statement';
      statement_id: StatementId;
      raw_text: string;
    }
  | {
      kind: 'evidence';
      evidence_id: EvidenceId;
      submitted_name: string;
      mime_type?: string;
      byte_size?: number;
      storage_key?: string;
    };

export interface IntakeRecord {
  id: IntakeId;
  received_at: string;
  resulting_revision_id: RevisionId;
  parts: IntakePart[];
}

export interface CaseEvent {
  id: string;
  time: string;
  actor: string;
  action: string;
  target: string;
  effect?: string;
  evidence_ids: (StatementId | EvidenceId)[];
  assessment: CanonicalAssessment;
}

export interface CanonicalClaim {
  id: ClaimId;
  text: string;
  assessment: CanonicalAssessment;
  reasoning: string;
  supporting_evidence: (StatementId | EvidenceId)[];
  qualifying_evidence: (StatementId | EvidenceId)[];
  conflicting_evidence: (StatementId | EvidenceId)[];
}

export interface CanonicalGap {
  id: GapId;
  question_key: string;
  status: CanonicalGapStatus;
  status_revision_id?: RevisionId;
  status_reason?: string;
  status_source_ids?: (StatementId | EvidenceId)[];
  target_claim_ids: ClaimId[];
}

export interface CanonicalAction {
  id: ActionId;
  target_gap_ids: GapId[];
  description: string;
}

export interface CanonicalEvidenceInspection {
  id: string;
  evidence_id: EvidenceId;
  limitations: string[];
}

export interface RevisionDeltaEntry {
  entity_type: DeltaEntityType;
  entity_id: string;
  operation: DeltaOperation;
  reason: string;
  source_ids: Array<StatementId | EvidenceId>;
}

export interface RevisionDelta {
  changes: RevisionDeltaEntry[];
}

export interface AnalysisSummary {
  total_evidence_count: number;
  established_claims_count: number;
  unresolved_claims_count: number;
  conflicted_claims_count: number;
  user_reported_claims_count: number;
}

export interface CaseRevision {
  revision_id: RevisionId;
  created_at: string;
  title: string;
  objective: string;
  parent_revision_id?: RevisionId;
  triggering_intake_id?: IntakeId;
  
  input_statement_ids: StatementId[];
  input_evidence_ids: EvidenceId[];
  
  events: CaseEvent[];
  claims: CanonicalClaim[];
  gaps: CanonicalGap[];
  actions: CanonicalAction[];
  evidence_inspections: CanonicalEvidenceInspection[];
  
  delta: RevisionDelta;
  summary: AnalysisSummary;
}

export interface CanonicalCaseRecord {
  id: string;
  schema_version: typeof SCHEMA_VERSION;
  case_number: string;
  created_at: string;
  updated_at: string;
  current_revision_id: RevisionId;
  
  intake_ledger: IntakeRecord[];
  statements: CanonicalStatement[];
  evidence: CanonicalEvidence[];
  relationships: DispositionRelationship[];
  revisions: CaseRevision[];
}
