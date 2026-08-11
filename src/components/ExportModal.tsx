import React, { useState } from 'react';
import { Check, Copy, Download, FileCode, FileText, Printer, X } from 'lucide-react';
import type { PresentationCaseData } from '../types.js';

export function ExportModal({ caseData, onClose }: { caseData: PresentationCaseData; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'json' | 'report'>('json');
  const [copied, setCopied] = useState(false);
  const exportPayload = {
    export_version: '1.0.0',
    ledger: caseData.authoritative_record,
    model_runs: caseData.model_runs,
  };
  const exportJson = JSON.stringify(exportPayload, null, 2);

  const download = () => {
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `explainable-trust_${caseData.case_number}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(exportJson);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Ledger V3 + model-run audit</span>
            <h3 className="text-lg font-bold">{caseData.case_number}: {caseData.title}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400" title="Close export">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-100 px-5 py-2 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => setActiveTab('json')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${activeTab === 'json' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}>
              <FileCode className="w-3.5 h-3.5" /> JSON
            </button>
            <button type="button" onClick={() => setActiveTab('report')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${activeTab === 'report' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}>
              <FileText className="w-3.5 h-3.5" /> Report
            </button>
          </div>
          <div className="flex gap-2">
            {activeTab === 'json' ? (
              <>
                <button type="button" onClick={() => void copy()} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy'}
                </button>
                <button type="button" onClick={download} className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </>
            ) : (
              <button type="button" onClick={() => window.print()} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1">
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
            )}
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'json' ? (
            <pre className="p-4 bg-slate-900 text-emerald-300 rounded-xl overflow-x-auto text-[11px] leading-relaxed border border-slate-800">{exportJson}</pre>
          ) : (
            <article className="text-slate-900 space-y-6 text-xs">
              <header className="border-b border-slate-200 pb-4">
                <span className="font-mono font-bold text-slate-500">{caseData.case_number} · {caseData.current_revision_id ?? 'No accepted revision'}</span>
                <h2 className="text-xl font-bold mt-1">{caseData.title}</h2>
                {caseData.objective && <p className="text-slate-600 mt-1">Objective: {caseData.objective}</p>}
              </header>
              <section>
                <h3 className="font-bold uppercase tracking-wider text-slate-700 mb-2">Accepted sources</h3>
                <p>{caseData.statements.length} statements · {caseData.evidence.length} evidence items</p>
              </section>
              <section>
                <h3 className="font-bold uppercase tracking-wider text-slate-700 mb-2">Assessed propositions</h3>
                <div className="space-y-2">
                  {caseData.claims.map((claim) => (
                    <div key={claim.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="font-semibold">{claim.id}: {claim.text}</div>
                      <div className="mt-1 text-slate-600">{claim.assessment} · {claim.reasoning}</div>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="font-bold uppercase tracking-wider text-slate-700 mb-2">Open gaps and actions</h3>
                <div className="space-y-2">
                  {caseData.gaps.filter((gap) => gap.status === 'open').map((gap) => (
                    <div key={gap.id}><strong>{gap.id}:</strong> {gap.what_is_unknown}</div>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="font-bold uppercase tracking-wider text-slate-700 mb-2">Audit</h3>
                <p>{caseData.revisions.length} accepted revisions · {caseData.model_runs.filter((run) => run.status !== 'accepted').length} rejected/provider-error runs</p>
              </section>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
