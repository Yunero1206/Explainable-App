import React, { useState } from 'react';
import { saveCase, deleteCase, getAllCases } from './storage/caseStore.js';
import { projectToPresentation } from './domain/currentProjection.js';
import { admitBootstrapRecord } from './canonical/boundary.js';
import { createEmptyCanonicalRecord } from './canonical/factory.js';
import { commitIntakeResponse } from './domain/clientCommit.js';
import { applyTranslationOverlay, TranslationOverlay } from './domain/translationOverlay.js';
import { CanonicalCaseRecord } from './canonical/types.js';
import { LeftSidebar } from './components/LeftSidebar';
import { RightCaseRecord } from './components/RightCaseRecord';
import { CaseIntakeChat } from './components/CaseIntakeChat';
import { EvidenceDetailModal } from './components/EvidenceDetailModal';
import { OriginalArtifactModal } from './components/OriginalArtifactModal';
import { ExportModal } from './components/ExportModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TestModeBanner, InferenceMode } from './components/TestModeBanner';
import { PresentationCaseData, ChatMessage, AttachmentFile, EvidenceItem } from './types.js';
import { SAMPLE_CASES } from './data/sampleCases.js';
import { PanelLeft, PanelRight, ShieldCheck } from 'lucide-react';
import { useLanguage } from './contexts/LanguageContext';

