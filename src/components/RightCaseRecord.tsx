import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import {
  Download,
  X,
  Search,
  ShieldCheck,
  FileText,
  Globe,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Clock,
  Target,
  FileCheck,
  GitFork,
  Loader2,
} from 'lucide-react';
import type { CaseReference, PresentationCaseData, AssessmentState } from '../types.js';
import { caseReferenceTarget } from '../presentation/caseReferences.js';
import { useLanguage } from '../contexts/LanguageContext.js';
import { CaseKeyButton } from './CaseKeyButton.js';
import { translateAssessment, translateMatchStatus, translatePriority } from '../lib/translations.js';

const ReasoningGraphView = lazy(() =>
  import('./ReasoningGraphView.js').then((m) => ({ default: m.ReasoningGraphView }))
);

interface RightCaseRecordProps {
  caseData: PresentationCaseData | null;
  onSelectReference: (reference: CaseReference) => void;
  focusedReference?: CaseReference | null;
  onExportJson?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  focusSection?: string | null;
}

export type TabType = 'storyline' | 'graph' | 'record' | 'findings' | 'evidence' | 'gaps';

export const RightCaseRecord: React.FC<RightCaseRecordProps> = ({
  caseData,
  onSelectReference,
  focusedReference = null,
  onExportJson,
  isMobileOpen = false,
  onCloseMobile,
  focusSection,
}) => {
  const { locale, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (focusSection === 'graph') return 'graph';
    if (focusSection === 'gaps') return 'gaps';
    if (focusSection === 'findings') return 'findings';
    if (focusSection === 'evidence') return 'evidence';
    if (focusSection === 'record') return 'record';
    return 'storyline';
  });
  const [highlightedReference, setHighlightedReference] = useState<CaseReference | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (caseData?.id) {
      if (!focusSection) setActiveTab('storyline');
      setHighlightedReference(null);
      setSearchQuery('');
    }
  }, [caseData?.id, focusSection]);

  useEffect(() => {
    if (focusSection === 'graph') setActiveTab('graph');
    else if (focusSection === 'gaps') setActiveTab('gaps');
    else if (focusSection === 'findings') setActiveTab('findings');
    else if (focusSection === 'evidence') setActiveTab('evidence');
    else if (focusSection === 'record') setActiveTab('record');
    else if (focusSection === 'storyline') setActiveTab('storyline');
  }, [focusSection]);

  useEffect(() => {
    if (focusedReference === null) return;
    let nextTab: TabType | null = null;
    if (focusedReference.kind === 'event') nextTab = activeTab === 'storyline' ? 'storyline' : 'record';
    else if (focusedReference.kind === 'finding') nextTab = activeTab === 'storyline' ? 'storyline' : 'findings';
    else if (focusedReference.kind === 'evidence') nextTab = activeTab === 'storyline' ? 'storyline' : 'evidence';
    else if (focusedReference.kind === 'gap' || focusedReference.kind === 'action') nextTab = activeTab === 'storyline' ? 'storyline' : 'gaps';

    if (nextTab !== null) {
      setActiveTab(nextTab);
      setHighlightedReference(focusedReference);

      const timer = window.setTimeout(() => {
        const target = caseReferenceTarget(focusedReference);
        const candidates = Array.from(document.querySelectorAll<HTMLElement>(`[data-case-reference="${target}"]`));
        const visible = candidates.find((element) => element.offsetParent !== null) ?? candidates[0];
        visible?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return () => window.clearTimeout(timer);
    }
  }, [focusedReference, activeTab]);

  if (!caseData) {
    return (
      <aside className="hidden lg:block w-80 xl:w-96 shrink-0 h-full bg-slate-50 border-l border-slate-200 p-6 text-center text-slate-500 text-xs">
        <p className="mt-12">{t.noActiveCase}</p>
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

  const query = searchQuery.trim().toLowerCase();

  const filteredEvents = useMemo(() => {
    if (!query) return caseData.events;
    return caseData.events.filter((e) =>
      e.id.toLowerCase().includes(query) ||
      e.actor.toLowerCase().includes(query) ||
      e.action.toLowerCase().includes(query) ||
      e.target.toLowerCase().includes(query) ||
      e.effect.toLowerCase().includes(query) ||
      (e.time && e.time.toLowerCase().includes(query))
    );
  }, [caseData.events, query]);

  const filteredClaims = useMemo(() => {
    if (!query) return caseData.claims;
    return caseData.claims.filter((c) =>
      c.id.toLowerCase().includes(query) ||
      c.text.toLowerCase().includes(query) ||
      c.actor.toLowerCase().includes(query) ||
      c.target.toLowerCase().includes(query) ||
      c.reasoning.toLowerCase().includes(query)
    );
  }, [caseData.claims, query]);

  const filteredEvidence = useMemo(() => {
    if (!query) return caseData.evidence;
    return caseData.evidence.filter((ev) =>
      ev.id.toLowerCase().includes(query) ||
      ev.label.toLowerCase().includes(query) ||
      ev.claimed_source.toLowerCase().includes(query) ||
      ev.content.toLowerCase().includes(query) ||
      (ev.web_provenance?.publisher && ev.web_provenance.publisher.toLowerCase().includes(query))
    );
  }, [caseData.evidence, query]);

  const filteredGaps = useMemo(() => {
    if (!query) return caseData.gaps;
    return caseData.gaps.filter((g) =>
      g.id.toLowerCase().includes(query) ||
      g.what_is_unknown.toLowerCase().includes(query) ||
      g.why_it_matters.toLowerCase().includes(query) ||
      g.actions.some((a) => a.title.toLowerCase().includes(query) || a.description.toLowerCase().includes(query))
    );
  }, [caseData.gaps, query]);

  const allActions = useMemo(() => {
    return caseData.gaps.flatMap((gap) =>
      gap.actions.map((action) => ({
        ...action,
        gapId: gap.id,
        gapUnknown: gap.what_is_unknown,
      }))
    );
  }, [caseData.gaps]);

  const assessmentBadge = (assessment: AssessmentState) => {
    const text = translateAssessment(assessment, locale);
    switch (assessment) {
      case 'Established within current record':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {text}
          </span>
        );
      case 'Corroborated':
      case 'Mutually acknowledged':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <ShieldCheck className="w-3 h-3 text-sky-600" />
            {text}
          </span>
        );
      case 'Contested':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            {text}
          </span>
        );
      case 'Reported':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <HelpCircle className="w-3 h-3 text-slate-500" />
            {text}
          </span>
        );
    }
  };

  const renderContent = () => (
    <div className="h-full flex flex-col bg-white text-slate-800 text-xs border-l border-slate-200 select-none overflow-hidden">
      {/* Top Header: Dual-Mode Workspace Switcher & Export */}
      <div className="bg-white border-b border-slate-200 px-3 pt-2.5 pb-2.5 flex items-center justify-between gap-2 shrink-0">
        {/* Primary Dual-Mode Switcher */}
        <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/70">
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'graph') setActiveTab('storyline');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab !== 'graph'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>{locale === 'vi' ? 'Hồ sơ & Diễn biến' : (t.storylineView || 'Case & Timeline')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('graph')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'graph'
                ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <GitFork className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t.graph || 'Đồ thị DAG'}</span>
          </button>
        </div>

        {onExportJson && (
          <button
            type="button"
            onClick={onExportJson}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
            title={t.exportCase}
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Tab Content */}
      {activeTab === 'graph' ? (
        <div className="flex-1 min-h-0 w-full h-full overflow-hidden">
          <Suspense
            fallback={
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 bg-slate-50">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="text-xs font-medium text-slate-600">{t.reasoningDag || 'Đang tải đồ thị DAG...'}</span>
              </div>
            }
          >
            <ReasoningGraphView
              caseData={caseData}
              onSelectReference={onSelectReference}
              focusedReference={focusedReference}
            />
          </Suspense>
        </div>
      ) : (
        <>
          {/* Quick Search & Smart Entity Filter Pills */}
          <div className="px-3 py-2.5 bg-slate-50/80 border-b border-slate-200 shrink-0 space-y-2">
            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={locale === 'vi' ? 'Tìm sự kiện, bằng chứng, phát hiện, gaps...' : t.searchPlaceholder}
                className="w-full pl-8 pr-7 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Smart Entity Filter Pills (Auto-wrapping palette to prevent scrollbar clipping) */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('storyline')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'storyline'
                    ? 'bg-slate-900 text-white shadow-2xs font-bold'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {locale === 'vi' ? 'Tất cả' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('record')}
                className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'record'
                    ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{t.timeline} ({caseData.events.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('findings')}
                className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'findings'
                    ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3 h-3 text-indigo-500" />
                <span>{t.findings} ({caseData.claims.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('evidence')}
                className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'evidence'
                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3 h-3 text-emerald-500" />
                <span>{t.evidence} ({caseData.evidence.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('gaps')}
                className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'gaps'
                    ? 'bg-amber-600 text-white shadow-2xs font-bold'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span>{t.gaps} ({caseData.gaps.length})</span>
              </button>
            </div>
          </div>

          {/* Main Tab & Storyline Content */}
          <div className="flex-1 overflow-y-auto p-3 bg-slate-50/50 space-y-3">
        {/* ALL-IN-ONE STORYLINE & EXECUTIVE OVERVIEW */}
        {activeTab === 'storyline' && (
          <div className="space-y-3">
            {/* Executive Case Goal & Quick Stats */}
            {caseData.objective && (
              <div className="bg-gradient-to-br from-indigo-50/90 via-sky-50/60 to-white border border-indigo-100 rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 bg-indigo-600 text-white rounded-lg shrink-0 mt-0.5 shadow-2xs">
                    <Target className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-indigo-900 tracking-wider block">
                      {t.userGoal}:
                    </span>
                    <p className="text-xs font-semibold text-slate-900 leading-snug">
                      {caseData.objective}
                    </p>
                  </div>
                </div>

                {/* Quick Navigation Stats Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-indigo-100/80 text-[10px]">
                  <span
                    onClick={() => setActiveTab('record')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white text-slate-700 border border-slate-200 hover:border-indigo-400 font-medium cursor-pointer shadow-2xs transition-colors"
                  >
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{t.timeline}: <strong className="text-slate-900 font-bold">{caseData.events.length}</strong></span>
                  </span>
                  <span
                    onClick={() => setActiveTab('findings')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white text-slate-700 border border-slate-200 hover:border-indigo-400 font-medium cursor-pointer shadow-2xs transition-colors"
                  >
                    <ShieldCheck className="w-3 h-3 text-indigo-500" />
                    <span>{t.findings}: <strong className="text-indigo-600 font-bold">{caseData.claims.length}</strong></span>
                  </span>
                  <span
                    onClick={() => setActiveTab('evidence')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white text-slate-700 border border-slate-200 hover:border-emerald-400 font-medium cursor-pointer shadow-2xs transition-colors"
                  >
                    <FileText className="w-3 h-3 text-emerald-500" />
                    <span>{t.evidence}: <strong className="text-emerald-600 font-bold">{caseData.evidence.length}</strong></span>
                  </span>
                  {caseData.gaps.length > 0 && (
                    <span
                      onClick={() => setActiveTab('gaps')}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 hover:border-amber-400 font-medium cursor-pointer shadow-2xs transition-colors"
                    >
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>{t.gaps}: <strong className="text-amber-800 font-bold">{caseData.gaps.length}</strong></span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Top Priority Actions from Gaps (Surfaced immediately so users don't need to scroll endlessly) */}
            {allActions.length > 0 && (
              <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    {locale === 'vi' ? 'Hành động đề xuất cần làm' : 'Recommended Next Actions'} ({allActions.length})
                  </span>
                  <span
                    onClick={() => setActiveTab('gaps')}
                    className="text-[10px] text-amber-800 hover:text-amber-950 font-semibold underline cursor-pointer"
                  >
                    {locale === 'vi' ? 'Xem chi tiết Gaps' : 'All Gaps'} →
                  </span>
                </div>

                <div className="space-y-1.5">
                  {allActions.slice(0, 3).map((action) => (
                    <div
                      key={`${action.gapId}:${action.id}`}
                      data-case-reference={caseReferenceTarget({ kind: 'action', id: action.id })}
                      onClick={() => onSelectReference({ kind: 'action', id: action.id })}
                      className={`p-2 rounded-xl bg-white border transition-all cursor-pointer flex items-start justify-between gap-2 shadow-2xs ${
                        isHighlighted('action', action.id) ? 'border-amber-400 ring-2 ring-amber-400' : 'border-amber-200/80 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <CaseKeyButton reference={{ kind: 'action', id: action.id }} onSelect={onSelectReference} active={isActive({ kind: 'action', id: action.id })} />
                          <span className="text-xs font-semibold text-slate-900 truncate">{action.title}</span>
                        </div>
                        {action.description && (
                          <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5 pl-6">
                            {action.description}
                          </p>
                        )}
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        action.priority === 'high' ? 'bg-red-50 text-red-700 border border-red-200' :
                        action.priority === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {translatePriority(action.priority, locale)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clean, Scannable Chronological Event Stream */}
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p>{t.emptyTimeline}</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1 pt-1">
                  <span>{locale === 'vi' ? 'Dòng diễn biến sự việc' : 'Chronological Events'} ({filteredEvents.length})</span>
                  <span
                    onClick={() => setActiveTab('record')}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    {locale === 'vi' ? 'Bảng sự kiện chi tiết' : 'Full Timeline'} →
                  </span>
                </div>

                {filteredEvents.map((event, index) => {
                  const eventReference: CaseReference = { kind: 'event', id: event.id };
                  const linkedGaps = caseData.gaps.filter(
                    (gap) =>
                      gap.related_event_ids.includes(event.id) ||
                      gap.target_claim_ids.some((cid) => event.finding_ids.includes(cid))
                  );

                  return (
                    <article
                      key={event.id}
                      data-case-reference={caseReferenceTarget(eventReference)}
                      className={`p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2 transition-all ${
                        isHighlighted('event', event.id) ? 'ring-2 ring-indigo-500 bg-indigo-50/40 shadow-sm' : 'hover:border-slate-300'
                      }`}
                    >
                      {/* Event Step Number & Time Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-slate-900 text-white font-bold text-[9px] flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="font-mono text-xs font-semibold text-slate-700">
                            {event.time && event.time !== 'Unknown' ? event.time : '—'}
                          </span>
                        </div>
                        {assessmentBadge(event.assessment)}
                      </div>

                      {/* Main Story Narrative */}
                      <div>
                        <p className="text-xs font-medium text-slate-900 leading-snug">
                          <span className="font-semibold text-slate-900">{event.actor}</span>{' '}
                          <span className="text-indigo-700 font-semibold">{event.action}</span>{' '}
                          <span className="font-semibold text-slate-900">{event.target}</span>
                        </p>
                        {event.effect && (
                          <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100/80 leading-relaxed mt-1.5">
                            {event.effect}
                          </p>
                        )}
                      </div>

                      {/* Interactive Reference Chips Bar (Click to open details without bloating timeline) */}
                      <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-slate-100">
                        {key(eventReference, `${event.time} · ${event.actor} ${event.action} ${event.target}`)}
                        {event.user_statement_ids.map((id) => key({ kind: 'statement', id }))}
                        {event.evidence_ids.map((id) => key({ kind: 'evidence', id }, caseData.evidence.find((item) => item.id === id)?.label))}
                        {event.finding_ids.map((id) => key({ kind: 'finding', id }, caseData.claims.find((item) => item.id === id)?.text))}
                        {linkedGaps.map((gap) => key({ kind: 'gap', id: gap.id }, gap.what_is_unknown))}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Timeline Events */}
        {activeTab === 'record' && (
          filteredEvents.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">{t.emptyTimeline}</div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100">
              {filteredEvents.map((event) => {
                const eventReference: CaseReference = { kind: 'event', id: event.id };
                return (
                  <article
                    key={event.id}
                    data-case-reference={caseReferenceTarget(eventReference)}
                    className={`p-3 space-y-2 transition-all ${isHighlighted('event', event.id) ? 'bg-indigo-50/80 ring-2 ring-inset ring-indigo-400' : 'hover:bg-slate-50/70'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-slate-500 font-medium">
                        {event.time && event.time !== 'Unknown' ? event.time : '—'}
                      </span>
                      {assessmentBadge(event.assessment)}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {key(eventReference, `${event.time} · ${event.actor} ${event.action} ${event.target}`)}
                      {event.user_statement_ids.map((id) => key({ kind: 'statement', id }))}
                      {event.evidence_ids.map((id) => key({ kind: 'evidence', id }, caseData.evidence.find((item) => item.id === id)?.label))}
                      {event.finding_ids.map((id) => key({ kind: 'finding', id }, caseData.claims.find((item) => item.id === id)?.text))}
                    </div>

                    <p className="leading-snug text-slate-900 text-xs">
                      <span className="font-semibold text-slate-900">{event.actor}</span>{' '}
                      <span className="text-slate-700">{event.action}</span>{' '}
                      <span className="font-semibold text-slate-900">{event.target}</span>
                      {event.effect && <span className="text-slate-500"> — {event.effect}</span>}
                    </p>
                  </article>
                );
              })}
            </div>
          )
        )}

        {/* Tab 2: Findings & Claims */}
        {activeTab === 'findings' && (
          filteredClaims.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">{t.emptyClaims}</div>
          ) : (
            <div className="space-y-3">
              {filteredClaims.map((claim) => {
                const claimReference: CaseReference = { kind: 'finding', id: claim.id };
                const sources = [
                  ...claim.user_statement_ids.map((id) => ({ kind: 'statement' as const, id })),
                  ...claim.supporting_evidence.map((id) => ({ kind: 'evidence' as const, id })),
                  ...claim.qualifying_evidence.map((id) => ({ kind: 'evidence' as const, id })),
                  ...claim.conflicting_evidence.map((id) => ({ kind: 'evidence' as const, id })),
                ];

                return (
                  <article
                    key={claim.id}
                    data-case-reference={caseReferenceTarget(claimReference)}
                    className={`p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-2xs transition-all ${
                      isHighlighted('finding', claim.id) ? 'ring-2 ring-indigo-400 bg-indigo-50/40' : 'hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {key(claimReference, claim.text)}
                      </div>
                      {assessmentBadge(claim.assessment)}
                    </div>

                    <h4 className="text-xs font-semibold text-slate-900 leading-snug">
                      {claim.text}
                    </h4>

                    {claim.reasoning && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg leading-relaxed border border-slate-100">
                        {claim.reasoning}
                      </p>
                    )}

                    {sources.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium mr-1">{t.sourceCitations}:</span>
                        {sources.map((src) => key(src))}
                      </div>
                    )}

                    {claim.limits && claim.limits.length > 0 && (
                      <div className="text-[10px] text-amber-700 bg-amber-50/70 p-1.5 rounded border border-amber-200/60">
                        <span className="font-semibold">{t.limitations}: </span>
                        {claim.limits.join('; ')}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )
        )}

        {/* Tab 3: Evidence Inventory */}
        {activeTab === 'evidence' && (
          filteredEvidence.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">{t.emptyEvidence}</div>
          ) : (
            <div className="space-y-3">
              {filteredEvidence.map((item) => {
                const evidenceReference: CaseReference = { kind: 'evidence', id: item.id };
                const isWeb = item.acquisition_method === 'authoritative_web_retrieval';

                return (
                  <article
                    key={item.id}
                    data-case-reference={caseReferenceTarget(evidenceReference)}
                    className={`p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-2xs transition-all ${
                      isHighlighted('evidence', item.id) ? 'ring-2 ring-indigo-400 bg-indigo-50/40' : 'hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {key(evidenceReference, item.label)}
                        {isWeb ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Globe className="w-3 h-3 text-indigo-600" />
                            {item.web_provenance?.publisher || 'Official Web'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            <FileText className="w-3 h-3 text-slate-500" />
                            {item.input_form.replaceAll('_', ' ')}
                          </span>
                        )}
                      </div>
                      {item.case_object_match_status && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                          {translateMatchStatus(item.case_object_match_status, locale)}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-semibold text-slate-900 leading-snug">
                      {item.label}
                    </h4>

                    {item.content && (
                      <p className="text-[11px] text-slate-600 line-clamp-3 bg-slate-50 p-2 rounded-lg leading-relaxed border border-slate-100 italic">
                        "{item.content}"
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400">{t.claimedSource}:</span> {item.claimed_source}
                      </div>
                      {item.raw_submission?.sha256_hash && (
                        <div className="truncate" title={item.raw_submission.sha256_hash}>
                          <span className="text-slate-400">SHA-256:</span> {item.raw_submission.sha256_hash.slice(0, 10)}...
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )
        )}

        {/* Tab 4: Gaps & Actions */}
        {activeTab === 'gaps' && (
          filteredGaps.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">{t.emptyGaps}</div>
          ) : (
            <div className="space-y-3">
              {filteredGaps.map((gap) => {
                const gapReference: CaseReference = { kind: 'gap', id: gap.id };
                return (
                  <article
                    key={gap.id}
                    data-case-reference={caseReferenceTarget(gapReference)}
                    className={`p-3.5 bg-white rounded-xl border border-slate-200 space-y-3 shadow-2xs transition-all ${
                      isHighlighted('gap', gap.id) ? 'ring-2 ring-indigo-400 bg-indigo-50/40' : ''
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      {key(gapReference, gap.what_is_unknown)}
                      {gap.related_event_ids.map((id) => key({ kind: 'event', id }))}
                      {gap.target_claim_ids.map((id) => key({ kind: 'finding', id }, caseData.claims.find((item) => item.id === id)?.text))}
                      {gap.evidence_ids.map((id) => key({ kind: 'evidence', id }, caseData.evidence.find((item) => item.id === id)?.label))}
                    </div>

                    <h4 className="text-[13px] font-semibold text-slate-900 leading-snug">{gap.what_is_unknown}</h4>

                    {gap.why_it_matters && (
                      <p className="text-[11px] text-slate-600 leading-relaxed bg-amber-50/40 p-2 rounded-lg border border-amber-100">
                        <span className="font-semibold text-amber-900">{t.relevance}: </span>
                        {gap.why_it_matters}
                      </p>
                    )}

                    <section className="pt-2 border-t border-slate-100 space-y-2">
                      {gap.actions.length === 0 ? (
                        <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">{t.emptyActions}</p>
                      ) : (
                        gap.actions.map((action) => {
                          const actionReference: CaseReference = { kind: 'action', id: action.id };
                          return (
                            <article
                              key={`${gap.id}:${action.id}`}
                              data-case-reference={caseReferenceTarget(actionReference)}
                              className={`rounded-lg border border-slate-200 p-2.5 space-y-1.5 transition-all ${
                                isHighlighted('action', action.id) ? 'ring-2 ring-indigo-400 bg-indigo-50/50' : 'bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {key(actionReference, action.title)}
                                </div>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                  action.priority === 'high' ? 'bg-red-50 text-red-700 border border-red-200' :
                                  action.priority === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}>
                                  {translatePriority(action.priority, locale)}
                                </span>
                              </div>
                              <p className="text-[11px] font-semibold text-slate-900">{action.title}</p>
                              <p className="text-[11px] text-slate-700 leading-snug">{action.description}</p>
                            </article>
                          );
                        })
                      )}
                    </section>
                  </article>
                );
              })}
            </div>
          )
        )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[420px] xl:w-[480px] 2xl:w-[560px] shrink-0 h-full">{renderContent()}</aside>
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex justify-end">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="relative w-80 sm:w-[440px] max-w-full h-full bg-slate-100 shadow-2xl z-50">{renderContent()}</div>
        </div>
      )}
    </>
  );
};
