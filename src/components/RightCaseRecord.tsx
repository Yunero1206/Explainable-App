import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import type { CaseReference, PresentationCaseData } from '../types.js';
import { caseReferenceTarget } from '../presentation/caseReferences.js';
import { useLanguage } from '../contexts/LanguageContext';
import { CaseKeyButton } from './CaseKeyButton.js';

interface RightCaseRecordProps {
  caseData: PresentationCaseData | null;
  onSelectReference: (reference: CaseReference) => void;
  focusedReference?: CaseReference | null;
  onExportJson?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  focusSection?: string | null;
}

type TabType = 'record' | 'gaps';

export const RightCaseRecord: React.FC<RightCaseRecordProps> = ({
  caseData,
  onSelectReference,
  focusedReference = null,
  onExportJson,
  isMobileOpen = false,
  onCloseMobile,
  focusSection,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>(focusSection === 'gaps' ? 'gaps' : 'record');
  const [highlightedReference, setHighlightedReference] = useState<CaseReference | null>(null);

  useEffect(() => {
    if (caseData?.id) {
      setActiveTab('record');
      setHighlightedReference(null);
    }
  }, [caseData?.id]);

  useEffect(() => {
    if (focusSection === 'gaps') setActiveTab('gaps');
    else if (focusSection) setActiveTab('record');
  }, [focusSection]);

  useEffect(() => {
    if (focusedReference === null || !['event', 'gap', 'action'].includes(focusedReference.kind)) return;
    const nextTab: TabType = focusedReference.kind === 'event' ? 'record' : 'gaps';
    setActiveTab(nextTab);
    setHighlightedReference(focusedReference);

    const timer = window.setTimeout(() => {
      const target = caseReferenceTarget(focusedReference);
      const candidates = Array.from(document.querySelectorAll<HTMLElement>(`[data-case-reference="${target}"]`));
      const visible = candidates.find((element) => element.offsetParent !== null) ?? candidates[0];
      visible?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focusedReference]);

  if (!caseData) {
    return (
      <aside className="hidden lg:block w-80 xl:w-96 shrink-0 h-full bg-slate-50 border-l border-slate-200 p-6 text-center text-slate-500 text-xs">
        <p className="mt-12">No active case selected.</p>
      </aside>
    );
  }

  const isActive = (reference: CaseReference) =>
    focusedReference?.kind === reference.kind && focusedReference.id === reference.id;
  const isHighlighted = (kind: CaseReference['kind'], id: string) =>
    highlightedReference?.kind === kind && highlightedReference.id === id;
  const key = (reference: CaseReference, title?: string) => (
    <CaseKeyButton
      key={`${reference.kind}:${reference.id}`}
      reference={reference}
      onSelect={onSelectReference}
      active={isActive(reference)}
      title={title}
    />
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

      <div className="flex-1 overflow-y-auto p-3 bg-slate-50/50">
        {activeTab === 'record' && (
          caseData.events.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">{t.emptyTimeline}</div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="divide-y divide-slate-100">
                {caseData.events.map((event) => {
                  const eventReference: CaseReference = { kind: 'event', id: event.id };
                  return (
                    <article
                      key={event.id}
                      data-case-reference={caseReferenceTarget(eventReference)}
                      className={`p-3 space-y-2 transition-all ${isHighlighted('event', event.id) ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-400' : 'hover:bg-slate-50/70'}`}
                    >
                      <span className="block text-[11px] font-mono text-slate-500 leading-tight">
                        {event.time && event.time !== 'Unknown' ? event.time : '—'}
                      </span>

                      <div className="flex flex-wrap gap-1.5">
                        {key(eventReference, `${event.time} · ${event.actor} ${event.action} ${event.target}`)}
                        {event.user_statement_ids.map((id) => key({ kind: 'statement', id }))}
                        {event.evidence_ids.map((id) => key({ kind: 'evidence', id }, caseData.evidence.find((item) => item.id === id)?.label))}
                        {event.finding_ids.map((id) => key({ kind: 'finding', id }, caseData.claims.find((item) => item.id === id)?.text))}
                      </div>

                      <p className="leading-snug text-slate-900">
                        <span className="font-semibold">{event.actor}</span>{' '}
                        <span className="text-slate-700">{event.action}</span>{' '}
                        <span className="font-semibold">{event.target}</span>
                        {event.effect && <span className="text-slate-500"> — {event.effect}</span>}
                      </p>
                    </article>
                  );
                })}
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
                const gapReference: CaseReference = { kind: 'gap', id: gap.id };
                return (
                  <article
                    key={gap.id}
                    data-case-reference={caseReferenceTarget(gapReference)}
                    className={`p-3.5 bg-white rounded-xl border border-slate-200 space-y-3 shadow-2xs transition-all ${isHighlighted('gap', gap.id) ? 'ring-2 ring-indigo-400 bg-indigo-50/40' : ''}`}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      {key(gapReference, gap.what_is_unknown)}
                      {gap.related_event_ids.map((id) => key({ kind: 'event', id }))}
                      {gap.target_claim_ids.map((id) => key({ kind: 'finding', id }, caseData.claims.find((item) => item.id === id)?.text))}
                      {gap.evidence_ids.map((id) => key({ kind: 'evidence', id }, caseData.evidence.find((item) => item.id === id)?.label))}
                    </div>

                    <h4 className="text-[13px] font-semibold text-slate-900 leading-snug">{gap.what_is_unknown}</h4>

                    {gap.why_it_matters.trim().length > 0 && (
                      <section className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Relevance</span>
                        <p className="text-[11px] text-slate-700 leading-snug">{gap.why_it_matters}</p>
                      </section>
                    )}

                    <section className="grid gap-1 text-[11px] text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                      <p><span className="font-semibold text-slate-800">Could resolve:</span> {gap.what_evidence_could_resolve_it}</p>
                      <p><span className="font-semibold text-slate-800">How to obtain:</span> {gap.where_how_to_obtain}</p>
                      <p><span className="font-semibold text-slate-800">Boundary:</span> {gap.what_not_to_over_collect}</p>
                    </section>

                    <section className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Actions</div>
                      {gap.actions.length === 0 ? (
                        <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">No action is connected to this gap yet.</p>
                      ) : gap.actions.map((action) => {
                        const actionReference: CaseReference = { kind: 'action', id: action.id };
                        return (
                          <article
                            key={`${gap.id}:${action.id}`}
                            data-case-reference={caseReferenceTarget(actionReference)}
                            className={`rounded-lg border border-slate-200 p-2.5 space-y-1.5 transition-all ${isHighlighted('action', action.id) ? 'ring-2 ring-indigo-400 bg-indigo-50/50' : 'bg-white'}`}
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              {key(actionReference, action.title)}
                              {action.target_gap_ids.map((id) => key({ kind: 'gap', id }))}
                            </div>
                            <p className="text-[11px] font-semibold text-slate-900">{action.title}</p>
                            <p className="text-[11px] text-slate-700 leading-snug">{action.description}</p>
                          </article>
                        );
                      })}
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
