import type { LedgerV3Case, SourceId } from '../ledger/types.js';
import type { ModelRunAudit } from '../runtime/modelRun.js';
import type { CaseUiMetadata, PersistedBlob } from '../storage/ledgerStore.js';
import type {
  AttachmentFile,
  ChatMessage,
  EvidenceItem,
  PresentationCaseData,
  UserStatement,
} from '../types.js';

function receivedAt(ledger: LedgerV3Case, intakeId: string): string {
  return ledger.intake_ledger.find((intake) => intake.id === intakeId)?.received_at ?? ledger.created_at;
}

function latestDisposition(ledger: LedgerV3Case, sourceId: SourceId) {
  return [...ledger.relationships].reverse().find((relationship) => relationship.source_id === sourceId);
}

export function projectLedger(input: {
  ledger: LedgerV3Case;
  runs: ModelRunAudit[];
  blobs: PersistedBlob[];
  metadata: CaseUiMetadata;
  locale: string;
}): PresentationCaseData {
  const { ledger, metadata, locale } = input;
  const head = ledger.current_revision_id === null
    ? null
    : ledger.revisions.find((revision) => revision.id === ledger.current_revision_id) ?? null;
  const blobByRef = new Map(input.blobs.map((blob) => [blob.blob_ref, blob.data_url]));
  const inspectionByEvidence = new Map(head?.inspections.map((inspection) => [inspection.evidence_id, inspection]) ?? []);

  const statements: UserStatement[] = ledger.statements.map((statement) => {
    const intake = ledger.intake_ledger.find((item) => item.id === statement.source_intake_id);
    const disposition = latestDisposition(ledger, statement.id);
    return {
      id: statement.id,
      text: statement.text,
      submitted_at: receivedAt(ledger, statement.source_intake_id),
      attachment_ids: intake?.parts.filter((part) => part.kind === 'evidence').map((part) => part.evidence_id) ?? [],
      disposition: disposition?.relationship_type,
      disposition_reason: disposition?.reason,
    };
  });

  const evidence: EvidenceItem[] = ledger.evidence.map((item) => {
    const inspection = inspectionByEvidence.get(item.id);
    const disposition = latestDisposition(ledger, item.id);
    const blob = item.content.blob;
    return {
      id: item.id,
      label: item.label,
      claimed_source: item.claimed_source,
      acquisition_method: item.acquisition_method,
      input_form: item.input_form,
      evidence_time: item.original_domain_time,
      received_at: receivedAt(ledger, item.source_intake_id),
      subject_object_ids: [...item.subject_object_ids],
      content: item.content.raw_text ?? item.content.extracted_text ?? '',
      ...(blob === null ? {} : {
        raw_submission: {
          attachment_id: blob.blob_ref,
          acquisition_method: item.acquisition_method,
          received_at: receivedAt(ledger, item.source_intake_id),
          file_name: blob.submitted_filename,
          file_type: blob.mime_type,
          byte_size: blob.byte_size,
          sha256_hash: blob.sha256,
          raw_preserved_state: 'preserved_bytes' as const,
        },
        file_name: blob.submitted_filename,
        file_type: blob.mime_type,
        file_data_url: blobByRef.get(blob.blob_ref),
      }),
      disposition: disposition?.relationship_type,
      disposition_reason: disposition?.reason,
      source_attribution: inspection?.source_attribution ?? '',
      case_object_match: inspection?.case_object_match ?? '',
      case_object_match_status: inspection?.match_status,
      completeness_context: inspection?.completeness_context ?? '',
      integrity_signals: inspection?.integrity_signals ?? '',
      limitations: inspection === undefined ? [] : [...inspection.limitations],
    };
  });

  return {
    id: ledger.id,
    case_number: metadata.display_case_number,
    title: metadata.display_title,
    objective: head?.objective ?? '',
    statements,
    evidence,
    current_revision_id: ledger.current_revision_id ?? undefined,
    events: (head?.events ?? []).map((event) => ({
      id: event.id,
      time: event.domain_time,
      actor: event.actor,
      action: event.action,
      target: event.target,
      effect: event.effect,
      evidence_ids: event.source_support_ids.filter((id) => id.startsWith('E')),
      user_statement_ids: event.source_support_ids.filter((id) => id.startsWith('U')),
      assessment: event.assessment,
    })),
    claims: (head?.claims ?? []).map((claim) => ({
      id: claim.id,
      text: claim.proposition,
      actor: claim.actor,
      action: claim.action,
      target: claim.target,
      time: claim.domain_time,
      supporting_evidence: claim.supporting_source_ids.filter((id) => id.startsWith('E')),
      qualifying_evidence: claim.qualifying_source_ids.filter((id) => id.startsWith('E')),
      conflicting_evidence: claim.conflicting_source_ids.filter((id) => id.startsWith('E')),
      user_statement_ids: [
        ...claim.supporting_source_ids,
        ...claim.qualifying_source_ids,
        ...claim.conflicting_source_ids,
      ].filter((id, index, all) => id.startsWith('U') && all.indexOf(id) === index),
      assessment: claim.assessment,
      reasoning: claim.reasoning,
      scope: claim.scope,
      limits: [...claim.limits],
    })),
    gaps: (head?.gaps ?? []).map((gap) => ({
      id: gap.id,
      what_is_unknown: gap.question,
      why_it_matters: gap.relevance,
      what_evidence_could_resolve_it: gap.resolving_evidence,
      where_how_to_obtain: gap.acquisition_guidance,
      what_not_to_over_collect: gap.collection_boundary,
      target_claim_ids: [...gap.target_claim_ids],
      status: gap.status,
      resolution_reason: gap.transition?.reason,
      resolution_evidence_ids: gap.transition?.supporting_source_ids.filter((id) => id.startsWith('E')),
    })),
    actions: (head?.actions ?? []).map((action) => ({
      id: action.id,
      title: action.title,
      description: action.description,
      target_gap_id: action.target_gap_ids[0] ?? '',
      target_gap_ids: [...action.target_gap_ids],
      priority: action.priority,
      status: action.status,
    })),
    summary: head === null ? undefined : {
      ...head.summary,
      unresolved_questions_count: head.gaps.filter((gap) => gap.status === 'open').length,
    },
    is_archived: metadata.is_archived,
    locale,
    revisions: ledger.revisions.map((revision) => ({
      id: revision.id,
      parent_id: revision.parent_id,
      created_at: revision.created_at,
      explanation: revision.explanation,
      accepted_model_run_id: revision.accepted_model_run_id,
      delta_entries: revision.delta.entries.map((entry) => ({
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        operation: entry.operation,
        reason: entry.reason,
        source_ids: [...entry.source_ids],
      })),
    })),
    model_runs: input.runs.filter((run) => run.case_id === ledger.id),
    authoritative_record: ledger,
  };
}

