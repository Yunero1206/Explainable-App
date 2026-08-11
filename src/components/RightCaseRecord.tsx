import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import type { EvidenceItem, PresentationCaseData } from '../types.js';
import { useLanguage } from '../contexts/LanguageContext';

interface RightCaseRecordProps {
  caseData: PresentationCaseData | null;
  onOpenEvidenceDetail: (evidence: EvidenceItem) => void;
  onExportJson?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  focusSection?: string | null;
}

type TabType = 'record' | 'gaps';

function assessmentStyle(assessment: string): string {
  switch (assessment) {
    case 'Established within current record':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'Corroborated':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'Contested':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'Mutually acknowledged':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export const RightCaseRecord: React.FC<RightCaseRecordProps> = ({
  caseData,
  onOpenEvidenceDetail,
  onExportJson,
  isMobileOpen = false,
  onCloseMobile,
  focusSection,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('record');

  useEffect(() => {
    if (caseData?.id) setActiveTab('record');
  }, [caseData?.id]);

  useEffect(() => {
    if (focusSection === 'gaps') setActiveTab('gaps');
    else if (focusSection) setActiveTab('record');
  }, [focusSection]);

  if (!caseData) {
    return (
      <aside className="hidden lg:block w-80 xl:w-96 shrink-0 h-full bg-slate-50 border-l border-slate-200 p-6 text-center text-slate-500 text-xs">
        <p className="mt-12">No active case selected.</p>
      </aside>
    );
  }

  const evidenceById = new Map(caseData.evidence.map((item) => [item.id, item]));
  const findingById = new Map(caseData.claims.map((item) => [item.id, item]));

  const renderEvidenceKey = (evidenceId: string) => {
    const evidence = evidenceById.get(evidenceId);
    return (
      <button
        key={evidenceId}
        type="button"
        onClick={() => evidence && onOpenEvidenceDetail(evidence)}
        className="font-mono text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded hover:bg-emerald-100 cursor-pointer"
        title={evidence?.label ?? evidenceId}
      >
        [{evidenceId}]
      </button>
    );
  };

  const renderFindingKey = (findingId: string) => {
    const finding = findingById.get(findingId);
    return (
      <span
        key={findingId}
        className="font-mono text-[10px] font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded"
        title={finding ? `${finding.assessment}: ${finding.text}` : findingId}
      >
        [{findingId}]
      </span>
    );
  };

  const renderEventKey = (eventId: string) => (
    <span
      key={eventId}
      className="font-mono text-[10px] font-bold text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded"
    >
      [{eventId}]
    </span>
  );

  const renderContent = () => (
    <div className="h-full flex flex-col bg-white text-slate-800 text-xs border-l border-slate-200 select-none overflow-hidden">
      {onCloseMobile && (
        <div className="lg:hidden px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <span className="font-semibold text-xs text-slate-800 uppercase tracking-wider">Living Case Record</span>
          <button type="button" onClick={onCloseMobile} className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer" title="Close panel">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2 shrink-0">
        <div className="grid grid-cols-2 gap-1.5 flex-1 max-w-xs">
          <button
            type="button"
            onClick={() => setActiveTab('record')}
            className={`pb-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'record' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t.record}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gaps')}
            className={`pb-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'gaps' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t.gaps} / {t.actions}
          </button>
        </div>

        {onExportJson && (
          <button
            type="button"
            onClick={onExportJson}
            className="p-1.5 mb-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title={t.exportCase}
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 bg-slate-50/50">
        {activeTab === 'record' && (
          caseData.events.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">{t.emptyTimeline}</div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="divide-y divide-slate-100">
                {caseData.events.map((event) => (
                  <article key={event.id} className="p-3 space-y-2 hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-mono text-slate-500 leading-tight">
                        {event.time && event.time !== 'Unknown' ? event.time : '—'}
                      </span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-tight ${assessmentStyle(event.assessment)}`}>
                        {event.assessment}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {renderEventKey(event.id)}
                      {event.evidence_ids.map(renderEvidenceKey)}
                      {event.finding_ids.map(renderFindingKey)}
                    </div>

                    <p className="leading-snug text-slate-900">
                      <span className="font-semibold">{event.actor}</span>{' '}
                      <span className="text-slate-700">{event.action}</span>{' '}
                      <span className="font-semibold">{event.target}</span>
                      {event.effect && <span className="text-slate-500"> — {event.effect}</span>}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )
        )}

        {activeTab === 'gaps' && (
          caseData.gaps.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">{t.emptyGaps}</div>
          ) : (
            <div className="space-y-3">
              {caseData.gaps.map((gap) => {
                const actions = caseData.actions.filter((action) => action.target_gap_ids.includes(gap.id));
                return (
                  <article key={gap.id} className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-amber-900">[{gap.id}]</span>
                      <span className="text-[9px] font-mono font-semibold uppercase bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">{gap.status}</span>
                    </div>
                    <h4 className="text-[13px] font-semibold text-slate-900 leading-snug">{gap.what_is_unknown}</h4>

                    <section className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mr-1">Relevance</span>
                        {gap.related_event_ids.map(renderEventKey)}
                        {gap.target_claim_ids.map(renderFindingKey)}
                        {gap.evidence_ids.map(renderEvidenceKey)}
                      </div>
                      <p className="text-[11px] text-slate-700 leading-snug">{gap.why_it_matters}</p>
                    </section>

                    <section className="grid gap-1 text-[11px] text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                      <p><span className="font-semibold text-slate-800">Could resolve:</span> {gap.what_evidence_could_resolve_it}</p>
                      <p><span className="font-semibold text-slate-800">How to obtain:</span> {gap.where_how_to_obtain}</p>
                      <p><span className="font-semibold text-slate-800">Boundary:</span> {gap.what_not_to_over_collect}</p>
                    </section>

                    <section className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Actions</div>
                      {actions.length === 0 ? (
                        <p className="text-[11px] text-slate-500">{t.emptyActions}</p>
                      ) : actions.map((action) => (
                        <div key={action.id} className="rounded-lg border border-slate-200 p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-mono text-[10px] font-bold text-slate-900">[{action.id}]</span>
                              {action.target_gap_ids.map((id) => <span key={id} className="font-mono text-[10px] text-amber-800">[{id}]</span>)}
                              {action.related_event_ids.map(renderEventKey)}
                              {action.finding_ids.map(renderFindingKey)}
                              {action.evidence_ids.map(renderEvidenceKey)}
                            </div>
                            <span className="text-[9px] font-semibold uppercase text-slate-500">{action.priority} · {action.status}</span>
                          </div>
                          <p className="text-[11px] font-semibold text-slate-900">{action.title}</p>
                          <p className="text-[11px] text-slate-700 leading-snug">{action.description}</p>
                        </div>
                      ))}
                    </section>
                  </article>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-80 xl:w-96 shrink-0 h-full">{renderContent()}</aside>
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex justify-end">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="relative w-80 sm:w-96 max-w-full h-full bg-slate-100 shadow-2xl z-50">{renderContent()}</div>
        </div>
      )}
    </>
  );
};
