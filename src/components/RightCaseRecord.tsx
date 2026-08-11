import React, { useState, useEffect } from 'react';
import { X, Download, ShieldAlert, CheckCircle2, Clock, FileText } from 'lucide-react';
import { PresentationCaseData, EvidenceItem } from '../types.js';
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

  // Reset to record tab whenever active case changes
  useEffect(() => {
    if (caseData?.id) {
      setActiveTab('record');
    }
  }, [caseData?.id]);

  // Handle focusSection triggers
  useEffect(() => {
    if (focusSection === 'gaps') {
      setActiveTab('gaps');
    } else if (focusSection === 'inventory' || focusSection === 'timeline' || focusSection === 'findings') {
      setActiveTab('record');
    }
  }, [focusSection]);

  if (!caseData) {
    return (
      <aside className="hidden lg:block w-80 xl:w-96 shrink-0 h-full bg-slate-50 border-l border-slate-200 p-6 text-center text-slate-500 text-xs">
        <p className="mt-12">No active case selected.</p>
      </aside>
    );
  }

  const evidenceList = caseData.evidence || [];
  const eventsList = caseData.events || [];
  const claimsList = caseData.claims || [];
  const gapsList = caseData.gaps || [];
  const actionsList = caseData.actions || [];
  const statementsList = caseData.statements || [];

  const recordItemsCount = eventsList.length + claimsList.length;

  const getAssessmentBadgeStyle = (assessment: string) => {
    switch (assessment) {
      case 'Established within current record':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Corroborated':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Contested':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Mutually acknowledged':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'Reported':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getAssessmentLabel = (assessment: string) => {
    switch (assessment) {
      case 'Established within current record':
        return t.establishedClaims || 'Established within current record';
      case 'Corroborated':
        return t.corroborated;
      case 'Contested':
        return t.contested;
      case 'Mutually acknowledged':
        return t.mutuallyAcknowledged;
      case 'Reported':
      default:
        return t.reported;
    }
  };

  const renderContent = () => (
    <div className="h-full flex flex-col bg-white text-slate-800 text-xs border-l border-slate-200 select-none overflow-hidden">
      {/* Mobile Drawer Close Header */}
      {onCloseMobile && (
        <div className="lg:hidden px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <span className="font-semibold text-xs text-slate-800 uppercase tracking-wider">
            Living Case Record
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
            title="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Exactly 2 Top-Level Tabs Header: Record | Gaps + Export button */}
      <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2 shrink-0 select-none">
        <div className="grid grid-cols-2 gap-1.5 flex-1 max-w-xs">
          <button
            type="button"
            onClick={() => setActiveTab('record')}
            className={`flex-1 pb-2 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'record'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.record}
          </button>
          <button
            onClick={() => setActiveTab('gaps')}
            className={`flex-1 pb-2 text-sm font-semibold transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'gaps'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.gaps}
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

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
        {/* TAB 1: RECORD */}
        {activeTab === 'record' && (
          <div className="space-y-3">
            {eventsList.length === 0 && claimsList.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                {t.emptyTimeline}
              </div>
            ) : (
              <>
                {eventsList.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="divide-y divide-slate-100 text-xs">
                      {eventsList.map((ev, idx) => {
                        const evEvidenceIds = ev.evidence_ids || [];
                        const evStmtIds = ev.user_statement_ids || [];
                        const timeDisplay = ev.time && ev.time !== 'Unknown' ? ev.time : '—';

                        return (
                          <div
                            key={ev.id || idx}
                            className="p-3 hover:bg-slate-50/70 transition-colors flex flex-col gap-1.5"
                          >
                            <div className="text-[11px] font-mono text-slate-500 leading-tight">
                              {timeDisplay}
                            </div>
                            
                            {(evStmtIds.length > 0 || evEvidenceIds.length > 0) && (
                              <div className="flex flex-col gap-0.5">
                                {evStmtIds.map((uId) => (
                                  <span
                                    key={uId}
                                    className="text-[10px] font-mono text-slate-600 font-semibold"
                                  >
                                    [{uId}]
                                  </span>
                                ))}
                                {evEvidenceIds.map((eId) => {
                                  const foundItem = evidenceList.find((e) => e.id === eId);
                                  return (
                                    <button
                                      key={eId}
                                      type="button"
                                      onClick={() => {
                                        if (foundItem) onOpenEvidenceDetail(foundItem);
                                      }}
                                      className="text-[10px] font-mono text-emerald-700 font-semibold text-left hover:underline w-fit cursor-pointer"
                                    >
                                      [{eId}]
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            <p className="leading-snug text-slate-900">
                              <span className="font-semibold text-slate-900">{ev.actor}</span>{' '}
                              <span className="text-slate-700">{ev.action}</span>{' '}
                              <span className="font-semibold text-slate-900">{ev.target}</span>
                              {ev.effect && <span className="text-slate-500 font-normal"> — {ev.effect}</span>}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {claimsList.length > 0 && (
                  <div className="space-y-2">
                    <div className="px-1 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                      Assessed Propositions ({claimsList.length})
                    </div>

                    {claimsList.map((claim) => {
                      const supportingEv = claim.supporting_evidence || [];
                      const qualifyingEv = claim.qualifying_evidence || [];
                      const conflictingEv = claim.conflicting_evidence || [];
                      const userStmts = claim.user_statement_ids || [];
                      const relatedGaps = gapsList.filter((g) => g.target_claim_ids?.includes(claim.id));

                      return (
                        <div
                          key={claim.id}
                          className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-1.5 min-w-0">
                              <span className="font-mono text-[10px] font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded shrink-0">
                                [{claim.id}]
                              </span>
                              <p className="text-xs text-slate-900 font-medium leading-snug">
                                {claim.text}
                              </p>
                            </div>
                            <span
                              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border shrink-0 text-center uppercase tracking-tight ${getAssessmentBadgeStyle(
                                claim.assessment
                              )}`}
                            >
                              {getAssessmentLabel(claim.assessment)}
                            </span>
                          </div>

                          {claim.reasoning && (
                            <p className="text-[11px] text-slate-600 leading-snug pl-1">
                              {claim.reasoning}
                            </p>
                          )}

                          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[10px]">
                            {userStmts.map((uId) => (
                              <span
                                key={uId}
                                className="font-mono text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded"
                              >
                                [{uId}]
                              </span>
                            ))}

                            {supportingEv.map((eId) => {
                              const item = evidenceList.find((e) => e.id === eId);
                              return (
                                <button
                                  key={eId}
                                  type="button"
                                  onClick={() => item && onOpenEvidenceDetail(item)}
                                  className="font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded hover:bg-emerald-100 cursor-pointer"
                                  title={`Supporting: ${item?.label || eId}`}
                                >
                                  [{eId}]
                                </button>
                              );
                            })}

                            {qualifyingEv.map((eId) => {
                              const item = evidenceList.find((e) => e.id === eId);
                              return (
                                <button
                                  key={eId}
                                  type="button"
                                  onClick={() => item && onOpenEvidenceDetail(item)}
                                  className="font-mono text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded hover:bg-amber-100 cursor-pointer"
                                  title={`Qualifying: ${item?.label || eId}`}
                                >
                                  [{eId}]
                                </button>
                              );
                            })}

                            {conflictingEv.map((eId) => {
                              const item = evidenceList.find((e) => e.id === eId);
                              return (
                                <button
                                  key={eId}
                                  type="button"
                                  onClick={() => item && onOpenEvidenceDetail(item)}
                                  className="font-mono text-rose-800 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded hover:bg-rose-100 cursor-pointer"
                                  title={`Conflicting: ${item?.label || eId}`}
                                >
                                  [{eId}]
                                </button>
                              );
                            })}

                            {relatedGaps.map((gap) => (
                              <button
                                key={gap.id}
                                type="button"
                                onClick={() => setActiveTab('gaps')}
                                className="font-mono text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded hover:bg-amber-100 cursor-pointer"
                                title={`Gap: ${gap.what_is_unknown}`}
                              >
                                [{gap.id}]
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  <FileText className="w-3.5 h-3.5" /> Revision audit
                </div>
                <span className="font-mono text-[10px] text-slate-500">Ledger 3.0.0</span>
              </div>
              {caseData.revisions.length === 0 ? (
                <p className="p-3 text-[11px] text-slate-500">No accepted revision yet.</p>
              ) : (
                <div className="p-3 space-y-3">
                  {caseData.revisions.slice().reverse().slice(0, 3).map((revision) => (
                    <div key={revision.id} className="space-y-1.5 border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-800">{revision.id} · {revision.accepted_model_run_id}</span>
                        <span className="text-[9px] text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(revision.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-[11px] text-slate-700 leading-snug">{revision.explanation}</p>
                      <div className="flex flex-wrap gap-1">
                        {revision.delta_entries.map((entry) => (
                          <span key={`${entry.entity_type}-${entry.entity_id}`} className="font-mono text-[9px] bg-slate-100 text-slate-700 border border-slate-200 rounded px-1.5 py-0.5" title={`${entry.reason} · sources: ${entry.source_ids.join(', ')}`}>
                            {entry.operation} {entry.entity_id}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {caseData.model_runs.length > 0 && (
                <div className="border-t border-slate-100 p-3 space-y-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Model runs</div>
                  {caseData.model_runs.slice().reverse().slice(0, 4).map((run) => (
                    <div key={run.id} className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="font-mono text-slate-700">{run.id} · {run.provider}</span>
                      <span className={`flex items-center gap-1 font-semibold ${run.status === 'accepted' ? 'text-emerald-700' : 'text-rose-700'}`} title={run.validation_errors.join('\n')}>
                        {run.status === 'accepted' ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        {run.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: GAPS */}
        {activeTab === 'gaps' && (
          <div className="space-y-3">
            {gapsList.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                {t.emptyGaps}
              </div>
            ) : (
              gapsList.map((gap, idx) => {
                const gapId = gap.id || `G0${idx + 1}`;
                const targetedAction = actionsList.find((a) => a.target_gap_id === gap.id);

                return (
                  <div
                    key={gap.id || idx}
                    className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-col gap-2 text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-amber-900">
                        [{gapId}]
                      </span>
                      {gap.status && (
                        <span className="text-[9px] font-mono font-semibold uppercase bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          {gap.status}
                        </span>
                      )}
                    </div>

                    <h4 className="text-[13px] font-semibold text-slate-900 leading-snug">
                      {gap.what_is_unknown}
                    </h4>

                    {/* Relevance */}
                    {gap.why_it_matters && (
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Relevance
                        </span>
                        <p className="text-[11px] text-slate-700 leading-snug">
                          {gap.why_it_matters}
                        </p>
                      </div>
                    )}

                    {/* Suggested Action */}
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                        Suggested Action
                      </span>
                      {targetedAction ? (
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[11px] text-slate-700 leading-snug">
                            {targetedAction.description}
                          </p>
                          <span className="text-[9px] font-mono uppercase text-slate-500">{targetedAction.status}</span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-700 leading-snug">
                          {gap.what_evidence_could_resolve_it || 'Submit corroborating documentary records or statements.'}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Right Side Panel */}
      <aside className="hidden lg:block w-80 xl:w-96 shrink-0 h-full">
        {renderContent()}
      </aside>

      {/* Mobile / Tablet Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex justify-end">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative w-80 sm:w-96 max-w-full h-full bg-slate-100 shadow-2xl z-50">
            {renderContent()}
          </div>
        </div>
      )}
    </>
  );
};
