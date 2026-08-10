import React, { useState } from 'react';
import { X, Download, Copy, Check, Printer, FileCode, FileText } from 'lucide-react';
import { CaseData } from '../types';

interface ExportModalProps {
  caseData: CaseData;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ caseData, onClose }) => {
  const [activeTab, setActiveTab] = useState<'json' | 'report'>('json');
  const [copied, setCopied] = useState(false);

  // Clean, portable JSON contract without bloated file base64 data
  const exportPayload = {
    schema_version: '1.0.0',
    case: {
      id: caseData.id,
      case_number: caseData.case_number,
      title: caseData.title,
      objective: caseData.objective,
      user_story: caseData.user_story,
      current_revision_id: caseData.current_revision_id,
      statements: (caseData.statements || []).map((s) => ({
        id: s.id,
        text: s.text,
        submitted_at: s.submitted_at,
        attachment_ids: s.attachment_ids,
      })),
      evidence: (caseData.evidence || []).map((e) => ({
        id: e.id,
        label: e.label,
        claimed_source: e.claimed_source,
        acquisition_method: e.acquisition_method,
        input_form: e.input_form,
        evidence_time: e.evidence_time,
        received_at: e.received_at,
        subject_object_ids: e.subject_object_ids,
        content: e.content,
        sha256_hash: e.raw_submission?.sha256_hash,
        source_attribution: e.source_attribution,
        case_object_match: e.case_object_match,
        case_object_match_status: e.case_object_match_status,
        completeness_context: e.completeness_context,
        integrity_signals: e.integrity_signals,
        limitations: e.limitations,
      })),
      revisions: caseData.revisions || [],
      events: caseData.events || [],
      claims: caseData.claims || [],
      gaps: caseData.gaps || [],
      actions: caseData.actions || [],
      summary: caseData.summary,
    },
  };

  const exportJson = JSON.stringify(exportPayload, null, 2);

  const handleDownloadJson = () => {
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `case_record_${caseData.case_number || caseData.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(exportJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Portable Case Record Export · Schema 1.0.0
            </span>
            <h3 className="text-lg font-bold">{caseData.case_number || 'Case Record'}: {caseData.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="bg-slate-100 px-6 py-2 border-b border-slate-200 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'json'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              JSON Contract
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'report'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Printable Report
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'json' ? (
              <>
                <button
                  onClick={handleCopyJson}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-slate-50 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownloadJson}
                  className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-emerald-600 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .json</span>
                </button>
              </>
            ) : (
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-slate-800 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Report</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs">
          {activeTab === 'json' ? (
            <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl overflow-x-auto text-[11px] leading-relaxed border border-slate-800">
              {exportJson}
            </pre>
          ) : (
            <div className="font-sans text-slate-900 space-y-6 text-xs p-2">
              <div className="border-b border-slate-200 pb-4">
                <span className="font-mono text-xs font-bold text-slate-500">{caseData.case_number}</span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">{caseData.title}</h2>
                <p className="text-xs text-slate-500 mt-1">Objective: {caseData.objective}</p>
              </div>

              {caseData.user_story && (
                <div>
                  <h3 className="font-bold uppercase tracking-wider text-slate-700 mb-2">User Statement Narrative</h3>
                  <p className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 leading-relaxed italic whitespace-pre-wrap">
                    "{caseData.user_story}"
                  </p>
                </div>
              )}

              <div>
                <h3 className="font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Evidence Inventory ({caseData.evidence.length})
                </h3>
                <div className="space-y-2">
                  {caseData.evidence.map((e) => (
                    <div key={e.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="font-bold font-mono text-slate-900">{e.id}: {e.label}</span>
                      <span className="text-slate-500 ml-2">(Claimed source: {e.claimed_source || 'Unspecified'} · {e.input_form})</span>
                      <p className="text-[11px] text-slate-600 mt-1">{e.limitations?.[0]}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Reconstruction Events ({caseData.events.length})
                </h3>
                <div className="space-y-1.5">
                  {caseData.events.map((ev) => (
                    <div key={ev.id} className="p-2 bg-slate-50 border border-slate-200 rounded text-slate-800">
                      <strong>{ev.time}</strong> · {ev.actor} {ev.action} {ev.target} [Evidence: {ev.evidence_ids.join(', ')}]
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Material Claims & Assessments ({caseData.claims.length})
                </h3>
                <div className="space-y-2">
                  {caseData.claims.map((c) => (
                    <div key={c.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{c.id}: {c.text}</span>
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                          {c.assessment}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{c.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
