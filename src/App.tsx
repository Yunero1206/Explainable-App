import React, { useMemo, useState } from 'react';
import { PanelLeft, PanelRight, ShieldCheck } from 'lucide-react';
import { createEmptyLedgerCase } from './ledger/factory.js';
import {
  parseCaseId,
  parseCaseNumber,
  parseCaseTitle,
  parseStructuralInstant,
} from './ledger/schema.js';
import type { LedgerV3Case } from './ledger/types.js';
import { parseIntakeResponse, type ModelRunAudit } from './runtime/modelRun.js';
import {
  commitAcceptedIntake,
  deleteLedgerCase,
  initializeCase,
  loadWorkspace,
  recordRejectedRun,
  saveCaseMetadata,
  type CaseUiMetadata,
  type PersistedBlob,
} from './storage/ledgerStore.js';
import { deriveChatMessages, projectLedger } from './presentation/projectLedger.js';
import { LeftSidebar } from './components/LeftSidebar';
import { RightCaseRecord } from './components/RightCaseRecord';
import { CaseIntakeChat } from './components/CaseIntakeChat';
import { EvidenceDetailModal } from './components/EvidenceDetailModal';
import { OriginalArtifactModal } from './components/OriginalArtifactModal';
import { ExportModal } from './components/ExportModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InferenceModeControl, type InferenceMode } from './components/TestModeBanner';
import type { AttachmentFile, ChatMessage, EvidenceItem, PresentationCaseData } from './types.js';
import { SAMPLE_CASES } from './data/sampleCases.js';
import { useLanguage } from './contexts/LanguageContext';

function defaultMetadata(ledger: LedgerV3Case): CaseUiMetadata {
  return {
    case_id: ledger.id,
    display_title: ledger.title,
    display_case_number: ledger.case_number,
    is_archived: false,
  };
}

function replaceById<T extends { id: string }>(items: T[], next: T): T[] {
  return items.map((item) => item.id === next.id ? next : item);
}

