export type AcquisitionMethod = 'user_upload' | 'pasted_text' | 'file_drop' | 'manual_entry';

export type InputForm =
  | 'screenshot'
  | 'image'
  | 'email_text'
  | 'pdf'
  | 'receipt'
  | 'chat_transcript'
  | 'document'
  | 'other';

export type GapStatus =
  | 'open'
  | 'narrowed'
  | 'resolved'
  | 'abandoned'
  | 'superseded'
  | 'unavailable'
  | 'no-longer-material';

export type AssessmentState =
  | 'Reported'
  | 'Corroborated'
  | 'Contested'
  | 'Established within current record'
  | 'Mutually acknowledged';

export interface UserStatement {
  id: string; // e.g. U01, U02
  text: string;
  submitted_at: string; // ISO string timestamp
  attachment_ids?: string[];
  disposition?: 'supports_finding' | 'challenges_finding' | 'corrects_statement' | 'supports_gap' | 'irrelevant' | 'not_yet_classified';
  corrects_statement_ids?: string[];
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
  id: string; // e.g. E01, E02
  label: string;
  claimed_source: string; // e.g., "Adobe", "Bank of America", "User", "Unspecified"
  acquisition_method: AcquisitionMethod;
  input_form: InputForm;
  evidence_time?: string | null;
  received_at?: string;
  subject_object_ids: string[]; // e.g. ["Account: #SUB-9941", "Order: #ORD-8812"]
  content: string; // extracted or supplied text
  content_summary?: string; // AI generated inspection summary
  raw_submission?: RawSubmission;
  
  disposition?: 'supports_finding' | 'challenges_finding' | 'corrects_statement' | 'supports_gap' | 'irrelevant' | 'not_yet_classified';
  disposition_reason?: string;

  // Provenance & inspection
  source_attribution: string;
  case_object_match: string;
  case_object_match_status?: 'matched' | 'mismatched' | 'unclear' | 'not_assessed';
  completeness_context: string;
  integrity_signals: string;

  corroborated_by?: string[];
  qualified_by?: string[];
  conflicted_by?: string[];
  limitations: string[];

  // Local presentation/attachment properties
  file_name?: string;
  file_type?: string;
  file_data_url?: string;
}

export interface CaseEvent {
  id: string; // e.g. EV01
  time: string; // Exact, date only, approximate, or "Unknown"
  actor: string;
  action: string;
  target: string;
  effect: string;
  evidence_ids: string[];
  user_statement_ids?: string[];
  assessment: AssessmentState;
  is_user_reported_only?: boolean;
}

export interface Claim {
  id: string; // e.g. C01
  text: string;
  actor: string;
  action: string;
  target: string;
  time: string;
  supporting_evidence: string[];
  qualifying_evidence: string[];
  conflicting_evidence: string[];
  user_statement_ids?: string[];
  assessment: AssessmentState;
  reasoning: string;
  scope: string;
  limits: string[];
  causal_relationship: 'established' | 'unresolved' | 'not_supported' | 'none';
}

export interface EvidenceGap {
  id: string; // e.g. G01
  what_is_unknown: string;
  why_it_matters: string;
  what_evidence_could_resolve_it: string;
  where_how_to_obtain: string;
  what_not_to_over_collect: string;
  target_claim_ids?: string[]; // Structural link Claim -> Gap
  status?: GapStatus;
  resolution_reason?: string;
  resolution_evidence_ids?: string[];
}

export interface NextAction {
  id: string; // e.g. A01
  title: string;
  description: string;
  target_gap_id: string; // Structural link Action -> Gap
  priority: 'high' | 'medium' | 'low';
}

export interface AnalysisSummary {
  epistemic_warning?: string;
  total_evidence_count: number;
  established_claims_count: number;
  unresolved_claims_count: number;
  conflicted_claims_count: number;
  user_reported_claims_count: number;
  timeline_span?: string;
  unresolved_questions_count?: number;
  revision_delta_summary?: string;
}

export interface CaseRevision {
  revision_id: string; // e.g. R01, R02
  created_at: string;
  input_statement_ids: string[];
  input_evidence_ids: string[];
  events: CaseEvent[];
  claims: Claim[];
  gaps: EvidenceGap[];
  actions: NextAction[];
  summary: AnalysisSummary;
  model_id?: string;
  reasoning_contract_version?: string;
  schema_version?: string;
  revision_delta_summary?: string;
}

export interface AttachmentFile {
  id: string;
  name: string;
  type: string;
  dataUrl: string; // base64 data url
  size?: number;
  extractedText?: string;
  sha256_hash?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  attachments?: AttachmentFile[];
  timestamp: string;
  revision_id?: string;
  summary_snapshot?: {
    evidence_count: number;
    established_count: number;
    gap_count: number;
  };
  isAnalyzing?: boolean;
  error?: string;
}

export interface LegacyCaseData {
  id: string;
  case_number: string;
  title: string;
  objective: string;
  user_story?: string;
  statements: UserStatement[];
  evidence: EvidenceItem[];
  current_revision_id?: string;
  revisions?: CaseRevision[];
  events: CaseEvent[];
  claims: Claim[];
  gaps: EvidenceGap[];
  actions: NextAction[];
  summary?: AnalysisSummary;
  is_archived?: boolean;
  locale?: string;
}

export interface PresentationCaseData {
  id: string;
  case_number: string;
  title: string;
  objective: string;
  user_story?: string;
  statements: UserStatement[];
  evidence: EvidenceItem[];
  current_revision_id?: string;
  events: CaseEvent[];
  claims: Claim[];
  gaps: EvidenceGap[];
  actions: NextAction[];
  summary?: AnalysisSummary;
  is_archived?: boolean;
  locale?: string;
}
