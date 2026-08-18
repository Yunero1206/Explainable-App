import type { LedgerV3Case, Revision, SourceId } from '../ledger/types.js';
import type { ModelRunAudit } from '../runtime/modelRun.js';
import type { CaseUiMetadata, PersistedBlob } from '../storage/ledgerStore.js';
import type {
  AttachmentFile,
  ChatMessage,
  EvidenceItem,
  PresentationCaseData,
  UserStatement,
} from '../types.js';
import { detectContentLanguage, type DetectedContentLanguage } from '../provider/languagePolicy.js';

function receivedAt(ledger: LedgerV3Case, intakeId: string): string {
  return ledger.intake_ledger.find((intake) => intake.id === intakeId)?.received_at ?? ledger.created_at;
}

function latestDisposition(ledger: LedgerV3Case, sourceId: SourceId) {
  return [...ledger.relationships].reverse().find((relationship) => relationship.source_id === sourceId);
}

function unique(values: string[]): string[] {
  return values.filter((value, index, all) => all.indexOf(value) === index);
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
      attachment_ids: intake?.parts
        .filter((part) => part.kind === 'evidence')
        .map((part) => part.evidence_id)
        .filter((id) => ledger.evidence.find((item) => item.id === id)?.acquisition_method !== 'authoritative_web_retrieval') ?? [],
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
      ...(item.web_provenance === undefined ? {} : {
        web_provenance: { ...item.web_provenance },
      }),
    };
  });

  const headClaims = head?.claims ?? [];
  const claims = headClaims.map((claim) => ({
    id: claim.id,
    text: claim.proposition,
    actor: claim.actor,
    action: claim.action,
    target: claim.target,
    time: claim.domain_time,
    supporting_evidence: claim.supporting_source_ids.filter((id) => id.startsWith('E')),
    qualifying_evidence: claim.qualifying_source_ids.filter((id) => id.startsWith('E')),
    conflicting_evidence: claim.conflicting_source_ids.filter((id) => id.startsWith('E')),
    user_statement_ids: unique([
      ...claim.supporting_source_ids,
      ...claim.qualifying_source_ids,
      ...claim.conflicting_source_ids,
    ].filter((id) => id.startsWith('U'))),
    assessment: claim.assessment,
    reasoning: claim.reasoning,
    scope: claim.scope,
    limits: [...claim.limits],
  }));

  const sourceIdsForClaim = (claim: (typeof headClaims)[number]): string[] => unique([
    ...claim.supporting_source_ids,
    ...claim.qualifying_source_ids,
    ...claim.conflicting_source_ids,
  ]);

  const findingIdsForEvent = (event: NonNullable<typeof head>['events'][number]): string[] => {
    if (event.finding_ids !== undefined && event.finding_ids.length > 0) {
      return [...event.finding_ids];
    }

    // Backward-compatible projection for ledgers accepted before Event ->
    // Finding became an explicit edge. Prefer shared provenance plus the same
    // domain time and semantic tuple; never invent a cross-case connection.
    const sourceSet = new Set<string>(event.source_support_ids);
    const sourceCandidates = headClaims.filter((claim) =>
      sourceIdsForClaim(claim).some((sourceId) => sourceSet.has(sourceId))
    );
    const timeCandidates = sourceCandidates.filter((claim) => claim.domain_time === event.domain_time);
    const tupleCandidates = timeCandidates.filter((claim) =>
      claim.actor === event.actor || claim.action === event.action || claim.target === event.target
    );
    const selected = tupleCandidates.length > 0
      ? tupleCandidates
      : timeCandidates.length === 1
        ? timeCandidates
        : sourceCandidates.length === 1
          ? sourceCandidates
          : [];
    return selected.map((claim) => claim.id);
  };

  const events = (head?.events ?? []).map((event) => ({
    id: event.id,
    time: event.domain_time,
    actor: event.actor,
    action: event.action,
    target: event.target,
    effect: event.effect,
    evidence_ids: event.source_support_ids.filter((id) => id.startsWith('E')),
    user_statement_ids: event.source_support_ids.filter((id) => id.startsWith('U')),
    finding_ids: findingIdsForEvent(event),
    assessment: event.assessment,
  }));

  const projectedGaps = (head?.gaps ?? []).map((gap) => {
    const targetClaimIds = [...gap.target_claim_ids];
    const relatedEvents = events.filter((event) =>
      event.finding_ids.some((findingId) => targetClaimIds.includes(findingId as never))
    );
    const targetClaims = claims.filter((claim) => targetClaimIds.includes(claim.id as never));
    const evidenceIds = unique([
      ...relatedEvents.flatMap((event) => event.evidence_ids),
      ...targetClaims.flatMap((claim) => [
        ...claim.supporting_evidence,
        ...claim.qualifying_evidence,
        ...claim.conflicting_evidence,
      ]),
    ]);
    return {
      id: gap.id,
      what_is_unknown: gap.question,
      why_it_matters: gap.relevance,
      what_evidence_could_resolve_it: gap.resolving_evidence,
      where_how_to_obtain: gap.acquisition_guidance,
      what_not_to_over_collect: gap.collection_boundary,
      target_claim_ids: targetClaimIds,
      related_event_ids: relatedEvents.map((event) => event.id),
      evidence_ids: evidenceIds,
      status: gap.status,
      resolution_reason: gap.transition?.reason,
      resolution_evidence_ids: gap.transition?.supporting_source_ids.filter((id) => id.startsWith('E')),
    };
  });

  const actions = (head?.actions ?? []).map((action) => {
    const targetGaps = projectedGaps.filter((gap) => action.target_gap_ids.includes(gap.id as never));
    return {
      id: action.id,
      title: action.title,
      description: action.description,
      target_gap_id: action.target_gap_ids[0] ?? '',
      target_gap_ids: [...action.target_gap_ids],
      related_event_ids: unique(targetGaps.flatMap((gap) => gap.related_event_ids)),
      finding_ids: unique(targetGaps.flatMap((gap) => gap.target_claim_ids)),
      evidence_ids: unique(targetGaps.flatMap((gap) => gap.evidence_ids)),
      priority: action.priority,
      status: action.status,
    };
  });

  const gaps = projectedGaps.map((gap) => ({
    ...gap,
    actions: actions.filter((action) => action.target_gap_ids.includes(gap.id)),
  }));

  return {
    id: ledger.id,
    case_number: metadata.display_case_number,
    title: metadata.display_title,
    objective: head?.objective ?? '',
    statements,
    evidence,
    current_revision_id: ledger.current_revision_id ?? undefined,
    events,
    claims,
    gaps,
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
  blobs: PersistedBlob[],
  caseNumber: string = ledger.case_number,
  _uiLocale: string = 'en'
): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const evidenceById = new Map(ledger.evidence.map((item) => [item.id, item]));
  const blobByRef = new Map(blobs.map((blob) => [blob.blob_ref, blob.data_url]));

  const labelsFor = (sourceText: string) => {
    const language: DetectedContentLanguage = detectContentLanguage(sourceText)?.language ?? 'en';
    return {
      vi: {
        summary: 'Tóm tắt', goal: 'Bạn muốn', recorded: 'Đã ghi vào', timeline: 'Timeline', evidence: 'Evidence',
        noEvidence: 'không có evidence mới; nguồn tường thuật', noChange: 'không thay đổi',
        reasoning: 'Lập luận', stepKinds: { fact: 'Dữ kiện', public_rule: 'Quy tắc công khai', assumption: 'Giả định', derivation: 'Suy luận', scenario: 'Kịch bản', conclusion: 'Kết luận' },
      },
      en: {
        summary: 'Summary', goal: 'You want', recorded: 'Recorded in', timeline: 'Timeline', evidence: 'Evidence',
        noEvidence: 'no new evidence; narrative source', noChange: 'no change',
        reasoning: 'Reasoning', stepKinds: { fact: 'Fact', public_rule: 'Public rule', assumption: 'Assumption', derivation: 'Derivation', scenario: 'Scenario', conclusion: 'Conclusion' },
      },
      es: {
        summary: 'Resumen', goal: 'Quieres', recorded: 'Registrado en', timeline: 'Cronología', evidence: 'Evidencia',
        noEvidence: 'sin evidencia nueva; fuente narrativa', noChange: 'sin cambios',
        reasoning: 'Razonamiento', stepKinds: { fact: 'Hecho', public_rule: 'Regla pública', assumption: 'Supuesto', derivation: 'Deducción', scenario: 'Escenario', conclusion: 'Conclusión' },
      },
      fr: {
        summary: 'Résumé', goal: 'Vous voulez', recorded: 'Enregistré dans', timeline: 'Chronologie', evidence: 'Preuves',
        noEvidence: 'aucune nouvelle preuve; source narrative', noChange: 'aucun changement',
        reasoning: 'Raisonnement', stepKinds: { fact: 'Fait', public_rule: 'Règle publique', assumption: 'Hypothèse', derivation: 'Déduction', scenario: 'Scénario', conclusion: 'Conclusion' },
      },
      'zh-CN': {
        summary: '摘要', goal: '你的目标', recorded: '已记录至', timeline: '时间线', evidence: '证据',
        noEvidence: '无新增证据；叙述来源', noChange: '无变化',
        reasoning: '推理', stepKinds: { fact: '事实', public_rule: '公开规则', assumption: '假设', derivation: '推导', scenario: '情景', conclusion: '结论' },
      },
      ja: {
        summary: '要約', goal: '目的', recorded: '記録先', timeline: 'タイムライン', evidence: 'エビデンス',
        noEvidence: '新しいエビデンスなし・記述ソース', noChange: '変更なし',
        reasoning: '推論', stepKinds: { fact: '事実', public_rule: '公開ルール', assumption: '仮定', derivation: '導出', scenario: 'シナリオ', conclusion: '結論' },
      },
    }[language];
  };

  const acceptedUpdateMessage = (revision: Revision, sourceText: string): string => {
    const labels = labelsFor(sourceText);
    const eventIds = revision.delta.entries
      .filter((entry) => entry.entity_type === 'event')
      .map((entry) => entry.entity_id);
    const evidenceIds = revision.delta.entries
      .filter((entry) => entry.entity_type === 'evidence')
      .map((entry) => entry.entity_id);
    const statementIds = revision.delta.entries
      .filter((entry) => entry.entity_type === 'statement')
      .map((entry) => entry.entity_id);
    const evidenceSummary = evidenceIds.length > 0
      ? evidenceIds.map((id) => {
          const item = evidenceById.get(id as never);
          return `[${id}]${item === undefined ? '' : ` ${item.label}`}`;
        }).join('; ')
      : `${labels.noEvidence} ${statementIds.map((id) => `[${id}]`).join(' ') || '—'}`;
    const timelineSummary = eventIds.length > 0
      ? eventIds.map((id) => `[${id}]`).join(' ')
      : labels.noChange;
    const reasoningLines = revision.reasoning?.steps.map((step) => {
      const references = unique([...step.source_ids, ...step.claim_ids, ...step.gap_ids]);
      const suffix = references.length === 0 ? '' : ` ${references.map((id) => `[${id}]`).join(' ')}`;
      const dependency = step.depends_on.length === 0 ? '' : ` ← ${step.depends_on.join(', ')}`;
      return `${step.id} · ${labels.stepKinds[step.kind]}${dependency}: ${step.text}${suffix}`;
    }) ?? [];

    return [
      revision.assistant_message,
      `${labels.summary}: ${revision.explanation}`,
      `${labels.goal}: ${revision.objective}`,
      ...(reasoningLines.length === 0 ? [] : [`${labels.reasoning}:`, ...reasoningLines]),
      `${labels.recorded} ${caseNumber} · ${labels.timeline} (${eventIds.length}): ${timelineSummary} · ${labels.evidence} (${evidenceIds.length}): ${evidenceSummary}`,
    ].join('\n');
  };

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
        .map((part) => evidenceById.get(part.evidence_id))
        .filter((item) => item?.acquisition_method !== 'authoritative_web_retrieval')
        .map((item) => item?.label)
        .filter((label) => label !== undefined);
      const userSourceIds: string[] = [];
      for (const part of intake.parts) {
        if (part.kind === 'statement') {
          userSourceIds.push(part.statement_id);
          continue;
        }
        const item = evidenceById.get(part.evidence_id);
        if (item?.acquisition_method !== 'authoritative_web_retrieval') {
          userSourceIds.push(part.evidence_id);
        }
      }
      messages.push({
        id: `intake-${intake.id}`,
        role: 'user',
        text: statementTexts.length > 0 ? statementTexts.join('\n\n') : `Submitted files: ${fileLabels.join(', ')}`,
        attachments,
        source_ids: userSourceIds,
        timestamp: new Date(intake.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
    const revisionSourceText = revision.triggering_intake_ids
      .flatMap((intakeId) => ledger.intake_ledger.find((item) => item.id === intakeId)?.parts ?? [])
      .filter((part) => part.kind === 'statement')
      .map((part) => part.raw_text)
      .join('\n\n');
    const labels = labelsFor(revisionSourceText);
    const eventIds = revision.delta.entries
      .filter((entry) => entry.entity_type === 'event')
      .map((entry) => entry.entity_id);
    const evidenceIds = revision.delta.entries
      .filter((entry) => entry.entity_type === 'evidence')
      .map((entry) => entry.entity_id);
    const statementIds = revision.delta.entries
      .filter((entry) => entry.entity_type === 'statement')
      .map((entry) => entry.entity_id);

    const structuredSteps = revision.reasoning?.steps.map((step) => ({
      id: step.id,
      kind: step.kind,
      kindLabel: labels.stepKinds[step.kind],
      text: step.text,
      depends_on: [...step.depends_on],
      source_ids: [...step.source_ids],
      claim_ids: [...step.claim_ids],
      gap_ids: [...step.gap_ids],
    })) ?? [];

    messages.push({
      id: `revision-${revision.id}`,
      role: 'assistant',
      text: acceptedUpdateMessage(revision, revisionSourceText),
      timestamp: new Date(revision.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      revision_id: revision.id,
      structured: {
        assistant_message: revision.assistant_message,
        summary: revision.explanation,
        goal: revision.objective,
        reasoning_steps: structuredSteps,
        delta_summary: {
          event_ids: eventIds,
          evidence_ids: evidenceIds,
          statement_ids: statementIds,
        },
      },
    });
  }
  return messages;
}