export function deriveChatMessages(
  ledger: LedgerV3Case,
  blobs: PersistedBlob[]
): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const evidenceById = new Map(ledger.evidence.map((item) => [item.id, item]));
  const blobByRef = new Map(blobs.map((blob) => [blob.blob_ref, blob.data_url]));

  for (const revision of ledger.revisions) {
    for (const intakeId of revision.triggering_intake_ids) {
      const intake = ledger.intake_ledger.find((item) => item.id === intakeId);
      if (intake === undefined) continue;
      const statementTexts = intake.parts
        .filter((part) => part.kind === 'statement')
        .map((part) => part.raw_text);
      const attachments: AttachmentFile[] = intake.parts
        .filter((part) => part.kind === 'evidence')
        .map((part) => evidenceById.get(part.evidence_id))
        .filter((item) => item !== undefined && item.content.blob !== null)
        .map((item) => ({
          id: item.id,
          name: item.content.blob!.submitted_filename,
          type: item.content.blob!.mime_type,
          size: item.content.blob!.byte_size,
          dataUrl: blobByRef.get(item.content.blob!.blob_ref) ?? '',
          extractedText: item.content.extracted_text ?? undefined,
        }));
      const fileLabels = intake.parts
        .filter((part) => part.kind === 'evidence')
        .map((part) => evidenceById.get(part.evidence_id)?.label)
        .filter((label) => label !== undefined);
      messages.push({
        id: `intake-${intake.id}`,
        role: 'user',
        text: statementTexts.length > 0 ? statementTexts.join('\n\n') : `Submitted files: ${fileLabels.join(', ')}`,
        attachments,
        timestamp: new Date(intake.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
    messages.push({
      id: `revision-${revision.id}`,
      role: 'assistant',
      text: revision.assistant_message,
      timestamp: new Date(revision.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      revision_id: revision.id,
    });
  }
  return messages;
}
