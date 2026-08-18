import { createHash } from 'node:crypto';
import { applyProposal, type PreparedLedgerIntake } from '../src/ledger/applyProposal.js';
import { createLedgerIdAllocator } from '../src/ledger/idAllocator.js';
import {
  BlobRefSchema,
  ByteSizeSchema,
  DomainTimeTextSchema,
  EvidenceIdSchema,
  MimeTypeSchema,
  PreservedNonBlankTextSchema,
  Sha256Schema,
  StructuralInstantSchema,
  parseLedgerV3,
} from '../src/ledger/schema.js';
import type {
  CanonicalEvidence,
  CanonicalStatement,
  IntakePart,
  LedgerV3Case,
  SemanticText,
} from '../src/ledger/types.js';
import { parseProviderProposal } from '../src/provider/proposalSchema.js';
import { reconcileProposal } from '../src/provider/reconcileProposal.js';
import { assertProposalPreservesSourceLanguage } from '../src/provider/languagePolicy.js';
import {
  parseModelRunAudit,
  type IntakeResponse,
  type ModelRunAudit,
  type ModelRunMode,
} from '../src/runtime/modelRun.js';
import { INFERENCE_MODEL } from './inference/modelConfig.js';
import {
  decodeProviderGenerationProposal,
  runProposalProvider,
  type InferenceMode,
  type ProposalProvider,
  type ProviderAttachment,
} from './proposalProvider.js';
import {
  runAuthoritativeRetrieval,
  type AuthoritativeRetriever,
} from './authoritativeRetrieval.js';
import { emptyRetrievalResult } from '../src/retrieval/types.js';
import { cleanAndParseJson } from './inference/jsonUtils.js';

export interface IntakeAttachmentPayload {
  name: string;
  type: string;
  size?: number;
  dataUrl: string;
  extractedText?: string;
}

export interface IntakePayload {
  prior_ledger: unknown;
  client_request_id: string;
  message?: string;
  attachments?: unknown[];
  locale?: string;
  inference_mode?: string;
  run_mode?: string;
}

export interface IntakeServiceDependencies {
  provider?: ProposalProvider;
  retriever?: AuthoritativeRetriever;
  now?: () => Date;
}

function nextInstant(now: Date, parent: LedgerV3Case): ReturnType<typeof StructuralInstantSchema.parse> {
  const parentInstant = parent.current_revision_id === null
    ? parent.created_at
    : parent.revisions.find((revision) => revision.id === parent.current_revision_id)?.created_at ?? parent.created_at;
  const candidate = now.getTime() > Date.parse(parentInstant)
    ? now
    : new Date(Date.parse(parentInstant) + 1);
  return StructuralInstantSchema.parse(candidate.toISOString());
}

function parseAttachment(raw: unknown): IntakeAttachmentPayload {
  if (typeof raw !== 'object' || raw === null) throw new Error('Attachment must be an object.');
  const value = raw as Record<string, unknown>;
  if (typeof value.name !== 'string' || value.name.trim().length === 0) throw new Error('Attachment filename is required.');
  if (typeof value.type !== 'string') throw new Error('Attachment MIME type is required.');
  MimeTypeSchema.parse(value.type);
  if (typeof value.dataUrl !== 'string' || !value.dataUrl.startsWith('data:')) throw new Error('Attachment data URL is required.');
  if (value.size !== undefined && (typeof value.size !== 'number' || !Number.isSafeInteger(value.size) || value.size < 0)) {
    throw new Error('Attachment size is invalid.');
  }
  if (value.extractedText !== undefined && typeof value.extractedText !== 'string') {
    throw new Error('Attachment extracted text is invalid.');
  }
  return {
    name: value.name,
    type: value.type,
    size: value.size as number | undefined,
    dataUrl: value.dataUrl,
    extractedText: value.extractedText as string | undefined,
  };
}

