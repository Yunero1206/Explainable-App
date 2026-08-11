export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type CaseId = Brand<string, 'CaseId'>;
export type RevisionId = Brand<string, 'RevisionId'>;
export type IntakeId = Brand<string, 'IntakeId'>;
export type StatementId = Brand<string, 'StatementId'>;
export type EvidenceId = Brand<string, 'EvidenceId'>;
export type RelationshipId = Brand<string, 'RelationshipId'>;
export type EventId = Brand<string, 'EventId'>;
export type ClaimId = Brand<string, 'ClaimId'>;
export type GapId = Brand<string, 'GapId'>;
export type ActionId = Brand<string, 'ActionId'>;
export type InspectionId = Brand<string, 'InspectionId'>;
export type ModelRunId = Brand<string, 'ModelRunId'>;
export type BlobRef = Brand<string, 'BlobRef'>;
export type StructuralInstant = Brand<string, 'StructuralInstant'>;
export type CaseNumber = Brand<string, 'CaseNumber'>;
export type CaseTitle = Brand<string, 'CaseTitle'>;
export type PreservedNonBlankText = Brand<string, 'PreservedNonBlankText'>;
export type DomainTimeText = Brand<string, 'DomainTimeText'>;
export type SemanticText = Brand<string, 'SemanticText'>;
export type Sha256 = Brand<string, 'Sha256'>;
export type MimeType = Brand<string, 'MimeType'>;
export type ByteSize = Brand<number, 'ByteSize'>;
export type NonNegativeInteger = Brand<number, 'NonNegativeInteger'>;

export type SourceId = StatementId | EvidenceId;

export type AcquisitionMethod =
  | 'user_upload'
  | 'pasted_text'
  | 'file_drop'
  | 'manual_entry'
  | 'authoritative_web_retrieval';

export type InputForm =
  | 'screenshot'
  | 'image'
  | 'email_text'
  | 'pdf'
  | 'receipt'
  | 'chat_transcript'
  | 'document'
  | 'web_excerpt'
  | 'other';

export type WebAuthorityKind = 'first_party_official' | 'public_authority';

export type AssessmentState =
  | 'Reported'
  | 'Corroborated'
  | 'Contested'
  | 'Established within current record'
  | 'Mutually acknowledged';

export type EvidenceMatchStatus =
  | 'matched'
  | 'mismatched'
  | 'unclear'
  | 'not_assessed';

export type GapStatus =
  | 'open'
  | 'resolved'
  | 'superseded'
  | 'unavailable'
  | 'no_longer_material';

export type ActionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type Priority = 'high' | 'medium' | 'low';

export type RelationshipType =
  | 'supports_claim'
  | 'qualifies_claim'
  | 'conflicts_with_claim'
  | 'raises_gap'
  | 'corrects_statement'
  | 'not_yet_classified';

export interface LedgerV3Case {
  id: CaseId;
  schema_version: '3.0.0';
  case_number: CaseNumber;
  title: CaseTitle;
  created_at: StructuralInstant;
  current_revision_id: RevisionId | null;
  intake_ledger: IntakeRecord[];
  statements: CanonicalStatement[];
  evidence: CanonicalEvidence[];
  relationships: AcceptedRelationship[];
  revisions: Revision[];
}

export interface IntakeRecord {
  id: IntakeId;
  received_at: StructuralInstant;
  parts: IntakePart[];
}

export type IntakePart = StatementIntakePart | EvidenceIntakePart;

export interface StatementIntakePart {
  kind: 'statement';
  statement_id: StatementId;
  raw_text: PreservedNonBlankText;
}

export interface EvidenceIntakePart {
  kind: 'evidence';
  evidence_id: EvidenceId;
}

export interface CanonicalStatement {
  id: StatementId;
  source_intake_id: IntakeId;
  text: PreservedNonBlankText;
}

export interface BlobMetadata {
  blob_ref: BlobRef;
  submitted_filename: PreservedNonBlankText;
  mime_type: MimeType;
  byte_size: ByteSize;
  sha256: Sha256;
}

