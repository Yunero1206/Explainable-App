import React, { useState } from 'react';
import { saveCase, deleteCase, getAllCases } from './storage/caseStore.js';
import { hydrateCurrentProjection } from './domain/currentProjection.js';
import { LeftSidebar } from './components/LeftSidebar';
import { RightCaseRecord } from './components/RightCaseRecord';
import { CaseIntakeChat } from './components/CaseIntakeChat';
import { EvidenceDetailModal } from './components/EvidenceDetailModal';
import { OriginalArtifactModal } from './components/OriginalArtifactModal';
import { ExportModal } from './components/ExportModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TestModeBanner, InferenceMode } from './components/TestModeBanner';
import { CaseData, ChatMessage, AttachmentFile, EvidenceItem } from './types';
import { SAMPLE_CASES } from './data/sampleCases';

const HYDRATED_SAMPLE_CASES = SAMPLE_CASES.map(hydrateCurrentProjection);
import { PanelLeft, PanelRight, ShieldCheck } from 'lucide-react';
import { useLanguage } from './contexts/LanguageContext';

export default function App() {
  const { locale, t } = useLanguage();
  const [devInferenceMode, setDevInferenceMode] = useState<InferenceMode>('live');
  const [insertedInputText, setInsertedInputText] = useState<string>('');

  // All active cases list
  const [cases, _setCases] = useState<CaseData[]>(HYDRATED_SAMPLE_CASES);
  const [casesLoaded, setCasesLoaded] = useState(false);

  React.useEffect(() => {
    async function init() {
      try {
        const stored = await getAllCases();
        if (stored && stored.length > 0) {
          _setCases(stored.map(c => hydrateCurrentProjection(c)));
          if (!stored.find(c => c.id === currentCaseId)) {
            setCurrentCaseId(stored[0].id);
          }
        } else {
          for (const c of HYDRATED_SAMPLE_CASES) {
            await saveCase(c);
          }
        }
      } catch (e) {
        console.error('Failed to load cases from IDB:', e);
      } finally {
        setCasesLoaded(true);
      }
    }
    init();
  }, []);

  const setCases = (updater: any) => {
    _setCases(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const nextIds = new Set(next.map((c: CaseData) => c.id));
      prev.forEach((c: CaseData) => {
        if (!nextIds.has(c.id)) {
          deleteCase(c.id).catch(console.error);
        }
      });
      next.forEach((c: CaseData) => {
        const p = prev.find((x: CaseData) => x.id === c.id);
        if (!p || p !== c) {
          saveCase(c).catch(console.error);
        }
      });
      return next.map((c: CaseData) => hydrateCurrentProjection(c));
    });
  };
  const [currentCaseId, setCurrentCaseId] = useState<string | null>('case-sample-03');

  // Per-case chat messages map
  const [chatMessagesMap, setChatMessagesMap] = useState<Record<string, ChatMessage[]>>(() => {
    const initialMap: Record<string, ChatMessage[]> = {};
    HYDRATED_SAMPLE_CASES.forEach((c) => {
      initialMap[c.id] = [
        {
          id: `msg-sample-user-${c.id}`,
          role: 'user',
          text: `Case record loaded for: ${c.title || c.objective}`,
          timestamp: '09:00 AM',
        },
        {
          id: `msg-sample-asst-${c.id}`,
          role: 'assistant',
          text: `I reconstructed the case from ${c.evidence?.length || 0} evidence items. Key timeline events, claim assessments, and evidence gaps are summarized in the Living Case Record to the right.`,
          timestamp: '09:01 AM',
          caseSnapshot: c,
        },
      ];
    });
    return initialMap;
  });

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Modal inspection states (Level 2 & Level 3)
  const [selectedEvidenceForSummary, setSelectedEvidenceForSummary] = useState<EvidenceItem | null>(null);
  const [selectedEvidenceForOriginal, setSelectedEvidenceForOriginal] = useState<EvidenceItem | null>(null);

  // Mobile drawer states
  const [isLeftMobileOpen, setIsLeftMobileOpen] = useState<boolean>(false);
  const [isRightMobileOpen, setIsRightMobileOpen] = useState<boolean>(false);
  const [focusSection, setFocusSection] = useState<string | null>(null);

  const handleOpenEvidenceInventory = () => {
    if (window.innerWidth < 1024) {
      setIsRightMobileOpen(true);
    }
    setFocusSection('inventory');
    setTimeout(() => setFocusSection(null), 500);
  };

  // Current active case reference
  const currentCase = cases.find((c) => c.id === currentCaseId) || null;
  const currentMessages = currentCaseId ? chatMessagesMap[currentCaseId] || [] : [];

  // Case management handlers
  const handleRenameCase = (caseId: string, newNumber: string, newTitle: string) => {
    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              case_number: newNumber.trim() || c.case_number,
              title: newTitle.trim() || c.title,
            }
          : c
      )
    );
  };

  const handleArchiveCase = (caseId: string) => {
    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, is_archived: true } : c))
    );

    // If active case was archived, switch to next non-archived case or create a new one
    if (currentCaseId === caseId) {
      const remaining = cases.filter((c) => c.id !== caseId && !c.is_archived);
      if (remaining.length > 0) {
        setCurrentCaseId(remaining[0].id);
      } else {
        handleNewCase();
      }
    }
  };

  const handleDeleteCase = (caseId: string) => {
    setCases((prev) => prev.filter((c) => c.id !== caseId));
    setChatMessagesMap((prev) => {
      const updatedMap = { ...prev };
      delete updatedMap[caseId];
      return updatedMap;
    });

    // If active case was deleted, switch to next non-archived case
    if (currentCaseId === caseId) {
      const remaining = cases.filter((c) => c.id !== caseId && !c.is_archived);
      if (remaining.length > 0) {
        setCurrentCaseId(remaining[0].id);
      } else {
        handleNewCase();
      }
    }
  };

  // Load or switch to sample
  const handleLoadSample = (sampleId: string) => {
    const sample = HYDRATED_SAMPLE_CASES.find((s) => s.id === sampleId);
    if (!sample) return;

    // Check if case already exists in state
    const exists = cases.some((c) => c.id === sample.id);
    if (!exists) {
      setCases((prev) => [sample, ...prev]);
    }

    setCurrentCaseId(sample.id);

    // Ensure chat messages exist for this sample
    if (!chatMessagesMap[sample.id] || chatMessagesMap[sample.id].length === 0) {
      setChatMessagesMap((prev) => ({
        ...prev,
        [sample.id]: [
          {
            id: `msg-init-${Date.now()}`,
            role: 'user',
            text: `Loaded calibration case sample: ${sample.title}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          {
            id: `msg-asst-${Date.now()}`,
            role: 'assistant',
            text: `Reconstructed case record for "${sample.title}" with ${sample.evidence.length} evidence items. View events, claims, and gaps in the record panel to the right.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            caseSnapshot: sample,
          },
        ],
      }));
    }
  };

  // Start new empty case
  const handleNewCase = () => {
    const newCaseId = `case-${Date.now()}`;
    const activeCount = cases.filter((c) => !c.is_archived).length;
    const newCaseNumber = `C-000${activeCount + 1}`;
    const newCaseObj: CaseData = {
      id: newCaseId,
      case_number: newCaseNumber,
      title: 'New Case Record',
      objective: '',
      user_story: '',
      statements: [],
      evidence: [],
      events: [],
      claims: [],
      gaps: [],
      actions: [],
      summary: {
        total_evidence_count: 0,
        established_claims_count: 0,
        unresolved_claims_count: 0,
        conflicted_claims_count: 0,
        user_reported_claims_count: 0,
        timeline_span: 'Pending',
        unresolved_questions_count: 0,
        epistemic_warning: 'User submission only. No evidence artifacts uploaded yet.',
      },
    };

    setCases((prev) => [newCaseObj, ...prev]);
    setCurrentCaseId(newCaseId);
    setChatMessagesMap((prev) => ({
      ...prev,
      [newCaseId]: [],
    }));
  };

  // Switch active case
  const handleSelectCase = (caseId: string) => {
    setCurrentCaseId(caseId);
  };

  // On-the-fly translation of currentCase derived prose when locale changes (without new revision)
  React.useEffect(() => {
    if (!currentCaseId || !currentCase) return;
    if (currentCase.events.length === 0 && currentCase.claims.length === 0) return;

    const currentLoc = currentCase.locale || 'en';
    if (currentLoc === locale) return;

    const translateCase = async () => {
      try {
        setIsAnalyzing(true);
        const response = await fetch('/api/translate-case', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-ET-Dev-Inference-Mode': devInferenceMode,
          },
          body: JSON.stringify({
            events: currentCase.events,
            claims: currentCase.claims,
            gaps: currentCase.gaps,
            actions: currentCase.actions,
            title: currentCase.title,
            objective: currentCase.objective,
            locale,
            dev_inference_mode: devInferenceMode,
          }),
        });

        if (!response.ok) {
          throw new Error('Translation request failed.');
        }

        const data = await response.json();
        if (data.success) {
          setCases((prev) =>
            prev.map((c) =>
              c.id === currentCaseId
                ? {
                    ...c,
                    title: data.title,
                    objective: data.objective,
                    events: data.events,
                    claims: data.claims,
                    gaps: data.gaps,
                    actions: data.actions,
                    locale, // update local presentation marker
                  }
                : c
            )
          );
        }
      } catch (err) {
        console.error('Failed to translate case presentation:', err);
      } finally {
        setIsAnalyzing(false);
      }
    };

    translateCase();
  }, [locale, currentCaseId]);

  // Send message / automatic intake & reconstruction processing
  const handleSendMessage = async (text: string, attachments: AttachmentFile[]) => {
    if (!currentCaseId) return;

    setIsAnalyzing(true);
    const userMsgId = `msg-user-${Date.now()}`;
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text,
      attachments,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...currentMessages, newUserMsg];

    setChatMessagesMap((prev) => ({
      ...prev,
      [currentCaseId]: updatedMessages,
    }));

    try {
      // Rule 8: Strip massive Base64 file_data_url strings from existing evidence items before sending to the backend
      const optimizedEvidence = (currentCase?.evidence ?? []).map((ev) => {
        const { file_data_url, ...rest } = ev;
        return rest;
      });

      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ET-Dev-Inference-Mode': devInferenceMode,
        },
        body: JSON.stringify({
          case_id: currentCase?.id,
          case_number: currentCase?.case_number,
          existing_objective: currentCase?.objective || '',
          existing_statements: currentCase?.statements ?? [],
          existing_evidence: optimizedEvidence,
          existing_revisions: currentCase?.revisions ?? [],
          message: text,
          attachments,
          locale,
          dev_inference_mode: devInferenceMode,
        }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch (e) {
        // Non-JSON response
      }

      if (!response.ok || !data || !data.success) {
        const stage = data?.stage || 'REQUEST_FAILED';
        const errMsg = data?.message || data?.error || `Server status ${response.status}`;
        throw new Error(`[${stage}] ${errMsg}`);
      }

      if (data.case) {
        // Rule 8: Rehydrate the Base64 dataUrl references from local client memory back into the merged evidence list
        const rehydratedEvidence = (data.case.evidence || []).map((ev: any) => {
          const matchingOldEvidence = (currentCase?.evidence || []).find((old) => old.id === ev.id);
          const matchingNewAttachment = attachments.find((att) => att.name === ev.file_name);
          return {
            ...ev,
            file_data_url: ev.file_data_url || matchingOldEvidence?.file_data_url || matchingNewAttachment?.dataUrl,
          };
        });

        const updatedCase: CaseData = {
          ...data.case,
          id: currentCaseId,
          case_number: currentCase?.case_number || 'C-0001',
          title: data.case.title || currentCase?.title || 'Processed Case',
          evidence: rehydratedEvidence,
        };

        // Atomic update of canonical case state
        setCases((prev) => prev.map((c) => (c.id === currentCaseId ? updatedCase : c)));

        const getAsstSuccessText = (loc: string) => {
          const delta =
            data.revision?.summary?.revision_delta_summary ||
            data.revision?.revision_delta_summary ||
            data.case?.summary?.revision_delta_summary ||
            data.case?.revisions?.[data.case?.revisions?.length - 1]?.summary?.revision_delta_summary;

          if (delta) return delta;

          switch (loc) {
            case 'vi': return 'Tôi đã ghi nhận thông tin gửi mới và cập nhật hồ sơ vụ việc.';
            case 'es': return 'He registrado su envío y actualizado la revisión del caso.';
            case 'fr': return 'J\'ai enregistré votre soumission et mis à jour le dossier.';
            case 'zh-CN': return '我已记录您提交的内容并更新了案件记录。';
            case 'ja': return 'ご提出内容を記録し、案件記録を更新しました。';
            case 'en':
            default:
              return 'I processed your submission and updated the case revision.';
          }
        };

        // Add assistant response message
        const assistantMsg: ChatMessage = {
          id: `msg-asst-${Date.now()}`,
          role: 'assistant',
          text: getAsstSuccessText(locale),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          caseSnapshot: updatedCase,
        };

        setChatMessagesMap((prev) => ({
          ...prev,
          [currentCaseId]: [...updatedMessages, assistantMsg],
        }));
      }
    } catch (err: any) {
      console.error('Intake error:', err);
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        text: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Could not complete reconstruction: ${err.message || 'Server error'}. Your existing record and submission are preserved.`,
      };

      setChatMessagesMap((prev) => ({
        ...prev,
        [currentCaseId]: [...updatedMessages, errorMsg],
      }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResetTest = () => {
    const testCaseId = 'case-test-quickbite';
    const testCaseObj: CaseData = {
      id: testCaseId,
      case_number: 'TEST-QB',
      title: 'QuickBite Calibration Test',
      objective: 'QuickBite order damage dispute reconstruction test',
      user_story: '',
      statements: [],
      evidence: [],
      events: [],
      claims: [],
      gaps: [],
      actions: [],
      summary: {
        total_evidence_count: 0,
        established_claims_count: 0,
        unresolved_claims_count: 0,
        conflicted_claims_count: 0,
        user_reported_claims_count: 0,
        timeline_span: 'Pending',
        unresolved_questions_count: 0,
        epistemic_warning: 'Replay test intake initialized (0 Gemini calls). Send "My QuickBite order arrived damaged." to test Turn 1.',
      },
    };

    setCases((prev) => {
      const filtered = prev.filter((c) => c.id !== testCaseId);
      return [testCaseObj, ...filtered];
    });

    setCurrentCaseId(testCaseId);

    setChatMessagesMap((prev) => ({
      ...prev,
      [testCaseId]: [
        {
          id: `msg-qb-init-${Date.now()}`,
          role: 'assistant',
          text: 'QuickBite 10-turn Replay test initialized. Turn 0 / 10. Send: "My QuickBite order arrived damaged."',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    }));
  };

  const turnCount = currentCase?.statements?.length || 0;

  const testModeBannerNode = (
    <TestModeBanner
      inferenceMode={devInferenceMode}
      onChangeInferenceMode={setDevInferenceMode}
      onResetTest={handleResetTest}
      turnCount={turnCount}
      onInsertNextMessage={(msg) => {
        setInsertedInputText(msg);
        setTimeout(() => setInsertedInputText(''), 100);
      }}
    />
  );

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-white font-sans antialiased text-slate-900 selection:bg-slate-200 selection:text-slate-900">
      {/* Mobile Top App Bar */}
      <header className="lg:hidden bg-white text-slate-900 p-3 flex items-center justify-between border-b border-slate-200 shrink-0">
        <button
          type="button"
          onClick={() => setIsLeftMobileOpen(true)}
          className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
          title="Open Case Navigation"
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-700" />
          <span className="font-semibold text-sm text-slate-900 truncate max-w-[150px]">
            {currentCase ? currentCase.case_number || 'Case Record' : 'Explainable Trust'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsRightMobileOpen(true)}
          className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
          title="Open Case Record"
        >
          <PanelRight className="w-5 h-5" />
        </button>
      </header>

      {/* Main 3-Pane Grid */}
      <div className="flex-1 flex overflow-hidden">
        <ErrorBoundary>
          {/* LEFT SIDEBAR: Navigation (~240px) */}
          <LeftSidebar
            cases={cases}
            currentCaseId={currentCaseId}
            onSelectCase={handleSelectCase}
            onNewCase={handleNewCase}
            onRenameCase={handleRenameCase}
            onArchiveCase={handleArchiveCase}
            onDeleteCase={handleDeleteCase}
            isMobileOpen={isLeftMobileOpen}
            onCloseMobile={() => setIsLeftMobileOpen(false)}
            testModeNode={testModeBannerNode}
          />

          {/* CENTER: Chat Intake & Conversational Stream */}
          <main className="flex-1 flex flex-col h-full bg-[#F8FAFC] relative overflow-hidden min-w-0">
            <CaseIntakeChat
              messages={currentMessages}
              currentCase={currentCase}
              onSendMessage={handleSendMessage}
              isAnalyzing={isAnalyzing}
              onOpenWorkspace={() => setIsRightMobileOpen(true)}
              onOpenEvidenceInventory={handleOpenEvidenceInventory}
              onSelectEvidence={(evidenceId) => {
                const found = currentCase?.evidence?.find((e) => e.id === evidenceId);
                if (found) setSelectedEvidenceForSummary(found);
              }}
              onLoadSample={handleLoadSample}
              onExportJson={() => setIsExportOpen(true)}
              insertedInputText={insertedInputText}
            />
          </main>

          {/* RIGHT SIDEBAR: Living Case Record Panel (~360px) */}
          <RightCaseRecord
            caseData={currentCase}
            onOpenEvidenceDetail={(item) => setSelectedEvidenceForSummary(item)}
            onExportJson={() => setIsExportOpen(true)}
            isMobileOpen={isRightMobileOpen}
            onCloseMobile={() => setIsRightMobileOpen(false)}
            focusSection={focusSection}
          />
        </ErrorBoundary>
      </div>

      {/* Level 2: Evidence Summary Inspection Modal */}
      {selectedEvidenceForSummary && (
        <EvidenceDetailModal
          evidence={selectedEvidenceForSummary}
          events={currentCase?.events || []}
          claims={currentCase?.claims || []}
          onClose={() => setSelectedEvidenceForSummary(null)}
          onOpenOriginal={(item) => setSelectedEvidenceForOriginal(item)}
        />
      )}

      {/* Level 3: Original Raw Artifact Viewer Modal */}
      {selectedEvidenceForOriginal && (
        <OriginalArtifactModal
          evidence={selectedEvidenceForOriginal}
          onClose={() => setSelectedEvidenceForOriginal(null)}
        />
      )}

      {/* Export Modal */}
      {isExportOpen && currentCase && (
        <ExportModal
          caseData={currentCase}
          onClose={() => setIsExportOpen(false)}
        />
      )}
    </div>
  );
}