export default function App() {
  const { locale, t } = useLanguage();
  const [devInferenceMode, setDevInferenceMode] = useState<InferenceMode>('live');
  const [insertedInputText, setInsertedInputText] = useState<string>('');

  // 1. Authoritative State
  const [canonicalCases, setCanonicalCases] = useState<CanonicalCaseRecord[]>([]);
  // 2. UI Metadata State
  const [caseUiMetadataById, setCaseUiMetadataById] = useState<Record<string, { displayTitle: string, displayCaseNumber: string, isArchived: boolean }>>({});
  // 3. Translation Overlays State
  const [translationOverlays, setTranslationOverlays] = useState<Record<string, TranslationOverlay>>({});
  // 4. Chat Messages Map
  const [chatMessagesMap, setChatMessagesMap] = useState<Record<string, ChatMessage[]>>({});
  // 5. Ephemeral Blob Store
  const [attachmentPayloadMap, setAttachmentPayloadMap] = useState<Record<string, string>>({});

  const [casesLoaded, setCasesLoaded] = useState(false);
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Modals
  const [selectedEvidenceForSummary, setSelectedEvidenceForSummary] = useState<EvidenceItem | null>(null);
  const [selectedEvidenceForOriginal, setSelectedEvidenceForOriginal] = useState<EvidenceItem | null>(null);

  // Mobile drawer states
  const [isLeftMobileOpen, setIsLeftMobileOpen] = useState<boolean>(false);
  const [isRightMobileOpen, setIsRightMobileOpen] = useState<boolean>(false);
  const [focusSection, setFocusSection] = useState<string | null>(null);

  React.useEffect(() => {
    async function init() {
      try {
        const stored = await getAllCases();
        let loadedCases: CanonicalCaseRecord[] = [];
        
        if (stored && stored.length > 0) {
          loadedCases = stored;
        } else {
          // Fallback to samples
          loadedCases = SAMPLE_CASES.map(sc => admitBootstrapRecord(sc));
          for (const c of loadedCases) {
            await saveCase(c);
          }
        }
        
        setCanonicalCases(loadedCases);
        
        const metadataMap: Record<string, any> = {};
        const chatsMap: Record<string, ChatMessage[]> = {};
        loadedCases.forEach(c => {
          const rev = c.revisions.find(r => r.revision_id === c.current_revision_id);
          metadataMap[c.id] = { displayTitle: rev?.title, displayCaseNumber: c.case_number, isArchived: false };
          chatsMap[c.id] = [
            { id: `msg-sample-user-${c.id}`, role: 'user', text: `Case record loaded for: ${rev?.title || rev?.objective}`, timestamp: '09:00 AM' },
            { id: `msg-sample-asst-${c.id}`, role: 'assistant', text: `Loaded canonical record.`, timestamp: '09:01 AM', revision_id: c.current_revision_id }
          ];
        });
        setCaseUiMetadataById(metadataMap);
        setChatMessagesMap(chatsMap);
        
        if (loadedCases.length > 0) {
          setCurrentCaseId(loadedCases[0].id);
        }
      } catch (e) {
        console.error('Failed to load cases from IDB:', e);
      } finally {
        setCasesLoaded(true);
      }
    }
    init();
  }, []);

  const handleOpenEvidenceInventory = () => {
    if (window.innerWidth < 1024) setIsRightMobileOpen(true);
    setFocusSection('inventory');
    setTimeout(() => setFocusSection(null), 500);
  };

  const currentCanonicalCase = canonicalCases.find((c) => c.id === currentCaseId) || null;
  const currentMessages = currentCaseId ? chatMessagesMap[currentCaseId] || [] : [];

  // Compute PresentationCaseData array for the UI
  const presentationCases: PresentationCaseData[] = canonicalCases.map(c => {
    const baseProj = projectToPresentation(c);
    const meta = caseUiMetadataById[c.id];
    const transKey = `${c.id}_${c.current_revision_id}_${locale}`;
    const overlay = translationOverlays[transKey];
    
    // Apply UI metadata
    baseProj.title = meta?.displayTitle || baseProj.title;
    baseProj.case_number = meta?.displayCaseNumber || baseProj.case_number;
    baseProj.is_archived = meta?.isArchived || false;
    baseProj.locale = locale;
    
    // Rehydrate Blobs
    baseProj.evidence = baseProj.evidence.map(e => ({
      ...e,
      file_data_url: attachmentPayloadMap[`${c.id}_${e.id}`]
    }));

    return applyTranslationOverlay(baseProj, overlay);
  });

  const currentPresentationCase = presentationCases.find(p => p.id === currentCaseId) || null;

  const handleRenameCase = (caseId: string, newNumber: string, newTitle: string) => {
    setCaseUiMetadataById(prev => ({
      ...prev,
      [caseId]: {
        ...prev[caseId],
        displayTitle: newTitle.trim() || prev[caseId]?.displayTitle,
        displayCaseNumber: newNumber.trim() || prev[caseId]?.displayCaseNumber
      }
    }));
  };

  const handleArchiveCase = (caseId: string) => {
    setCaseUiMetadataById(prev => ({ ...prev, [caseId]: { ...prev[caseId], isArchived: true } }));
    if (currentCaseId === caseId) {
      const remaining = presentationCases.filter(c => c.id !== caseId && !c.is_archived);
      if (remaining.length > 0) setCurrentCaseId(remaining[0].id);
      else handleNewCase();
    }
  };

  const handleDeleteCase = (caseId: string) => {
    deleteCase(caseId).catch(console.error);
    setCanonicalCases(prev => prev.filter(c => c.id !== caseId));
    setChatMessagesMap(prev => { const upd = { ...prev }; delete upd[caseId]; return upd; });
    
    if (currentCaseId === caseId) {
      const remaining = presentationCases.filter(c => c.id !== caseId && !c.is_archived);
      if (remaining.length > 0) setCurrentCaseId(remaining[0].id);
      else handleNewCase();
    }
  };

  const handleLoadSample = (sampleId: string) => {
    const sample = SAMPLE_CASES.find((s) => s.id === sampleId);
    if (!sample) return;
    try {
      const canonical = admitBootstrapRecord(sample);
      if (!canonicalCases.some(c => c.id === canonical.id)) {
        const rev = canonical.revisions.find(r => r.revision_id === canonical.current_revision_id);
        setCanonicalCases(prev => [canonical, ...prev]);
        setCaseUiMetadataById(prev => ({ ...prev, [canonical.id]: { displayTitle: rev?.title, displayCaseNumber: canonical.case_number, isArchived: false } }));
        setChatMessagesMap(prev => ({ ...prev, [canonical.id]: [{ id: `msg-init-${Date.now()}`, role: 'assistant', text: `Loaded canonical record for "${rev?.title}".`, timestamp: new Date().toLocaleTimeString(), revision_id: canonical.current_revision_id }] }));
        saveCase(canonical).catch(console.error);
      }
      setCurrentCaseId(canonical.id);
    } catch (err) {
      console.error('Failed to load sample:', err);
    }
  };

  const handleNewCase = () => {
    const newCaseId = `case-${Date.now()}`;
    const activeCount = presentationCases.filter((c) => !c.is_archived).length;
    const newCaseNumber = `C-000${activeCount + 1}`;
    
    const canonical = createEmptyCanonicalRecord(newCaseId, newCaseNumber, 'New Case Record', '');
    const rev = canonical.revisions.find(r => r.revision_id === canonical.current_revision_id);
    
    setCanonicalCases(prev => [canonical, ...prev]);
    setCaseUiMetadataById(prev => ({ ...prev, [newCaseId]: { displayTitle: rev?.title, displayCaseNumber: canonical.case_number, isArchived: false } }));
    setChatMessagesMap(prev => ({ ...prev, [newCaseId]: [] }));
    setCurrentCaseId(newCaseId);
  };

  const handleSelectCase = (caseId: string) => {
    setCurrentCaseId(caseId);
  };

  React.useEffect(() => {
    if (!currentCanonicalCase) return;
    if (currentCanonicalCase.revisions[0].events.length === 0 && currentCanonicalCase.revisions[0].claims.length === 0) return;
    
    const transKey = `${currentCanonicalCase.id}_${currentCanonicalCase.current_revision_id}_${locale}`;
    if (translationOverlays[transKey] || locale === 'en') return; // 'en' is base

    const translateCase = async () => {
      try {
        setIsAnalyzing(true);
        const baseProj = projectToPresentation(currentCanonicalCase);
        const response = await fetch('/api/translate-case', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            events: baseProj.events,
            claims: baseProj.claims,
            gaps: baseProj.gaps,
            actions: baseProj.actions,
            title: baseProj.title,
            objective: baseProj.objective,
            locale
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Store valid translation
            setTranslationOverlays(prev => ({
              ...prev,
              [transKey]: {
                title: data.title,
                objective: data.objective,
                events: data.events,
                claims: data.claims,
                gaps: data.gaps,
                actions: data.actions
              }
            }));
          }
        }
      } catch (err) {
        console.error('Failed to translate case presentation:', err);
      } finally {
        setIsAnalyzing(false);
      }
    };
    translateCase();
  }, [locale, currentCaseId, currentCanonicalCase]);

  const handleSendMessage = async (text: string, attachments: AttachmentFile[]) => {
    if (!currentCaseId || !currentCanonicalCase) return;

    setIsAnalyzing(true);
    const userMsgId = `msg-user-${Date.now()}`;
    const newUserMsg: ChatMessage = {
      id: userMsgId, role: 'user', text, attachments, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...currentMessages, newUserMsg];
    setChatMessagesMap(prev => ({ ...prev, [currentCaseId]: updatedMessages }));

    try {
      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-ET-Dev-Inference-Mode': devInferenceMode },
        body: JSON.stringify({
          prior_record: currentCanonicalCase,
          message: text,
          attachments,
          locale,
          dev_inference_mode: devInferenceMode,
        }),
      });

      let data: any = null;
      try { data = await response.json(); } catch (e) {}

      if (!response.ok || !data || !data.success) {
        throw new Error(`[${data?.stage || 'REQUEST_FAILED'}] ${data?.message || data?.error || `Status ${response.status}`}`);
      }

      // Safe atomic commit using domain module
      const newCollection = commitIntakeResponse(canonicalCases, data, currentCaseId);
      const replacedRecord = newCollection.find(c => c.id === currentCaseId)!;
      
      setCanonicalCases(newCollection);
      saveCase(replacedRecord).catch(console.error);

      // Save attachments to Blob store
      if (attachments.length > 0) {
        setAttachmentPayloadMap(prev => {
          const upd = { ...prev };
          // Find mapping from returned canonical evidence
          // Match by some criteria or let the UI re-read attachments. In this simplified version, we just store what we have.
          replacedRecord.evidence.forEach(e => {
            const att = attachments.find(a => a.name === e.label || a.id === e.storage_key);
            if (att && att.dataUrl) upd[`${currentCaseId}_${e.id}`] = att.dataUrl;
          });
          return upd;
        });
      }

      const getAsstSuccessText = (loc: string) => {
        switch (loc) {
          case 'vi': return 'Tôi đã ghi nhận thông tin gửi mới và cập nhật hồ sơ vụ việc.';
          case 'es': return 'He registrado su envío y actualizado la revisión del caso.';
          case 'fr': return 'J\'ai enregistré votre soumission et mis à jour le dossier.';
          case 'zh-CN': return '我已记录您提交的内容并更新了案件记录。';
          case 'ja': return 'ご提出内容を記録し、案件記録を更新しました。';
          case 'en': default: return 'I processed your submission and updated the case revision.';
        }
      };

      const assistantMsg: ChatMessage = {
        id: `msg-asst-${Date.now()}`,
        role: 'assistant',
        text: getAsstSuccessText(locale),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        revision_id: replacedRecord.current_revision_id,
      };

      setChatMessagesMap(prev => ({ ...prev, [currentCaseId]: [...updatedMessages, assistantMsg] }));

    } catch (err: any) {
      console.error('Intake error:', err);
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`, role: 'assistant', text: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Could not complete reconstruction: ${err.message || 'Server error'}. Your existing record is preserved.`
      };
      setChatMessagesMap(prev => ({ ...prev, [currentCaseId]: [...updatedMessages, errorMsg] }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResetTest = () => {
    const testCaseId = 'case-test-quickbite';
    const testCaseObj = createEmptyCanonicalRecord(testCaseId, 'TEST-QB', 'QuickBite Calibration Test', 'QuickBite order damage dispute reconstruction test');
    const rev = testCaseObj.revisions.find(r => r.revision_id === testCaseObj.current_revision_id);
    
    setCanonicalCases(prev => { const filtered = prev.filter(c => c.id !== testCaseId); return [testCaseObj, ...filtered]; });
    setCaseUiMetadataById(prev => ({ ...prev, [testCaseId]: { displayTitle: rev?.title, displayCaseNumber: testCaseObj.case_number, isArchived: false } }));
    setCurrentCaseId(testCaseId);
    setChatMessagesMap(prev => ({
      ...prev,
      [testCaseId]: [{ id: `msg-qb-init-${Date.now()}`, role: 'assistant', text: 'QuickBite 10-turn Replay test initialized. Turn 0 / 10. Send: "My QuickBite order arrived damaged."', timestamp: new Date().toLocaleTimeString() }],
    }));
  };

  const turnCount = currentCanonicalCase?.statements.length || 0;

  const testModeBannerNode = (
    <TestModeBanner
      inferenceMode={devInferenceMode}
      onChangeInferenceMode={setDevInferenceMode}
      onResetTest={handleResetTest}
      turnCount={turnCount}
      onInsertNextMessage={(msg) => { setInsertedInputText(msg); setTimeout(() => setInsertedInputText(''), 100); }}
    />
  );

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-white font-sans antialiased text-slate-900 selection:bg-slate-200 selection:text-slate-900">
      {/* Mobile Top App Bar */}
      <header className="lg:hidden bg-white text-slate-900 p-3 flex items-center justify-between border-b border-slate-200 shrink-0">
        <button type="button" onClick={() => setIsLeftMobileOpen(true)} className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer" title="Open Case Navigation">
          <PanelLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-700" />
          <span className="font-semibold text-sm text-slate-900 truncate max-w-[150px]">
            {currentPresentationCase ? currentPresentationCase.case_number || 'Case Record' : 'Explainable Trust'}
          </span>
        </div>
        <button type="button" onClick={() => setIsRightMobileOpen(true)} className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer" title="Open Case Record">
          <PanelRight className="w-5 h-5" />
        </button>
      </header>

      {/* Main 3-Pane Grid */}
      <div className="flex-1 flex overflow-hidden">
        <ErrorBoundary>
          {/* LEFT SIDEBAR: Navigation (~240px) */}
          <LeftSidebar
            cases={presentationCases}
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
              currentCase={currentPresentationCase}
              onSendMessage={handleSendMessage}
              isAnalyzing={isAnalyzing}
              onOpenWorkspace={() => setIsRightMobileOpen(true)}
              onOpenEvidenceInventory={handleOpenEvidenceInventory}
              onSelectEvidence={(evidenceId) => {
                const found = currentPresentationCase?.evidence?.find((e) => e.id === evidenceId);
                if (found) setSelectedEvidenceForSummary(found);
              }}
              onLoadSample={handleLoadSample}
              onExportJson={() => setIsExportOpen(true)}
              insertedInputText={insertedInputText}
            />
          </main>

          {/* RIGHT SIDEBAR: Living Case Record Panel (~360px) */}
          <RightCaseRecord
            caseData={currentPresentationCase}
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
          events={currentPresentationCase?.events || []}
          claims={currentPresentationCase?.claims || []}
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
      {isExportOpen && currentPresentationCase && (
        <ExportModal
          caseData={currentPresentationCase}
          onClose={() => setIsExportOpen(false)}
        />
      )}
    </div>
  );
}
