import { z } from 'zod';
import {
  CaseIdSchema,
  EvidenceIdSchema,
  ModelRunIdSchema,
  RevisionIdSchema,
  StructuralInstantSchema,
  parseLedgerV3,
} from '../ledger/schema';
import type {
  CaseId,
  EvidenceId,
  LedgerV3Case,
  ModelRunId,
  RevisionId,
  StructuralInstant,
} from '../ledger/types';
import type { AuthorityKind, RetrievalStatus } from '../retrieval/types';

export type ModelRunStatus = 'accepted' | 'rejected' | 'provider_error';
export type ModelRunMode = 'analysis_only' | 'web_assisted';

export interface ModelRunAudit {
  id: ModelRunId;
  case_id: CaseId;
  client_request_id: string;
  parent_revision_id: RevisionId | null;
  proposed_revision_id: RevisionId;
  committed_revision_id: RevisionId | null;
  run_mode: ModelRunMode;
  provider: 'google-gemini' | 'deterministic-replay';
  model_id: string;
  prompt_version: 'explainable-trust-proposal-v1' | 'explainable-trust-analysis-v2' | 'explainable-trust-analysis-v3' | 'explainable-trust-analysis-v4' | 'explainable-trust-analysis-v5';
  started_at: StructuralInstant;
  finished_at: StructuralInstant;
  status: ModelRunStatus;
  raw_response_text: string | null;
  validation_errors: string[];
  validation_warnings: string[];
  reconciliation_trace?: {
    converted_adds_to_updates: number;
    canonical_refs_retargeted: number;
  };
  retrieval_trace?: {
    provider: 'none' | 'tavily';
    product: 'none' | 'search';
    status: RetrievalStatus;
    requests: Array<{
      request_id: string;
      public_question: string;
      search_query: string;
      authority_entity: string;
      authority_kind: AuthorityKind;
      official_domains: string[];
      case_specific_exclusion: string;
    }>;
    executed_queries: string[];
    admitted_evidence_ids: EvidenceId[];
    rejected_candidates: Array<{
      reason_code: string;
    }>;
    provider_request_ids: string[];
    credits_used: number | null;
    failure_reason: string | null;
  };
}

const RetrievalTraceSchema = z.object({
  provider: z.enum(['none', 'tavily']).default('none'),
  product: z.enum(['none', 'search']).default('none'),
  status: z.enum(['not_requested', 'no_public_need', 'completed', 'no_authoritative_source', 'blocked', 'provider_error']),
  requests: z.array(z.object({
    request_id: z.string().regex(/^RQ[0-9]{2}$/),
    public_question: z.string(),
    search_query: z.string(),
    authority_entity: z.string(),
    authority_kind: z.enum(['first_party_official', 'public_authority']),
    official_domains: z.array(z.string()).default([]),
    case_specific_exclusion: z.string(),
  }).strict()),
  executed_queries: z.array(z.string()),
  admitted_evidence_ids: z.array(EvidenceIdSchema),
  rejected_candidates: z.array(z.object({
    reason_code: z.string(),
  }).strict()),
  provider_request_ids: z.array(z.string()).default([]),
  credits_used: z.number().nonnegative().nullable().default(null),
  failure_reason: z.string().nullable(),
}).strict();

export const ModelRunAuditSchema = z.object({
  id: ModelRunIdSchema,
  case_id: CaseIdSchema,
  client_request_id: z.string().min(1),
  parent_revision_id: RevisionIdSchema.nullable(),
  proposed_revision_id: RevisionIdSchema,
  committed_revision_id: RevisionIdSchema.nullable(),
  run_mode: z.enum(['analysis_only', 'web_assisted']).default('analysis_only'),
  provider: z.enum(['google-gemini', 'deterministic-replay']),
  // Keep historical model/prompt IDs readable so upgrading Live does not
  // invalidate model-run audits already stored in IndexedDB.
  model_id: z.string().min(1),
  prompt_version: z.enum([
    'explainable-trust-proposal-v1',
    'explainable-trust-analysis-v2',
    'explainable-trust-analysis-v3',
    'explainable-trust-analysis-v4',
    'explainable-trust-analysis-v5',
  ]),
  started_at: StructuralInstantSchema,
  finished_at: StructuralInstantSchema,
  status: z.enum(['accepted', 'rejected', 'provider_error']),
  raw_response_text: z.string().nullable(),
  validation_errors: z.array(z.string()),
  validation_warnings: z.array(z.string()).default([]),
  reconciliation_trace: z.object({
    converted_adds_to_updates: z.number().int().nonnegative(),
    canonical_refs_retargeted: z.number().int().nonnegative(),
  }).strict().optional(),
  retrieval_trace: RetrievalTraceSchema.optional(),
}).strict().superRefine((value, context) => {
  if (value.status === 'accepted' && value.committed_revision_id !== value.proposed_revision_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Accepted run must commit its proposed revision' });
  }
  if (value.status !== 'accepted' && value.committed_revision_id !== null) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Rejected/provider-error run cannot commit a revision' });
  }
});

export function parseModelRunAudit(raw: unknown): ModelRunAudit {
  if (typeof raw === 'object' && raw !== null && !Object.prototype.hasOwnProperty.call(raw, 'run_mode')) {
    const record = raw as Record<string, unknown>;
    const retrieval = typeof record.retrieval_trace === 'object' && record.retrieval_trace !== null
      ? record.retrieval_trace as Record<string, unknown>
      : null;
    const inferredMode: ModelRunMode = retrieval !== null && retrieval.status !== 'not_requested'
      ? 'web_assisted'
      : 'analysis_only';
    return ModelRunAuditSchema.parse({ ...record, run_mode: inferredMode }) as ModelRunAudit;
  }
  return ModelRunAuditSchema.parse(raw) as ModelRunAudit;
}

export interface AcceptedIntakeResponse {
  success: true;
  ledger: LedgerV3Case;
  run: ModelRunAudit;
}

export interface RejectedIntakeResponse {
  success: false;
  run: ModelRunAudit;
  error: {
    code: string;
    message: string;
  };
}

export type IntakeResponse = AcceptedIntakeResponse | RejectedIntakeResponse;

export function parseIntakeResponse(raw: unknown): IntakeResponse {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid intake response envelope');
  }
  const envelope = raw as Record<string, unknown>;
  const run = parseModelRunAudit(envelope.run);

  if (envelope.success === true) {
    const ledger = parseLedgerV3(envelope.ledger);
    if (run.status !== 'accepted') {
      throw new Error('Accepted response contains a non-accepted model run');
    }
    if (ledger.id !== run.case_id || ledger.current_revision_id !== run.committed_revision_id) {
      throw new Error('Accepted response ledger/run identity mismatch');
    }
    return { success: true, ledger, run };
  }

  if (envelope.success !== false) {
    throw new Error('Intake response missing success discriminant');
  }
  if (run.status === 'accepted') {
    throw new Error('Rejected response contains an accepted model run');
  }
  if (typeof envelope.error !== 'object' || envelope.error === null) {
    throw new Error('Rejected response missing error');
  }
  const error = envelope.error as Record<string, unknown>;
  if (typeof error.code !== 'string' || typeof error.message !== 'string') {
    throw new Error('Rejected response error is malformed');
  }
  if ('ledger' in envelope) {
    throw new Error('Rejected response must not contain a replacement ledger');
  }
  return {
    success: false,
    run,
    error: { code: error.code, message: error.message },
  };
}
