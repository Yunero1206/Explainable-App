import React from 'react';
import { ExternalLink, FileText, Quote, X } from 'lucide-react';
import type { CaseReference, PresentationCaseData } from '../types.js';
import { CaseKeyButton } from './CaseKeyButton.js';

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
      <div className="w-full max-w-3xl max-h-[86vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-900">[{reference.id}]</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {finding ? 'Finding citation' : 'Evidence source'}
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
            title="Close citation"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="max-h-[72vh] overflow-y-auto p-5 space-y-5">
          {finding && (
            <>
              <section className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-indigo-700">
                  <Quote className="h-3.5 w-3.5" />
                  Finding
                </div>
                <blockquote className="whitespace-pre-wrap text-sm leading-relaxed text-slate-900">
                  {finding.text}
                </blockquote>
              </section>

              {findingSourceReferences.length > 0 && (
                <section className="space-y-2">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Source citations</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {findingSourceReferences.map((source) => (
                      <CaseKeyButton key={`${source.kind}:${source.id}`} reference={source} onSelect={closeThenSelect} />
                    ))}
                  </div>
                </section>
              )}

              <section className="grid gap-3 text-xs text-slate-700 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                  <span className="mb-1 block font-semibold text-slate-900">Why this finding</span>
                  <p className="leading-relaxed">{finding.reasoning}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="mb-1 block font-semibold text-slate-900">Scope</span>
                  <p className="leading-relaxed">{finding.scope}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="mb-1 block font-semibold text-slate-900">Limits</span>
                  <ul className="space-y-1">
                    {finding.limits.length === 0 ? <li>—</li> : finding.limits.map((limit) => <li key={limit}>{limit}</li>)}
                  </ul>
                </div>
              </section>
            </>
          )}

          {evidence && (
            <>
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <FileText className="h-3.5 w-3.5" />
                    {evidence.raw_submission ? 'Original attachment' : 'Source excerpt'}
                  </h4>
                  {evidence.file_data_url && !isImage && !isPdf && (
                    <a
                      href={evidence.file_data_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 hover:text-indigo-900"
                    >
                      Open file <ExternalLink className="h-3 w-3" />
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
                    {evidence.content || 'No text was extracted from this attachment. Use Open file to inspect the preserved original.'}
                  </blockquote>
                )}
              </section>

              {(linkedEvents.length > 0 || linkedFindings.length > 0) && (
                <section className="space-y-2 border-t border-slate-100 pt-4">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Used by</h4>
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
                Claimed source: {evidence.claimed_source} · Received {evidence.received_at}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
