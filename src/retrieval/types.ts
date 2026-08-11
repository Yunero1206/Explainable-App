import type { EvidenceId } from '../ledger/types.js';

export type AuthorityKind = 'first_party_official' | 'public_authority';

export type RetrievalStatus =
  | 'not_requested'
  | 'no_public_need'
  | 'completed'
  | 'no_authoritative_source'
  | 'blocked'
  | 'provider_error';

export interface PublicRetrievalRequest {
  request_id: string;
  public_question: string;
  search_query: string;
  authority_entity: string;
  authority_kind: AuthorityKind;
  case_specific_exclusion: string;
}

export interface RetrievedWebCandidate {
  request_id: string;
  publisher: string;
  page_title: string;
  source_url: string;
  source_excerpt: string;
  published_or_updated_at: string | null;
  authority_entity: string;
  authority_kind: AuthorityKind;
  authority_scope: string;
}

export interface RejectedWebCandidate {
  source_url: string | null;
  reason_code:
    | 'unknown_request'
    | 'authority_mismatch'
    | 'disallowed_host'
    | 'not_official_domain'
    | 'not_grounded'
    | 'invalid_url'
    | 'invalid_excerpt'
    | 'duplicate_url';
}

export interface AdmittedWebSource extends RetrievedWebCandidate {
  search_query: string;
  evidence_id?: EvidenceId;
}

export interface AuthoritativeRetrievalResult {
  status: RetrievalStatus;
  requests: PublicRetrievalRequest[];
  executed_queries: string[];
  admitted_sources: AdmittedWebSource[];
  rejected_candidates: RejectedWebCandidate[];
  failure_reason: string | null;
}

export function emptyRetrievalResult(status: RetrievalStatus): AuthoritativeRetrievalResult {
  return {
    status,
    requests: [],
    executed_queries: [],
    admitted_sources: [],
    rejected_candidates: [],
    failure_reason: null,
  };
}