function decodeAttachment(attachment: IntakeAttachmentPayload): Buffer {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\r\n]+)$/s.exec(attachment.dataUrl);
  if (match === null) throw new Error('Only base64 data URLs are accepted for attachments.');
  if (match[1] !== attachment.type) throw new Error('Attachment MIME type does not match its data URL.');
  const bytes = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (attachment.size !== undefined && attachment.size !== bytes.byteLength) {
    throw new Error('Attachment byte size does not match its content.');
  }
  return bytes;
}

function inputForm(mimeType: string, filename: string): CanonicalEvidence['input_form'] {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'message/rfc822') return 'email_text';
  if (/receipt/i.test(filename)) return 'receipt';
  if (mimeType.startsWith('text/')) return 'document';
  return 'other';
}


function validationContext(parent: LedgerV3Case, prepared: PreparedLedgerIntake) {
  const head = parent.current_revision_id === null
    ? null
    : parent.revisions.find((revision) => revision.id === parent.current_revision_id) ?? null;
  return {
    availableSourceIds: new Set<LedgerV3Case['relationships'][number]['source_id']>([
      ...[...parent.statements, ...prepared.statements].map((item) => item.id),
      ...[...parent.evidence, ...prepared.evidence].map((item) => item.id),
    ]),
    existingClaimIds: new Set(head?.claims.map((item) => item.id) ?? []),
    existingGapIds: new Set(head?.gaps.map((item) => item.id) ?? []),
    existingEventIds: new Set(head?.events.map((item) => item.id) ?? []),
    existingActionIds: new Set(head?.actions.map((item) => item.id) ?? []),
    serverOwnedEvidenceIds: new Set(
      [...parent.evidence, ...prepared.evidence]
        .filter((item) => item.acquisition_method === 'authoritative_web_retrieval')
        .map((item) => item.id)
    ),
  };
}

function rejectedRun(input: {
  base: Omit<ModelRunAudit, 'finished_at' | 'status' | 'committed_revision_id' | 'validation_errors'>;
  finishedAt: ReturnType<typeof StructuralInstantSchema.parse>;
  status: 'rejected' | 'provider_error';
  errors: string[];
}): ModelRunAudit {
  return parseModelRunAudit({
    ...input.base,
    finished_at: input.finishedAt,
    status: input.status,
    committed_revision_id: null,
    validation_errors: input.errors,
  });
}

