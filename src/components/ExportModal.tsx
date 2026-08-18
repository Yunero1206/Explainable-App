import React, { useState } from 'react';
import { FileCode, Printer, FileText, Check, X } from 'lucide-react';
import { buildCaseViewExport } from '../presentation/exportCase.js';
import type { PresentationCaseData } from '../types.js';
import { useLanguage } from '../contexts/LanguageContext.js';

function keys(values: string[]): string {
  return values.map((value) => `[${value}]`).join(' ');
}

export function ExportModal({ caseData, onClose }: { caseData: PresentationCaseData; onClose: () => void }) {
  const { t } = useLanguage();
  const [copiedMd, setCopiedMd] = useState(false);
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

  const copyMarkdownReport = async () => {
    const lines: string[] = [
      `# Case Report: ${caseData.case_number} - ${caseData.title}`,
      `**Objective / User Goal:** ${caseData.objective || 'N/A'}`,
      `**Current Revision:** ${caseData.current_revision_id || 'N/A'}`,
      '',
      `## Summary Statistics`,
      `- Total Evidence Items: ${caseData.evidence.length}`,
      `- Timeline Events: ${caseData.events.length}`,
      `- Findings / Claims: ${caseData.claims.length}`,
      `- Open Gaps: ${caseData.gaps.filter((g) => g.status === 'open').length}`,
      '',
      `## Timeline Events`,
      ...caseData.events.map((e) => `- **[${e.id}] ${e.time || '—'}:** ${e.actor} ${e.action} ${e.target}${e.effect ? ` — ${e.effect}` : ''} *(${e.assessment})*`),
      '',
      `## Key Findings & Claims`,
      ...caseData.claims.map((c) => `- **[${c.id}]** ${c.text} *[${c.assessment}]*${c.reasoning ? `\n  - *Reasoning:* ${c.reasoning}` : ''}`),
      '',
      `## Open Gaps & Recommended Actions`,
      ...caseData.gaps.map((g) => {
        const actionLines = g.actions.map((a) => `    - **Action [${a.id}]:** ${a.title} (${a.priority}) — ${a.description}`).join('\n');
        return `- **[${g.id}] ${g.what_is_unknown}**\n  - *Why it matters:* ${g.why_it_matters}${actionLines ? `\n${actionLines}` : ''}`;
      }),
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    } catch (e) {
      console.error('Failed to copy markdown report', e);
    }
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
          aria-label={t.exportCase}
          onMouseDown={(event) => event.stopPropagation()}
          className="absolute top-14 right-4 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 space-y-2"
        >
          <div className="px-1 py-1 flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <p className="text-xs font-semibold text-slate-900">{t.exportCase}</p>
              <p className="text-[10px] font-mono text-slate-500">{caseData.case_number}</p>
            </div>
            <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-800 rounded cursor-pointer" title={t.closeExport}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={downloadJson}
              className="rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 p-2.5 text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-1.5"
            >
              <FileCode className="w-4 h-4 text-slate-700" />
              <span className="block text-xs font-semibold text-slate-900">JSON</span>
              <span className="block text-[9px] text-slate-500">{t.timelineAndGaps}</span>
            </button>
            <button
              type="button"
              onClick={copyMarkdownReport}
              className="rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 p-2.5 text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-1.5"
            >
              {copiedMd ? <Check className="w-4 h-4 text-emerald-600" /> : <FileText className="w-4 h-4 text-slate-700" />}
              <span className="block text-xs font-semibold text-slate-900">{copiedMd ? t.copied : 'Markdown'}</span>
              <span className="block text-[9px] text-slate-500">Report</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 p-2.5 text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-slate-700" />
              <span className="block text-xs font-semibold text-slate-900">{t.print}</span>
              <span className="block text-[9px] text-slate-500">{t.sameCaseView}</span>
            </button>
          </div>
        </div>
      </div>

      <article id="case-export-print" className="hidden font-sans text-xs leading-relaxed">
        <header className="border-b border-slate-300 pb-4 mb-5">
          <p className="font-mono text-slate-500">{exportPayload.case.case_number}</p>
          <h1 className="text-2xl font-bold mt-1">{exportPayload.case.title}</h1>
          <p className="mt-2"><strong>{t.userGoal}:</strong> {exportPayload.case.user_goal}</p>
        </header>

        <section className="mb-7">
          <h2 className="text-base font-bold uppercase tracking-wide mb-3">{t.timeline}</h2>
          <div className="space-y-4">
            {exportPayload.timeline.map((item) => (
              <div key={item.keys.event} className="border border-slate-300 rounded-lg p-3 break-inside-avoid">
                <div className="font-mono text-[10px] text-slate-600 mb-1">
                  {item.keys.event} · {item.time} · {item.assessment}
                  {item.keys.statements.length > 0 && ` · ${t.userStatement} ${keys(item.keys.statements)}`}
                  {item.keys.evidence.length > 0 && ` · ${t.evidence} ${keys(item.keys.evidence)}`}
                </div>
                <p className="font-medium">
                  {item.actor} {item.action} {item.target}
                  {item.effect && ` — ${item.effect}`}
                </p>
                {item.findings.length > 0 && (
                  <div className="mt-2 text-slate-700 space-y-1">
                    {item.findings.map((f) => (
                      <p key={f.id}>
                        <strong>{t.findingCitation} [{f.id}]:</strong> {f.text}
                      </p>
                    ))}
                  </div>
                )}
                {item.evidence.length > 0 && (
                  <div className="mt-2 text-[11px] text-slate-600 space-y-1">
                    {item.evidence.map((e) => (
                      <div key={e.id}>
                        <strong>{t.evidenceSource} [{e.id}] ({e.label}):</strong> {e.content}
                        {e.claimed_source && ` [${t.claimedSource}: ${e.claimed_source}]`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold uppercase tracking-wide mb-3">{t.gaps} & {t.actions}</h2>
          <div className="space-y-4">
            {exportPayload.gaps_and_actions.map((item) => (
              <div key={item.keys.gap} className="border border-slate-300 rounded-lg p-3 break-inside-avoid">
                <p className="font-mono text-[10px] text-slate-600">
                  {item.keys.gap}
                  {item.keys.findings.length > 0 && ` · ${t.findings} ${keys(item.keys.findings)}`}
                  {item.keys.events.length > 0 && ` · ${t.timeline} ${keys(item.keys.events)}`}
                </p>
                <h3 className="font-bold text-sm mt-1">{item.unknown}</h3>
                {item.actions.map((action) => (
                  <div key={action.id} className="mt-2 pt-2 border-t border-slate-200 text-[11px]">
                    <span className="font-mono">{action.id}:</span>{' '}
                    <strong>{action.title}</strong> — {action.description}
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