export interface EvidenceContent {
  raw_text: PreservedNonBlankText | null;
  extracted_text: PreservedNonBlankText | null;
  blob: BlobMetadata | null;
}

export interface WebEvidenceProvenance {
  publisher: PreservedNonBlankText;
  page_title: PreservedNonBlankText;
  source_url: string;
  published_or_updated_at: DomainTimeText | null;
  retrieved_at: StructuralInstant;
  authority_kind: WebAuthorityKind;
  authority_entity: PreservedNonBlankText;
  authority_scope: PreservedNonBlankText;
  search_query: PreservedNonBlankText;
}

export interface CanonicalEvidence {
  id: EvidenceId;
  source_intake_id: IntakeId;
  label: PreservedNonBlankText;
  claimed_source: PreservedNonBlankText;
  acquisition_method: AcquisitionMethod;
  input_form: InputForm;
  original_domain_time: DomainTimeText | null;
  subject_object_ids: PreservedNonBlankText[];
  content: EvidenceContent;
  /** Present only for server-admitted first-party/public-authority excerpts. */
  web_provenance?: WebEvidenceProvenance;
}

export type AcceptedRelationship =
  | SupportsClaimRelationship
  | QualifiesClaimRelationship
  | ConflictsWithClaimRelationship
  | GapSourceRelationship
  | StatementCorrectionRelationship
  | UnclassifiedSourceRelationship;

export interface SupportsClaimRelationship {
  id: RelationshipId;
  relationship_type: 'supports_claim';
  source_id: SourceId;
  target_id: ClaimId;
  reason: SemanticText;
  created_in_revision_id: RevisionId;
}

export interface QualifiesClaimRelationship {
  id: RelationshipId;
  relationship_type: 'qualifies_claim';
  source_id: SourceId;
  target_id: ClaimId;
  reason: SemanticText;
  created_in_revision_id: RevisionId;
}

export interface ConflictsWithClaimRelationship {
  id: RelationshipId;
  relationship_type: 'conflicts_with_claim';
  source_id: SourceId;
  target_id: ClaimId;
  reason: SemanticText;
  created_in_revision_id: RevisionId;
}

export interface GapSourceRelationship {
  id: RelationshipId;
  relationship_type: 'raises_gap';
  source_id: SourceId;
  target_id: GapId;
  reason: SemanticText;
  created_in_revision_id: RevisionId;
}

export interface StatementCorrectionRelationship {
  id: RelationshipId;
  relationship_type: 'corrects_statement';
  source_id: StatementId;
  target_id: StatementId;
  reason: SemanticText;
  created_in_revision_id: RevisionId;
}

export interface UnclassifiedSourceRelationship {
  id: RelationshipId;
  relationship_type: 'not_yet_classified';
  source_id: SourceId;
  target_id: null;
  reason: SemanticText;
  created_in_revision_id: RevisionId;
}

export interface Revision {
  id: RevisionId;
  parent_id: RevisionId | null;
  created_at: StructuralInstant;
  objective: SemanticText;
  explanation: SemanticText;
  assistant_message: SemanticText;
  accepted_model_run_id: ModelRunId;
  triggering_intake_ids: IntakeId[];
  input_statement_ids: StatementId[];
  input_evidence_ids: EvidenceId[];
  events: Event[];
  claims: Claim[];
  gaps: Gap[];
  actions: Action[];
  inspections: EvidenceInspection[];
  delta: RevisionDelta;
  summary: DeterministicSummary;
}

export interface Event {
  id: EventId;
  domain_time: DomainTimeText;
  actor: SemanticText;
  action: SemanticText;
  target: SemanticText;
  effect: SemanticText;
  source_support_ids: SourceId[];
  /**
   * Explicit product-view connection from a material timeline event to the
   * finding(s) that assess it. Optional only so ledgers accepted before this
   * additive edge was introduced remain readable.
   */
  finding_ids?: ClaimId[];
  assessment: AssessmentState;
}

