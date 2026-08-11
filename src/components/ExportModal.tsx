import React from 'react';
import { FileCode, Printer, X } from 'lucide-react';
import { buildCaseViewExport } from '../presentation/exportCase.js';
import type { PresentationCaseData } from '../types.js';

function keys(values: string[]): string {
  return values.map((value) => `[${value}]`).join(' ');
}

export function ExportModal({ caseData, onClose }: { caseData: PresentationCaseData; onClose: () => void }) {
  const exportPayload = buildCaseViewExport(caseData);
  const exportJson = JSON.stringify(exportPayload, null, 2);

  const downloadJson = () => {
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `explainable-trust_${caseData.case_number}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #case-export-print, #case-export-print * { visibility: visible !important; }
          #case-export-print {
            display: block !important;
            position: absolute;
            inset: 0;
            width: 100%;
            color: #0f172a;
            background: white;
            padding: 24px;
          }
          @page { margin: 14mm; }
        }
      `}</style>

      <div className="fixed inset-0 z-50" onMouseDown={onClose}>
        <div className="absolute inset-0" />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Export case"
          onMouseDown={(event) => event.stopPropagation()}
          className="absolute top-14 right-4 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl p-2"
        >
          <div className="px-2 py-1.5 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-900">Export case</p>
              <p className="text-[10px] font-mono text-slate-500">{caseData.case_number}</p>
            </div>
            <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-800 rounded" title="Close export">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1">
            <button
              type="button"
              onClick={downloadJson}
              className="rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 p-3 text-left transition-colors"
            >
              <FileCode className="w-4 h-4 text-slate-700 mb-2" />
              <span className="block text-xs font-semibold text-slate-900">JSON</span>
              <span className="block text-[10px] text-slate-500 mt-0.5">Timeline + gaps</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 p-3 text-left transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-700 mb-2" />
              <span className="block text-xs font-semibold text-slate-900">Print</span>
              <span className="block text-[10px] text-slate-500 mt-0.5">Same case view</span>
            </button>
          </div>
        </div>
      </div>

      <article id="case-export-print" className="hidden font-sans text-xs leading-relaxed">
        <header className="border-b border-slate-300 pb-4 mb-5">
          <p className="font-mono text-slate-500">{exportPayload.case.case_number}</p>
          <h1 className="text-2xl font-bold mt-1">{exportPayload.case.title}</h1>
          <p className="mt-2"><strong>User goal:</strong> {exportPayload.case.user_goal}</p>
        </header>

        <section className="mb-7">
          <h2 className="text-base font-bold uppercase tracking-wide mb-3">Timeline</h2>
          <div className="space-y-4">
            {exportPayload.timeline.map((item) => (
              <div key={item.keys.event} className="border border-slate-300 rounded-lg p-3 break-inside-avoid">
                <div className="font-mono text-[10px] text-slate-600 mb-1">
                  [{item.keys.event}] {keys(item.keys.evidence)} {keys(item.keys.findings)}
                </div>
                <p className="text-slate-500">{item.time}</p>
                <p className="font-medium mt-1">{item.actor} {item.action} {item.target}{item.effect ? ` — ${item.effect}` : ''}</p>
                <p className="text-slate-600 mt-1">Assessment: {item.assessment}</p>

                {item.statements.map((statement) => (
                  <div key={statement.id} className="mt-2 pl-3 border-l-2 border-slate-200">
                    <p><strong>[{statement.id}] User statement</strong></p>
                    <p className="whitespace-pre-wrap text-slate-700">{statement.text}</p>
                  </div>
                ))}

                {item.findings.map((finding) => (
                  <div key={finding.id} className="mt-2 pl-3 border-l-2 border-indigo-200">
                    <p><strong>[{finding.id}] {finding.text}</strong> · {finding.assessment}</p>
                    <p className="text-slate-600">{finding.reasoning}</p>
                    <p className="text-slate-500">Scope: {finding.scope}</p>
                    {finding.limits.length > 0 && <p className="text-slate-500">Limits: {finding.limits.join(' · ')}</p>}
                  </div>
                ))}

                {item.evidence.map((evidence) => (
                  <div key={evidence.id} className="mt-2 pl-3 border-l-2 border-emerald-200">
                    <p><strong>[{evidence.id}] {evidence.label}</strong> · Claimed source: {evidence.claimed_source}</p>
                    {evidence.evidence_time && <p className="text-slate-500">Evidence time: {evidence.evidence_time}</p>}
                    {evidence.content && <p className="whitespace-pre-wrap text-slate-700">{evidence.content}</p>}
                    <p className="text-slate-500">Source attribution: {evidence.source_attribution}</p>
                    <p className="text-slate-500">Case match: {evidence.case_object_match}</p>
                    <p className="text-slate-500">Completeness: {evidence.completeness_context}</p>
                    <p className="text-slate-500">Integrity: {evidence.integrity_signals}</p>
                    {evidence.limitations.length > 0 && <p className="text-slate-500">Limits: {evidence.limitations.join(' · ')}</p>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold uppercase tracking-wide mb-3">Gaps / Actions</h2>
          <div className="space-y-4">
            {exportPayload.gaps_and_actions.map((gap) => (
              <div key={gap.keys.gap} className="border border-slate-300 rounded-lg p-3 break-inside-avoid">
                <p className="font-mono text-[10px] text-slate-600">
                  [{gap.keys.gap}] {keys(gap.keys.events)} {keys(gap.keys.findings)} {keys(gap.keys.evidence)} {keys(gap.keys.actions)}
                </p>
                <p className="text-slate-500 uppercase text-[10px]">{gap.status}</p>
                <p className="font-semibold mt-1">{gap.unknown}</p>
                <p className="mt-1"><strong>Relevance:</strong> {gap.relevance}</p>
                <p><strong>Could resolve:</strong> {gap.resolving_evidence}</p>
                <p><strong>How to obtain:</strong> {gap.acquisition_guidance}</p>
                <p><strong>Boundary:</strong> {gap.collection_boundary}</p>
                {gap.actions.map((action) => (
                  <div key={action.id} className="mt-2 bg-slate-50 rounded p-2">
                    <p><strong>[{action.id}] {action.title}</strong> · {action.priority} · {action.status}</p>
                    <p>{action.description}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </article>
    </>
  );
}
