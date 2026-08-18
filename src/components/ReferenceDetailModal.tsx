import React, { useState } from 'react';
import { AlertTriangle, Check, Copy, ExternalLink, FileText, Layers, Link2, Quote, Scale, ShieldCheck, X } from 'lucide-react';
import type { CaseReference, PresentationCaseData } from '../types.js';
import { CaseKeyButton } from './CaseKeyButton.js';
import { useLanguage } from '../contexts/LanguageContext.js';

export function ReferenceDetailModal({
  caseData,
  reference,
  onClose,
  onSelectReference,
}: {
  caseData: PresentationCaseData;
  reference: CaseReference;
  onClose: () => void;
  onSelectReference: (reference: CaseReference) => void;
}) {
  const { t } = useLanguage();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const finding = reference.kind === 'finding'
    ? caseData.claims.find((item) => item.id === reference.id)
    : undefined;
  const evidence = reference.kind === 'evidence'
    ? caseData.evidence.find((item) => item.id === reference.id)
    : undefined;
  if (finding === undefined && evidence === undefined) return null;

  const closeThenSelect = (next: CaseReference) => {
    onClose();
    onSelectReference(next);
  };

  const findingSourceReferences: CaseReference[] = finding === undefined ? [] : [
    ...finding.user_statement_ids.map((id) => ({ kind: 'statement' as const, id })),
    ...[
      ...finding.supporting_evidence,
      ...finding.qualifying_evidence,
      ...finding.conflicting_evidence,
    ].filter((id, index, all) => all.indexOf(id) === index)
      .map((id) => ({ kind: 'evidence' as const, id })),
  ];

  // Statutory Rule Anchors (LEGIT & IRAC integration)
  const statutoryEvidence = finding === undefined
    ? []
    : caseData.evidence.filter((ev) =>
        (finding.supporting_evidence.includes(ev.id) || finding.qualifying_evidence.includes(ev.id)) &&
        (ev.web_provenance?.authority_kind === 'public_authority' ||
          ev.web_provenance?.authority_scope?.toLowerCase().includes('statutory') ||
          ev.claimed_source?.toLowerCase().includes('luật') ||
          ev.claimed_source?.toLowerCase().includes('nghị định') ||
          ev.claimed_source?.toLowerCase().includes('thông tư') ||
          ev.claimed_source?.toLowerCase().includes('quy định') ||
          ev.claimed_source?.toLowerCase().includes('statute') ||
          ev.claimed_source?.toLowerCase().includes('act'))
      );

  const supportingCount = finding?.supporting_evidence.length || 0;
  const conflictingCount = finding?.conflicting_evidence.length || 0;

  const isStrong = conflictingCount === 0 && supportingCount > 0;
  const isConflicted = conflictingCount > 0;

  const linkedEvents = evidence === undefined
    ? []
    : caseData.events.filter((event) => event.evidence_ids.includes(evidence.id));
  const linkedFindings = evidence === undefined
    ? []
    : caseData.claims.filter((claim) => [
      ...claim.supporting_evidence,
      ...claim.qualifying_evidence,
      ...claim.conflicting_evidence,
    ].includes(evidence.id));

  const isImage = evidence?.file_type?.startsWith('image/') ?? false;
  const isPdf = evidence?.file_type === 'application/pdf';
  const web = evidence?.web_provenance;

  const copySourceUrl = async () => {
    if (web === undefined || navigator.clipboard?.writeText === undefined) return;
    try {
      await navigator.clipboard.writeText(web.source_url);
      setCopiedUrl(true);
    } catch {
      setCopiedUrl(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={`${reference.kind} ${reference.id}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl max-h-[88vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-900">[{reference.id}]</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {finding ? t.findingCitation : t.evidenceSource}
              </span>
            </div>
            <h3 className="truncate text-base font-semibold text-slate-900">
              {finding?.text ?? evidence?.label}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 cursor-pointer"
            title={t.closeCitation}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="max-h-[74vh] overflow-y-auto p-5 space-y-4">
          {finding && (
            <>
              {/* BLOCK 1: TOULMIN CLAIM & ASSESSMENT */}
              <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                    <Quote className="h-3.5 w-3.5" />
                    <span>{t.toulminClaim || 'Luận điểm cần xác lập'}</span>
                  </div>

                  {/* Evidentiary Strength Gauge */}
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      isConflicted
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : isStrong
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {isConflicted ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    ) : isStrong ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>
                      {isConflicted
                        ? t.strengthContested || 'Đang có mâu thuẫn'
                        : isStrong
                        ? t.strengthEstablished || 'Có căn cứ bảo chứng'
                        : t.strengthReported || 'Chỉ mới ghi nhận'}
                    </span>
                    <span className="font-mono text-[10px] opacity-75">
                      (+{supportingCount} / -{conflictingCount})
                    </span>
                  </div>
                </div>

                <blockquote className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-900 bg-white/90 p-3 rounded-xl border border-indigo-100/80">
                  {finding.text}
                </blockquote>
              </section>

              {/* BLOCK 2: TOULMIN GROUNDING DATA (Căn cứ thực tế đầu vào) */}
              <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  <Layers className="h-3.5 w-3.5 text-slate-600" />
                  <span>{t.toulminData || '1. Căn cứ thực tế đầu vào'}</span>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
                  {/* Independent Evidence */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t.independentEvidenceBasis || 'Tài liệu chứng cứ độc lập'}:</span>
                    </div>
                    {finding.supporting_evidence.length === 0 ? (
                      <p className="text-slate-400 italic text-[11px]">Chưa có tài liệu độc lập xác thực.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {finding.supporting_evidence.map((id) => (
                          <CaseKeyButton key={id} reference={{ kind: 'evidence', id }} onSelect={closeThenSelect} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* User Statements */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-blue-800 text-[11px]">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>{t.unverifiedStatementBasis || 'Thông tin tự khai'}:</span>
                    </div>
                    {finding.user_statement_ids.length === 0 ? (
                      <p className="text-slate-400 italic text-[11px]">—</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {finding.user_statement_ids.map((id) => (
                          <CaseKeyButton key={id} reference={{ kind: 'statement', id }} onSelect={closeThenSelect} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* BLOCK 3: TOULMIN LOGICAL WARRANT (Cầu nối suy luận) */}
              <section className="rounded-2xl border border-indigo-100 bg-white p-4 space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-900">
                  <Link2 className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{t.toulminWarrant || '2. Cầu nối logic'}</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed pl-3 border-l-2 border-indigo-400">
                  {finding.reasoning || t.whyThisFinding}
                </p>
                {finding.scope && (
                  <p className="text-[11px] text-slate-500 pl-3 pt-0.5">
                    <strong>{t.scope}:</strong> {finding.scope}
                  </p>
                )}
              </section>

              {/* BLOCK 4: TOULMIN REBUTTALS & BLINDSPOTS (Điều kiện bị bác bỏ) */}
              <section className="rounded-2xl border border-rose-200/80 bg-rose-50/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-rose-900">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                  <span>{t.toulminRebuttal || '3. Điều kiện bị đối phương bác bỏ & Điểm mù'}</span>
                </div>
                <p className="text-[11px] text-rose-700 font-medium">
                  {t.toulminRebuttalDesc || 'Luận điểm này có thể bị đối phương bẻ gãy nếu:'}
                </p>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {finding.limits.length === 0 ? (
                    <li className="text-slate-500 italic">• Chưa phát hiện điều kiện phản biện rõ ràng.</li>
                  ) : (
                    finding.limits.map((limit, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-white/90 border border-rose-100 rounded-lg p-2 text-rose-950 font-medium">
                        <span className="text-rose-500 font-bold">⚠️</span>
                        <span>{limit}</span>
                      </li>
                    ))
                  )}
                </ul>
              </section>

              {/* BLOCK 5: STATUTORY RULE ANCHORS (Nếu có) */}
              {statutoryEvidence.length > 0 && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                    <Scale className="h-4 w-4 text-amber-700" />
                    <span>{t.statutoryRuleAnchor || '4. Căn cứ điều luật & Quy chuẩn áp dụng'}</span>
                  </div>
                  <div className="space-y-2">
                    {statutoryEvidence.map((sev) => (
                      <div key={sev.id} className="rounded-lg bg-white/90 border border-amber-200/80 p-3 text-xs text-slate-800 space-y-1">
                        <div className="flex items-center justify-between gap-2 font-semibold text-amber-950">
                          <span>[{sev.id}] {sev.label}</span>
                          {sev.web_provenance && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                              {sev.web_provenance.authority_kind === 'public_authority' ? 'Cơ quan công quyền' : 'Chính sách chính thức'}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-700 italic leading-relaxed">{sev.content}</p>
                        {sev.web_provenance && (
                          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                            <span>{t.sourcePublisher}: <strong className="text-slate-800">{sev.web_provenance.publisher}</strong></span>
                            <a
                              href={sev.web_provenance.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              URL <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {evidence && (
            <>
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <FileText className="h-3.5 w-3.5" />
                    {evidence.raw_submission ? t.originalAttachment : t.sourceExcerpt}
                  </h4>
                  {evidence.file_data_url && !isImage && !isPdf && (
                    <a
                      href={evidence.file_data_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 hover:text-indigo-900"
                    >
                      {t.openFile} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {isImage && evidence.file_data_url ? (
                  <div className="grid max-h-[56vh] place-items-center overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-3">
                    <img src={evidence.file_data_url} alt={evidence.label} className="max-h-[52vh] max-w-full object-contain" />
                  </div>
                ) : isPdf && evidence.file_data_url ? (
                  <iframe
                    src={evidence.file_data_url}
                    title={evidence.label}
                    className="h-[56vh] w-full rounded-xl border border-slate-200 bg-slate-100"
                  />
                ) : (
                  <blockquote className="max-h-[52vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-900">
                    {evidence.content || t.noExtractedText}
                  </blockquote>
                )}
              </section>

              {web && (
                <section className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 text-xs text-slate-700">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <span className="mb-1 block font-semibold text-slate-900">{t.sourcePublisher}</span>
                      <p>{web.publisher}</p>
                    </div>
                    <div>
                      <span className="mb-1 block font-semibold text-slate-900">{t.sourcePageTitle}</span>
                      <p>{web.page_title}</p>
                    </div>
                    <div>
                      <span className="mb-1 block font-semibold text-slate-900">{t.publishedOrUpdated}</span>
                      <p>{web.published_or_updated_at ?? '—'}</p>
                    </div>
                    <div>
                      <span className="mb-1 block font-semibold text-slate-900">{t.retrievedAt}</span>
                      <p>{web.retrieved_at}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="mb-1 block font-semibold text-slate-900">{t.authorityScope}</span>
                      <p className="leading-relaxed">{web.authority_scope}</p>
                    </div>
                  </div>
                  <div className="border-t border-emerald-100 pt-3">
                    <span className="mb-1.5 block font-semibold text-slate-900">{t.sourceUrl}</span>
                    <div className="flex items-start gap-2">
                      <code className="min-w-0 flex-1 select-all break-all rounded-lg bg-white px-3 py-2 text-[11px] text-slate-700 ring-1 ring-emerald-100">
                        {web.source_url}
                      </code>
                      <button
                        type="button"
                        onClick={() => void copySourceUrl()}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-2 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-50"
                        title={copiedUrl ? t.urlCopied : t.copyUrl}
                        aria-label={copiedUrl ? t.urlCopied : t.copyUrl}
                      >
                        {copiedUrl ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedUrl ? t.urlCopied : t.copyUrl}
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {(linkedEvents.length > 0 || linkedFindings.length > 0) && (
                <section className="space-y-2 border-t border-slate-100 pt-4">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t.usedBy}</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {linkedEvents.map((event) => (
                      <CaseKeyButton key={event.id} reference={{ kind: 'event', id: event.id }} onSelect={closeThenSelect} title={`${event.time} · ${event.actor} ${event.action} ${event.target}`} />
                    ))}
                    {linkedFindings.map((claim) => (
                      <CaseKeyButton key={claim.id} reference={{ kind: 'finding', id: claim.id }} onSelect={closeThenSelect} title={claim.text} />
                    ))}
                  </div>
                </section>
              )}

              <p className="border-t border-slate-100 pt-4 text-[10px] leading-relaxed text-slate-500">
                {t.claimedSource}: {evidence.claimed_source} · {t.receivedAt} {evidence.received_at}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