export interface Claim {
  id: ClaimId;
  proposition: SemanticText;
  actor: SemanticText;
  action: SemanticText;
  target: SemanticText;
  domain_time: DomainTimeText;
  assessment: AssessmentState;
  reasoning: SemanticText;
  scope: SemanticText;
  limits: SemanticText[];
  supporting_source_ids: SourceId[];
  qualifying_source_ids: SourceId[];
  conflicting_source_ids: SourceId[];
}

export interface GapTransition {
  previous_status: GapStatus;
  resulting_status: GapStatus;
  transition_revision_id: RevisionId;
  reason: SemanticText;
  supporting_source_ids: SourceId[];
}

export interface Gap {
  id: GapId;
  question: SemanticText;
  relevance: SemanticText;
  resolving_evidence: SemanticText;
  acquisition_guidance: SemanticText;
  collection_boundary: SemanticText;
  target_claim_ids: ClaimId[];
  status: GapStatus;
  transition: GapTransition | null;
}

export interface ActionTransition {
  previous_status: ActionStatus;
  resulting_status: ActionStatus;
  transition_revision_id: RevisionId;
  reason: SemanticText;
  supporting_source_ids: SourceId[];
}

export interface Action {
  id: ActionId;
  title: SemanticText;
  description: SemanticText;
  target_gap_ids: GapId[];
  priority: Priority;
  status: ActionStatus;
  transition: ActionTransition | null;
}

export interface EvidenceInspection {
  id: InspectionId;
  evidence_id: EvidenceId;
  source_attribution: SemanticText;
  case_object_match: SemanticText;
  match_status: EvidenceMatchStatus;
  completeness_context: SemanticText;
  integrity_signals: SemanticText;
  limitations: SemanticText[];
}

export type DeltaOperation = 'add' | 'update' | 'transition';

export type DeltaEntry =
  | IntakeDeltaEntry
  | StatementDeltaEntry
  | EvidenceDeltaEntry
  | RelationshipDeltaEntry
  | EventDeltaEntry
  | ClaimDeltaEntry
  | GapDeltaEntry
  | ActionDeltaEntry
  | InspectionDeltaEntry;

export interface IntakeDeltaEntry {
  entity_type: 'intake';
  entity_id: IntakeId;
  operation: 'add';
  reason: SemanticText;
  source_ids: SourceId[];
}

export interface StatementDeltaEntry {
  entity_type: 'statement';
  entity_id: StatementId;
  operation: 'add';
  reason: SemanticText;
  source_ids: SourceId[];
}

export interface EvidenceDeltaEntry {
  entity_type: 'evidence';
  entity_id: EvidenceId;
  operation: 'add';
  reason: SemanticText;
  source_ids: SourceId[];
}

export interface RelationshipDeltaEntry {
  entity_type: 'relationship';
  entity_id: RelationshipId;
  operation: 'add';
  reason: SemanticText;
  source_ids: SourceId[];
}

export interface EventDeltaEntry {
  entity_type: 'event';
  entity_id: EventId;
  operation: 'add' | 'update';
  reason: SemanticText;
  source_ids: SourceId[];
}

export interface ClaimDeltaEntry {
  entity_type: 'claim';
  entity_id: ClaimId;
  operation: 'add' | 'update';
  reason: SemanticText;
  source_ids: SourceId[];
}

export interface GapDeltaEntry {
  entity_type: 'gap';
  entity_id: GapId;
  operation: 'add' | 'update' | 'transition';
  reason: SemanticText;
  source_ids: SourceId[];
}

export interface ActionDeltaEntry {
  entity_type: 'action';
  entity_id: ActionId;
  operation: 'add' | 'update' | 'transition';
  reason: SemanticText;
  source_ids: SourceId[];
}

export interface InspectionDeltaEntry {
  entity_type: 'inspection';
  entity_id: InspectionId;
  operation: 'add' | 'update';
  reason: SemanticText;
  source_ids: SourceId[];
}

export interface RevisionDelta {
  entries: DeltaEntry[];
}

export interface DeterministicSummary {
  total_evidence_count: NonNegativeInteger;
  established_claims_count: NonNegativeInteger;
  unresolved_claims_count: NonNegativeInteger;
  conflicted_claims_count: NonNegativeInteger;
  user_reported_claims_count: NonNegativeInteger;
}