export function createIntakeService(dependencies: IntakeServiceDependencies = {}) {
  const provider = dependencies.provider ?? runProposalProvider;
  const retriever = dependencies.retriever ?? runAuthoritativeRetrieval;
  const now = dependencies.now ?? (() => new Date());

  return async function runIntake(payload: IntakePayload): Promise<IntakeResponse> {
    const parent = parseLedgerV3(payload.prior_ledger);
    if (typeof payload.client_request_id !== 'string' || payload.client_request_id.trim().length === 0) {
      throw new Error('client_request_id is required.');
    }
    const message = typeof payload.message === 'string' ? payload.message : '';
    const rawAttachments = Array.isArray(payload.attachments) ? payload.attachments : [];
    const attachments = rawAttachments.map(parseAttachment);
    if (message.trim().length === 0 && attachments.length === 0) {
      throw new Error('An intake requires a non-blank statement or at least one attachment.');
    }
    // Live is the product default. Replay remains an explicit server-side test
    // path so deterministic regression fixtures do not require credentials.
    const mode: InferenceMode = payload.inference_mode === 'replay' ? 'replay' : 'live';
    const requestedRunMode = payload.run_mode ?? 'analysis_only';
    if (requestedRunMode !== 'analysis_only' && requestedRunMode !== 'web_assisted') {
      throw new Error('run_mode must be analysis_only or web_assisted.');
    }
    const runMode: ModelRunMode = mode === 'replay' ? 'analysis_only' : requestedRunMode;

    const allocator = createLedgerIdAllocator(parent);
    const revisionId = allocator.nextRevisionId();
    const intakeId = allocator.nextIntakeId();
    const modelRunId = allocator.nextModelRunId();
    const createdAt = nextInstant(now(), parent);
    const statements: CanonicalStatement[] = [];
    const evidence: CanonicalEvidence[] = [];
    const parts: IntakePart[] = [];

    if (message.trim().length > 0) {
      const statementId = allocator.nextStatementId();
      const text = PreservedNonBlankTextSchema.parse(message);
      statements.push({ id: statementId, source_intake_id: intakeId, text });
      parts.push({ kind: 'statement', statement_id: statementId, raw_text: text });
    }

    const providerAttachments: ProviderAttachment[] = [];
    for (const attachment of attachments) {
      const evidenceId = allocator.nextEvidenceId();
      const bytes = decodeAttachment(attachment);
      const blobRef = BlobRefSchema.parse(`BLOB_${parent.id}_${evidenceId}_${intakeId}`);
      const extracted = attachment.extractedText?.trim()
        ? PreservedNonBlankTextSchema.parse(attachment.extractedText)
        : null;
      evidence.push({
        id: EvidenceIdSchema.parse(evidenceId),
        source_intake_id: intakeId,
        label: PreservedNonBlankTextSchema.parse(attachment.name),
        claimed_source: PreservedNonBlankTextSchema.parse('Submitted directly by the user'),
        acquisition_method: 'user_upload',
        input_form: inputForm(attachment.type, attachment.name),
        original_domain_time: null,
        subject_object_ids: [],
        content: {
          raw_text: null,
          extracted_text: extracted,
          blob: {
            blob_ref: blobRef,
            submitted_filename: PreservedNonBlankTextSchema.parse(attachment.name),
            mime_type: MimeTypeSchema.parse(attachment.type),
            byte_size: ByteSizeSchema.parse(bytes.byteLength),
            sha256: Sha256Schema.parse('sha256:' + createHash('sha256').update(bytes).digest('hex')),
          },
        },
      });
      parts.push({ kind: 'evidence', evidence_id: evidenceId });
      providerAttachments.push({
        evidence_id: evidenceId,
        name: attachment.name,
        mime_type: attachment.type,
        data_url: attachment.dataUrl,
      });
    }

    const prepared: PreparedLedgerIntake = {
      intake: { id: intakeId, received_at: createdAt, parts },
      statements,
      evidence,
      revision_id: revisionId,
      model_run_id: modelRunId,
      created_at: createdAt,
      objective: (parent.revisions[0]?.objective ?? 'Assess what the submitted record supports and leaves unresolved.') as SemanticText,
    };

    const startedAt = StructuralInstantSchema.parse(now().toISOString());
    let retrieval = emptyRetrievalResult('not_requested');
    if (mode === 'live' && runMode === 'web_assisted') {
      try {
        retrieval = await retriever({
          ledger: parent,
          prepared,
          message,
          attachments: providerAttachments,
        });
      } catch (error: unknown) {
        retrieval = {
          ...emptyRetrievalResult('provider_error'),
          failure_reason: error instanceof Error ? error.message : 'Authoritative retrieval failed.',
        };
      }
    }

    for (const source of retrieval.admitted_sources) {
      const evidenceId = allocator.nextEvidenceId();
      const retrievedAt = StructuralInstantSchema.parse(now().toISOString());
      source.evidence_id = evidenceId;
      evidence.push({
        id: evidenceId,
        source_intake_id: intakeId,
        label: PreservedNonBlankTextSchema.parse(source.page_title),
        claimed_source: PreservedNonBlankTextSchema.parse(source.publisher),
        acquisition_method: 'authoritative_web_retrieval',
        input_form: 'web_excerpt',
        original_domain_time: source.published_or_updated_at === null
          ? null
          : DomainTimeTextSchema.parse(source.published_or_updated_at),
        subject_object_ids: [],
        content: {
          raw_text: PreservedNonBlankTextSchema.parse(source.source_excerpt),
          extracted_text: null,
          blob: null,
        },
        web_provenance: {
          publisher: PreservedNonBlankTextSchema.parse(source.publisher),
          page_title: PreservedNonBlankTextSchema.parse(source.page_title),
          source_url: source.source_url,
          published_or_updated_at: source.published_or_updated_at === null
            ? null
            : DomainTimeTextSchema.parse(source.published_or_updated_at),
          retrieved_at: retrievedAt,
          authority_kind: source.authority_kind,
          authority_entity: PreservedNonBlankTextSchema.parse(source.authority_entity),
          authority_scope: PreservedNonBlankTextSchema.parse(source.authority_scope),
          search_query: PreservedNonBlankTextSchema.parse(source.search_query),
        },
      });
      parts.push({ kind: 'evidence', evidence_id: evidenceId });
    }

    const runBase: Omit<ModelRunAudit, 'finished_at' | 'status' | 'committed_revision_id' | 'validation_errors'> = {
      id: modelRunId,
      case_id: parent.id,
      client_request_id: payload.client_request_id,
      parent_revision_id: parent.current_revision_id,
      proposed_revision_id: revisionId,
      run_mode: runMode,
      provider: mode === 'live' ? 'google-gemini' : 'deterministic-replay',
      model_id: INFERENCE_MODEL.modelId,
      prompt_version: INFERENCE_MODEL.promptVersion,
      started_at: startedAt,
      raw_response_text: null,
      validation_warnings: [],
      retrieval_trace: {
        provider: retrieval.provider,
        product: retrieval.product,
        status: retrieval.status,
        requests: retrieval.requests.map((request) => ({ ...request })),
        executed_queries: [...retrieval.executed_queries],
        admitted_evidence_ids: retrieval.admitted_sources.flatMap((source) =>
          source.evidence_id === undefined ? [] : [source.evidence_id]
        ),
        rejected_candidates: retrieval.rejected_candidates.map((candidate) => ({
          reason_code: candidate.reason_code,
        })),
        provider_request_ids: [...retrieval.provider_request_ids],
        credits_used: retrieval.credits_used,
        failure_reason: retrieval.failure_reason,
      },
    };

    let result: Awaited<ReturnType<ProposalProvider>>;
    try {
      result = await provider(mode, {
        ledger: parent,
        prepared,
        message,
        attachments: providerAttachments,
        retrieval,
      });
    } catch (error: unknown) {
      const messageText = error instanceof Error ? error.message : 'Provider call failed.';
      const run = rejectedRun({
        base: runBase,
        finishedAt: StructuralInstantSchema.parse(now().toISOString()),
        status: 'provider_error',
        errors: [messageText],
      });
      return { success: false, run, error: { code: 'PROVIDER_ERROR', message: messageText } };
    }

    const baseWithRaw = { ...runBase, provider: result.provider, raw_response_text: result.raw_response_text };
    try {
      const providerOutput = decodeProviderGenerationProposal(cleanAndParseJson(result.raw_response_text));
      const parsedProposal = parseProviderProposal(providerOutput, validationContext(parent, prepared));
      const languageWarning = assertProposalPreservesSourceLanguage({
        sourceTexts: [
          message,
          ...prepared.evidence.flatMap((item) => [
            ...(item.acquisition_method === 'authoritative_web_retrieval'
              ? []
              : [item.content.raw_text ?? '', item.content.extracted_text ?? '']),
          ]),
        ],
        proposal: parsedProposal,
      });
      if (languageWarning !== null) {
        throw new Error(languageWarning);
      }
      const reconciled = reconcileProposal({
        ledger: parent,
        message,
        proposal: parsedProposal,
      });
      const ledger = applyProposal({ parent, prepared, proposal: reconciled.proposal });
      const run = parseModelRunAudit({
        ...baseWithRaw,
        reconciliation_trace: reconciled.trace,
        finished_at: StructuralInstantSchema.parse(now().toISOString()),
        status: 'accepted',
        committed_revision_id: revisionId,
        validation_errors: [],
      });
      return { success: true, ledger, run };
    } catch (error: unknown) {
      const messageText = error instanceof Error ? error.message : 'Proposal validation failed.';
      const run = rejectedRun({
        base: baseWithRaw,
        finishedAt: StructuralInstantSchema.parse(now().toISOString()),
        status: 'rejected',
        errors: [messageText],
      });
      return { success: false, run, error: { code: 'PROPOSAL_REJECTED', message: messageText } };
    }
  };
}