export default function App() {
  const { locale } = useLanguage();
  const [inferenceMode, setInferenceMode] = useState<InferenceMode>('replay');
  const [ledgers, setLedgers] = useState<LedgerV3Case[]>([]);
  const [runs, setRuns] = useState<ModelRunAudit[]>([]);
  const [blobs, setBlobs] = useState<PersistedBlob[]>([]);
  const [metadataByCaseId, setMetadataByCaseId] = useState<Record<string, CaseUiMetadata>>({});
  const [attemptMessages, setAttemptMessages] = useState<Record<string, ChatMessage[]>>({});
  const [casesLoaded, setCasesLoaded] = useState(false);
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedEvidenceForSummary, setSelectedEvidenceForSummary] = useState<EvidenceItem | null>(null);
  const [selectedEvidenceForOriginal, setSelectedEvidenceForOriginal] = useState<EvidenceItem | null>(null);
  const [isLeftMobileOpen, setIsLeftMobileOpen] = useState(false);
  const [isRightMobileOpen, setIsRightMobileOpen] = useState(false);
  const [focusSection, setFocusSection] = useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function initialize() {
      try {
        let snapshot = await loadWorkspace();
        if (snapshot.ledgers.length === 0) {
          const seed = SAMPLE_CASES[0];
          await initializeCase({ ledger: seed.ledger, run: seed.run, metadata: defaultMetadata(seed.ledger) });
          snapshot = await loadWorkspace();
        }

        const metadataMap: Record<string, CaseUiMetadata> = {};
        for (const ledger of snapshot.ledgers) {
          const existing = snapshot.metadata.find((item) => item.case_id === ledger.id);
          const metadata = existing ?? defaultMetadata(ledger);
          metadataMap[ledger.id] = metadata;
          if (existing === undefined) await saveCaseMetadata(metadata);
        }
        if (cancelled) return;
        setLedgers(snapshot.ledgers);
        setRuns(snapshot.runs);
        setBlobs(snapshot.blobs);
        setMetadataByCaseId(metadataMap);
        setCurrentCaseId(snapshot.ledgers.find((ledger) => !metadataMap[ledger.id]?.is_archived)?.id ?? snapshot.ledgers[0]?.id ?? null);
      } catch (error) {
        console.error('Workspace initialization failed:', error);
      } finally {
        if (!cancelled) setCasesLoaded(true);
      }
    }
    void initialize();
    return () => { cancelled = true; };
  }, []);

  const presentationCases = useMemo<PresentationCaseData[]>(() => ledgers.map((ledger) => projectLedger({
    ledger,
    runs,
    blobs: blobs.filter((blob) => blob.case_id === ledger.id),
    metadata: metadataByCaseId[ledger.id] ?? defaultMetadata(ledger),
    locale,
  })), [ledgers, runs, blobs, metadataByCaseId, locale]);

  const currentLedger = ledgers.find((ledger) => ledger.id === currentCaseId) ?? null;
  const currentPresentationCase = presentationCases.find((item) => item.id === currentCaseId) ?? null;
  const currentMessages = currentLedger === null
    ? []
    : [
        ...deriveChatMessages(currentLedger, blobs.filter((blob) => blob.case_id === currentLedger.id)),
        ...(attemptMessages[currentLedger.id] ?? []),
      ];

  const handleNewCase = async () => {
    const token = crypto.randomUUID().replaceAll('-', '_');
    const id = parseCaseId(`CASE_${token}`);
    const caseNumber = parseCaseNumber(`CASE-${String(ledgers.length + 1).padStart(3, '0')}`);
    const ledger = createEmptyLedgerCase({
      id,
      case_number: caseNumber,
      title: parseCaseTitle('New case record'),
      created_at: parseStructuralInstant(new Date().toISOString()),
    });
    const metadata = defaultMetadata(ledger);
    try {
      await initializeCase({ ledger, metadata });
      setLedgers((current) => [ledger, ...current]);
      setMetadataByCaseId((current) => ({ ...current, [ledger.id]: metadata }));
      setCurrentCaseId(ledger.id);
    } catch (error) {
      console.error('Could not create case:', error);
    }
  };

  const handleRenameCase = async (caseId: string, newNumber: string, newTitle: string) => {
    const current = metadataByCaseId[caseId];
    if (current === undefined || newNumber.trim().length === 0 || newTitle.trim().length === 0) return;
    const next = { ...current, display_case_number: newNumber.trim(), display_title: newTitle.trim() };
    try {
      await saveCaseMetadata(next);
      setMetadataByCaseId((items) => ({ ...items, [caseId]: next }));
    } catch (error) {
      console.error('Could not rename case:', error);
    }
  };

  const handleArchiveCase = async (caseId: string) => {
    const current = metadataByCaseId[caseId];
    if (current === undefined) return;
    const next = { ...current, is_archived: !current.is_archived };
    try {
      await saveCaseMetadata(next);
      setMetadataByCaseId((items) => ({ ...items, [caseId]: next }));
    } catch (error) {
      console.error('Could not archive case:', error);
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    const ledger = ledgers.find((item) => item.id === caseId);
    if (ledger === undefined) return;
    try {
      await deleteLedgerCase(ledger.id);
      const remaining = ledgers.filter((item) => item.id !== caseId);
      setLedgers(remaining);
      setRuns((items) => items.filter((run) => run.case_id !== caseId));
      setBlobs((items) => items.filter((blob) => blob.case_id !== caseId));
      setMetadataByCaseId((items) => {
        const next = { ...items };
        delete next[caseId];
        return next;
      });
      setAttemptMessages((items) => {
        const next = { ...items };
        delete next[caseId];
        return next;
      });
      if (currentCaseId === caseId) setCurrentCaseId(remaining[0]?.id ?? null);
    } catch (error) {
      console.error('Could not delete case:', error);
    }
  };

  const handleLoadSample = async () => {
    const seed = SAMPLE_CASES[0];
    if (ledgers.some((ledger) => ledger.id === seed.ledger.id)) {
      setCurrentCaseId(seed.ledger.id);
      return;
    }
    const metadata = defaultMetadata(seed.ledger);
    try {
      await initializeCase({ ledger: seed.ledger, run: seed.run, metadata });
      setLedgers((items) => [seed.ledger, ...items]);
      setRuns((items) => [seed.run, ...items]);
      setMetadataByCaseId((items) => ({ ...items, [seed.ledger.id]: metadata }));
      setCurrentCaseId(seed.ledger.id);
    } catch (error) {
      console.error('Could not load demo case:', error);
    }
  };

  const handleSendMessage = async (text: string, attachments: AttachmentFile[]) => {
    if (currentLedger === null) return;
    const caseId = currentLedger.id;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const submittedMessage: ChatMessage = {
      id: `attempt-user-${crypto.randomUUID()}`,
      role: 'user',
      text: text.length > 0 ? text : `Submitted files: ${attachments.map((item) => item.name).join(', ')}`,
      attachments,
      timestamp,
    };
    setAttemptMessages((items) => ({ ...items, [caseId]: [submittedMessage] }));
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-ET-Inference-Mode': inferenceMode },
        body: JSON.stringify({
          prior_ledger: currentLedger,
          client_request_id: crypto.randomUUID(),
          message: text,
          attachments,
          locale,
          inference_mode: inferenceMode,
        }),
      });
      const raw: unknown = await response.json();
      if (typeof raw !== 'object' || raw === null || !('run' in raw)) {
        const envelope = raw as { error?: { message?: string } } | null;
        throw new Error(envelope?.error?.message ?? `Intake request failed with status ${response.status}.`);
      }
      const result = parseIntakeResponse(raw);
      if (result.success === false) {
        await recordRejectedRun(result.run);
        setRuns((items) => [...items.filter((run) => run.id !== result.run.id), result.run]);
        setAttemptMessages((items) => ({
          ...items,
          [caseId]: [submittedMessage, {
            id: `attempt-error-${result.run.id}`,
            role: 'assistant',
            text: '',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            error: `${result.error.message} The accepted record was preserved.`,
          }],
        }));
        return;
      }

      const previousEvidenceIds = new Set(currentLedger.evidence.map((item) => item.id));
      const newEvidence = result.ledger.evidence.filter((item) => !previousEvidenceIds.has(item.id));
      const acceptedBlobs: PersistedBlob[] = newEvidence.flatMap((item, index) => {
        const blob = item.content.blob;
        const attachment = attachments[index];
        return blob === null || attachment === undefined
          ? []
          : [{ blob_ref: blob.blob_ref, case_id: result.ledger.id, data_url: attachment.dataUrl }];
      });
      await commitAcceptedIntake({ ledger: result.ledger, run: result.run, blobs: acceptedBlobs });

      setLedgers((items) => replaceById(items, result.ledger));
      setRuns((items) => [...items.filter((run) => run.id !== result.run.id), result.run]);
      setBlobs((items) => [...items.filter((blob) => !acceptedBlobs.some((next) => next.blob_ref === blob.blob_ref)), ...acceptedBlobs]);
      setAttemptMessages((items) => ({ ...items, [caseId]: [] }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'The intake could not be committed.';
      setAttemptMessages((items) => ({
        ...items,
        [caseId]: [submittedMessage, {
          id: `attempt-network-error-${crypto.randomUUID()}`,
          role: 'assistant',
          text: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          error: `${message} The accepted record was preserved.`,
        }],
      }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOpenEvidenceInventory = () => {
    if (window.innerWidth < 1024) setIsRightMobileOpen(true);
    setFocusSection('inventory');
    window.setTimeout(() => setFocusSection(null), 500);
  };

  if (!casesLoaded) {
    return <div className="h-screen grid place-items-center bg-slate-50 text-sm text-slate-600">Loading the local case ledger…</div>;
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-white font-sans antialiased text-slate-900 selection:bg-slate-200 selection:text-slate-900">
      <header className="lg:hidden bg-white p-3 flex items-center justify-between border-b border-slate-200 shrink-0">
        <button type="button" onClick={() => setIsLeftMobileOpen(true)} className="p-2 rounded-lg bg-slate-100 text-slate-600" title="Open case navigation">
          <PanelLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-700" />
          <span className="font-semibold text-sm truncate max-w-[180px]">{currentPresentationCase?.case_number ?? 'Explainable Trust'}</span>
        </div>
        <button type="button" onClick={() => setIsRightMobileOpen(true)} className="p-2 rounded-lg bg-slate-100 text-slate-600" title="Open case record">
          <PanelRight className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ErrorBoundary>
          <LeftSidebar
            cases={presentationCases}
            currentCaseId={currentCaseId}
            onSelectCase={setCurrentCaseId}
            onNewCase={() => void handleNewCase()}
            onRenameCase={(id, number, title) => void handleRenameCase(id, number, title)}
            onArchiveCase={(id) => void handleArchiveCase(id)}
            onDeleteCase={(id) => void handleDeleteCase(id)}
            isMobileOpen={isLeftMobileOpen}
            onCloseMobile={() => setIsLeftMobileOpen(false)}
            testModeNode={<InferenceModeControl inferenceMode={inferenceMode} onChangeInferenceMode={setInferenceMode} />}
          />

          <main className="flex-1 flex flex-col h-full bg-[#F8FAFC] relative overflow-hidden min-w-0">
            <CaseIntakeChat
              messages={currentMessages}
              currentCase={currentPresentationCase}
              onSendMessage={handleSendMessage}
              isAnalyzing={isAnalyzing}
              onOpenWorkspace={() => setIsRightMobileOpen(true)}
              onOpenEvidenceInventory={handleOpenEvidenceInventory}
              onSelectEvidence={(evidenceId) => {
                const found = currentPresentationCase?.evidence.find((item) => item.id === evidenceId);
                if (found !== undefined) setSelectedEvidenceForSummary(found);
              }}
              onLoadSample={() => void handleLoadSample()}
              onExportJson={() => setIsExportOpen(true)}
            />
          </main>

          <RightCaseRecord
            caseData={currentPresentationCase}
            onOpenEvidenceDetail={setSelectedEvidenceForSummary}
            onExportJson={() => setIsExportOpen(true)}
            isMobileOpen={isRightMobileOpen}
            onCloseMobile={() => setIsRightMobileOpen(false)}
            focusSection={focusSection}
          />
        </ErrorBoundary>
      </div>

      {selectedEvidenceForSummary && (
        <EvidenceDetailModal
          evidence={selectedEvidenceForSummary}
          events={currentPresentationCase?.events ?? []}
          claims={currentPresentationCase?.claims ?? []}
          onClose={() => setSelectedEvidenceForSummary(null)}
          onOpenOriginal={(item) => setSelectedEvidenceForOriginal(item)}
        />
      )}
      {selectedEvidenceForOriginal && (
        <OriginalArtifactModal evidence={selectedEvidenceForOriginal} onClose={() => setSelectedEvidenceForOriginal(null)} />
      )}
      {isExportOpen && currentPresentationCase && (
        <ExportModal caseData={currentPresentationCase} onClose={() => setIsExportOpen(false)} />
      )}
    </div>
  );
}
