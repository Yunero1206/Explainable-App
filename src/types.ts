import type { LedgerV3Case, RelationshipType } from './ledger/types.js';
import type { ModelRunAudit } from './runtime/modelRun.js';

export type AcquisitionMethod = 'user_upload' | 'pasted_text' | 'file_drop' | 'manual_entry';
export type InputForm = 'screenshot' | 'image' | 'email_text' | 'pdf' | 'receipt' | 'chat_transcript' | 'document' | 'other';
export type AssessmentState = 'Reported' | 'Corroborated' | 'Contested' | 'Established within current record' | 'Mutually acknowledged';

export interface UserStatement {
  id: string;
  text: string;
  submitted_at: string;
  attachment_ids: string[];
  disposition?: RelationshipType;
  disposition_reason?: string;
}

export interface RawSubmission {
  attachment_id: string;
  acquisition_method: AcquisitionMethod;
  received_at: string;
  file_name: string;
  file_type: string;
  byte_size?: number;
  sha256_hash?: string;
  raw_preserved_state: 'preserved_bytes' | 'extracted_text_only' | 'pasted_text_only';
}

export interface EvidenceItem {
  id: string;
  label: string;
  claimed_source: string;
  acquisition_method: AcquisitionMethod;
  input_form: InputForm;
  evidence_time: string | null;
  received_at: string;
  subject_object_ids: string[];
  content: string;
  raw_submission?: RawSubmission;
  disposition?: RelationshipType;
  disposition_reason?: string;
  source_attribution: string;
  case_object_match: string;
  case_object_match_status?: 'matched' | 'mismatched' | 'unclear' | 'not_assessed';
  completeness_context: string;
  integrity_signals: string;
  limitations: string[];
  file_name?: string;
  file_type?: string;
  file_data_url?: string;
}

export interface CaseEvent {
  id: string;
  time: string;
  actor: string;
  action: string;
  target: string;
  effect: string;
  evidence_ids: string[];
  user_statement_ids: string[];
  finding_ids: string[];
  assessment: AssessmentState;
}

export interface Claim {
  id: string;
  text: string;
  actor: string;
  action: string;
  target: string;
  time: string;
  supporting_evidence: string[];
  qualifying_evidence: string[];
  conflicting_evidence: string[];
  user_statement_ids: string[];
  assessment: AssessmentState;
  reasoning: string;
  scope: string;
  limits: string[];
}

export interface EvidenceGap {
  id: string;
  what_is_unknown: string;
  why_it_matters: string;
  what_evidence_could_resolve_it: string;
  where_how_to_obtain: string;
  what_not_to_over_collect: string;
  target_claim_ids: string[];
  related_event_ids: string[];
  evidence_ids: string[];
  status: 'open' | 'resolved' | 'superseded' | 'unavailable' | 'no_longer_material';
  resolution_reason?: string;
  resolution_evidence_ids?: string[];
}

export interface NextAction {
  id: string;
  title: string;
  description: string;
  target_gap_id: string;
  target_gap_ids: string[];
  related_event_ids: string[];
  finding_ids: string[];
  evidence_ids: string[];
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export interface AnalysisSummary {
  total_evidence_count: number;
  established_claims_count: number;
  unresolved_claims_count: number;
  conflicted_claims_count: number;
  user_reported_claims_count: number;
  unresolved_questions_count: number;
}

export interface RevisionAuditView {
  id: string;
  parent_id: string | null;
  created_at: string;
  explanation: string;
  accepted_model_run_id: string;
  delta_entries: Array<{
    entity_type: string;
    entity_id: string;
    operation: 'add' | 'update' | 'transition';
    reason: string;
    source_ids: string[];
  }>;
}

export interface AttachmentFile {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  size?: number;
  extractedText?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  attachments?: AttachmentFile[];
  timestamp: string;
  revision_id?: string;
  isAnalyzing?: boolean;
  error?: string;
}

export interface PresentationCaseData {
  id: string;
  case_number: string;
  title: string;
  objective: string;
  statements: UserStatement[];
  evidence: EvidenceItem[];
  current_revision_id?: string;
  events: CaseEvent[];
  claims: Claim[];
  gaps: EvidenceGap[];
  actions: NextAction[];
  summary?: AnalysisSummary;
  is_archived: boolean;
  locale: string;
  revisions: RevisionAuditView[];
  model_runs: ModelRunAudit[];
  authoritative_record: LedgerV3Case;
}
