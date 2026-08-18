import React, { useState, useRef, useEffect } from 'react';
import {
  Paperclip,
  Send,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  GitCommit,
  CheckCircle2,
  HelpCircle,
  GitFork,
} from 'lucide-react';
import type { AttachmentFile, CaseReference, ChatMessage, StructuredReasoningStep } from '../types.js';
import type { ModelRunMode } from '../runtime/modelRun.js';
import { CASE_REFERENCE_SPLIT_PATTERN, caseReferenceFromId } from '../presentation/caseReferences.js';
import { CaseKeyButton } from './CaseKeyButton.js';
import { useLanguage } from '../contexts/LanguageContext.js';

interface CaseIntakeChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, attachments: AttachmentFile[]) => Promise<void>;
  onSelectReference?: (reference: CaseReference) => void;
  focusedReference?: CaseReference | null;
  isLoading?: boolean;
  isAnalyzing?: boolean;
  onLoadSample?: (sampleId: string) => void;
  insertedInputText?: string;
  runMode?: ModelRunMode;
  onRunModeChange?: (mode: ModelRunMode) => void;
  onRetryMessage?: (text: string, attachments: AttachmentFile[]) => void;
  onOpenSection?: (section: string) => void;
}

export const CaseIntakeChat: React.FC<CaseIntakeChatProps> = ({
  messages,
  onSendMessage,
  onSelectReference,
  focusedReference = null,
  isLoading: isLoadingProp = false,
  isAnalyzing: isAnalyzingProp = false,
  onLoadSample,
  insertedInputText,
  runMode = 'analysis_only',
  onRunModeChange,
  onRetryMessage,
  onOpenSection,
}) => {
  const { locale, t } = useLanguage();
  const isLoading = isLoadingProp || isAnalyzingProp;
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedSubmissions, setExpandedSubmissions] = useState<Record<string, boolean>>({});
  const [expandedReasonings, setExpandedReasonings] = useState<Record<string, boolean>>({});
  const [highlightedStatementId, setHighlightedStatementId] = useState<string | null>(null);
  const [pendingIntake, setPendingIntake] = useState<{
    text: string;
    attachments: AttachmentFile[];
  } | null>(null);
  const [loadingPhase, setLoadingPhase] = useState<number>(0);

  useEffect(() => {
    if (!isLoading) {
      setLoadingPhase(0);
      setPendingIntake(null);
      return;
    }
    const timer1 = setTimeout(() => setLoadingPhase(1), 800);
    const timer2 = setTimeout(() => setLoadingPhase(2), 2200);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isLoading]);

  useEffect(() => {
    if (insertedInputText) {
      setInputText(insertedInputText);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [insertedInputText]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleSubmissionExpand = (id: string) => {
    setExpandedSubmissions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleReasoningExpand = (id: string) => {
    setExpandedReasonings((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Render every canonical key as the same navigable reference used by the
  // Record and Gaps surfaces.
  const renderTextWithChips = (text: string) => {
    if (!text) return null;

    const parts = text.split(CASE_REFERENCE_SPLIT_PATTERN);

    return (
      <span className="leading-relaxed">
        {parts.map((part, i) => {
          const reference = caseReferenceFromId(part);
          if (reference && onSelectReference) {
            return (
              <CaseKeyButton
                key={i}
                reference={reference}
                onSelect={onSelectReference}
                active={focusedReference?.kind === reference.kind && focusedReference.id === reference.id}
              />
            );
          }
          return part;
        })}
      </span>
    );
  };

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (focusedReference?.kind !== 'statement') {
      setHighlightedStatementId(null);
      return;
    }
    const message = messages.find((item) => item.source_ids?.includes(focusedReference.id));
    if (message === undefined) return;
    setExpandedSubmissions((current) => ({ ...current, [message.id]: true }));
    setHighlightedStatementId(focusedReference.id);
    const timer = window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(`[data-chat-message-id="${message.id}"]`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focusedReference, messages]);

  // Adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const getFallbackMimeType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'application/pdf';
    if (ext === 'png') return 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'gif') return 'image/gif';
    if (ext === 'txt') return 'text/plain';
    return 'application/octet-stream';
  };

  const handleFiles = async (files: FileList | File[]) => {
    const newAttachments: AttachmentFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dataUrl = await readFileAsDataUrl(file);
        let extractedText = '';

        if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
          extractedText = await readFileAsText(file);
        }

        newAttachments.push({
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: file.name,
          type: file.type || getFallbackMimeType(file.name),
          dataUrl,
          size: file.size,
          extractedText,
        });
      } catch (err) {
        console.error('Error reading file:', file.name, err);
      }
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && attachments.length === 0) || isLoading) return;

    const textToSend = inputText.trim();
    const attachmentsToSend = [...attachments];

    setPendingIntake({ text: textToSend, attachments: attachmentsToSend });
    setInputText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await onSendMessage(textToSend, attachmentsToSend);
    } finally {
      setPendingIntake(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Attachment size metrics
  const totalAttachmentBytes = attachments.reduce(
    (sum, att) => sum + (att.size ?? (att.dataUrl.length * 0.75)),
    0
  );
  const maxAttachmentBytes = 12 * 1024 * 1024;
  const isSizeOverLimit = totalAttachmentBytes > maxAttachmentBytes;
  const sizePercentage = Math.min(100, (totalAttachmentBytes / maxAttachmentBytes) * 100);

  const stepKindBadge = (step: StructuredReasoningStep) => {
    switch (step.kind) {
      case 'fact':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            {step.kindLabel || 'Fact'}
          </span>
        );
      case 'public_rule':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {step.kindLabel || 'Public rule'}
          </span>
        );
      case 'assumption':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            {step.kindLabel || 'Assumption'}
          </span>
        );
      case 'derivation':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            {step.kindLabel || 'Derivation'}
          </span>
        );
      case 'scenario':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            {step.kindLabel || 'Scenario'}
          </span>
        );
      case 'conclusion':
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-100">
            {step.kindLabel || 'Conclusion'}
          </span>
        );
    }
  };

  return (
    <div
      className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-6 border-2 border-dashed border-indigo-500 m-4 rounded-3xl pointer-events-none">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3 text-center">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{t.dropFilesHere}</p>
              <p className="text-xs text-slate-500 mt-1">{t.dropFilesDescription}</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Welcome / Empty State Prompt */}
          {messages.length === 0 && (
            <div className="space-y-4 my-auto pt-8">
              <div className="text-center space-y-2 max-w-lg mx-auto">
                <div className="inline-flex p-3 bg-white text-indigo-600 rounded-2xl shadow-2xs border border-slate-200/80 mb-2">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">{t.welcomePrompt}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{t.welcomeDescription}</p>
              </div>

              {/* Sample Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto pt-4">
                <div
                  onClick={() => onLoadSample?.('quickbite-dispute')}
                  className="p-3.5 bg-white border border-slate-200/80 hover:border-indigo-300 rounded-xl text-left cursor-pointer transition-all hover:shadow-2xs group text-xs"
                >
                  <p className="font-medium text-slate-900 group-hover:text-indigo-600 mb-1">
                    {t.openDemo}
                  </p>
                  <p className="text-slate-500 line-clamp-2">
                    {t.openDemoDescription}
                  </p>
                </div>

                <div
                  onClick={() => setInputText(t.sampleFollowUpText)}
                  className="p-3.5 bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl text-left cursor-pointer transition-all hover:shadow-2xs group text-xs"
                >
                  <p className="font-medium text-slate-900 group-hover:text-slate-800 mb-1">
                    {t.tryFollowUp}
                  </p>
                  <p className="text-slate-500 line-clamp-2">
                    {t.followUpDescription}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Render Messages */}
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isExpanded = expandedSubmissions[msg.id] ?? false;
            const isReasoningOpen = expandedReasonings[msg.id] ?? true;

            return (
              <div
                key={msg.id}
                data-chat-message-id={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5 w-full scroll-m-8`}
              >
                {/* User Message */}
                {isUser ? (
                  <div
                    className={`w-full max-w-2xl bg-slate-900 text-slate-100 rounded-2xl px-4 py-3 shadow-2xs space-y-2 border transition-all ${
                      msg.source_ids?.includes(highlightedStatementId ?? '')
                        ? 'border-sky-300 ring-2 ring-sky-400 ring-offset-2'
                        : 'border-slate-800'
                    }`}
                  >
                    {msg.source_ids && msg.source_ids.length > 0 && onSelectReference && (
                      <div className="flex flex-wrap gap-1.5">
                        {msg.source_ids.map((id) => {
                          const reference = caseReferenceFromId(id);
                          return reference === null ? null : (
                            <CaseKeyButton
                              key={`${reference.kind}:${reference.id}`}
                              reference={reference}
                              onSelect={onSelectReference}
                              active={focusedReference?.kind === reference.kind && focusedReference.id === reference.id}
                            />
                          );
                        })}
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="flex-1 cursor-pointer select-text"
                        onClick={() => toggleSubmissionExpand(msg.id)}
                      >
                        {isExpanded ? (
                          <p className="text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-wrap font-sans">
                            {msg.text}
                          </p>
                        ) : (
                          <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 leading-relaxed font-sans">
                            {msg.text}
                          </p>
                        )}
                      </div>

                      {(msg.text.length > 100 || (msg.attachments && msg.attachments.length > 0)) && (
                        <button
                          type="button"
                          onClick={() => toggleSubmissionExpand(msg.id)}
                          className="text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer shrink-0 mt-0.5"
                          title={isExpanded ? t.collapseMessage : t.expandMessage}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </div>

                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800/80">
                        {msg.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-mono border border-slate-700"
                          >
                            {att.type.startsWith('image/') ? (
                              <ImageIcon className="w-3.5 h-3.5 text-slate-300" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span className="truncate max-w-[160px]">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Assistant Message: Structured Reasoning & Delta */
                  <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-3.5 text-slate-800">
                    {msg.error ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-amber-700 font-medium text-xs">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>{t.notice}</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed bg-amber-50/60 p-2.5 rounded-xl border border-amber-200">
                          {msg.error}
                        </p>
                        {msg.retryPayload && onRetryMessage && (
                          <button
                            type="button"
                            onClick={() => onRetryMessage(msg.retryPayload!.text, msg.retryPayload!.attachments)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            {t.retry}
                          </button>
                        )}
                      </div>
                    ) : msg.structured ? (
                      /* Enhanced Structured View */
                      <div className="space-y-3.5">
                        {/* Direct Answer */}
                        <div className="text-xs sm:text-sm text-slate-900 font-medium leading-relaxed">
                          {renderTextWithChips(msg.structured.assistant_message)}
                        </div>

                        {/* Reasoning Stepper Accordion */}
                        {msg.structured.reasoning_steps && msg.structured.reasoning_steps.length > 0 && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => toggleReasoningExpand(msg.id)}
                              className="w-full flex items-center justify-between p-2.5 text-left text-xs font-semibold text-slate-800 hover:bg-slate-100/70 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                <span>{t.reasoningChain} ({msg.structured.reasoning_steps.length})</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {onOpenSection && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenSection('graph');
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] border border-indigo-200 transition-colors cursor-pointer"
                                    title={t.openDagGraph || 'Xem đồ thị DAG'}
                                  >
                                    <GitFork className="w-3 h-3" />
                                    <span>{t.openDagGraph || 'Xem đồ thị DAG'}</span>
                                  </button>
                                )}
                                {isReasoningOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                              </div>
                            </button>

                            {isReasoningOpen && (
                              <div className="p-3 pt-0 space-y-2 border-t border-slate-200/60 divide-y divide-slate-100">
                                {msg.structured.reasoning_steps.map((step) => {
                                  const references = [
                                    ...step.source_ids.map((id) => ({ kind: (id.startsWith('E') ? 'evidence' : 'statement') as 'evidence' | 'statement', id })),
                                    ...step.claim_ids.map((id) => ({ kind: 'finding' as const, id })),
                                    ...step.gap_ids.map((id) => ({ kind: 'gap' as const, id })),
                                  ];

                                  return (
                                    <div key={step.id} className="pt-2 text-xs space-y-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-mono text-[10px] font-bold text-slate-600">{step.id}</span>
                                        {stepKindBadge(step)}
                                        {step.depends_on.length > 0 && (
                                          <span className="text-[10px] text-slate-400 font-mono">
                                            ← {step.depends_on.join(', ')}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-slate-800 text-[11px] leading-relaxed">
                                        {step.text}
                                      </p>
                                      {references.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pt-0.5">
                                          {references.map((ref) => (
                                            <CaseKeyButton
                                              key={`${ref.kind}:${ref.id}`}
                                              reference={ref}
                                              onSelect={onSelectReference ?? (() => {})}
                                            />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Summary & Goal Box */}
                        {(msg.structured.summary || msg.structured.goal) && (
                          <div className="text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1 text-slate-600 leading-relaxed">
                            {msg.structured.summary && (
                              <p><span className="font-semibold text-slate-800">{t.summary}: </span>{msg.structured.summary}</p>
                            )}
                            {msg.structured.goal && (
                              <p><span className="font-semibold text-slate-800">{t.userGoal}: </span>{msg.structured.goal}</p>
                            )}
                          </div>
                        )}

                        {/* Delta Pills Footer */}
                        {msg.structured.delta_summary && (
                          <div className="flex items-center gap-2 flex-wrap pt-1 text-[10px] text-slate-500 border-t border-slate-100">
                            <span className="font-semibold text-slate-700 inline-flex items-center gap-1">
                              <GitCommit className="w-3 h-3 text-slate-400" />
                              {t.deltaChanges}:
                            </span>
                            {msg.structured.delta_summary.event_ids.map((id) => (
                              <CaseKeyButton
                                key={`event:${id}`}
                                reference={{ kind: 'event', id }}
                                onSelect={onSelectReference ?? (() => {})}
                              />
                            ))}
                            {msg.structured.delta_summary.evidence_ids.map((id) => (
                              <CaseKeyButton
                                key={`evidence:${id}`}
                                reference={{ kind: 'evidence', id }}
                                onSelect={onSelectReference ?? (() => {})}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Fallback Text Rendering */
                      <div className="font-normal text-xs sm:text-sm text-slate-800 leading-relaxed flex-1 space-y-1">
                        {msg.text
                          ? msg.text.split('\n').map((line, idx) => (
                              <div key={idx}>{renderTextWithChips(line)}</div>
                            ))
                          : null}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Optimistic Pending User Message */}
          {isLoading && pendingIntake && (
            <div className="flex flex-col items-end space-y-1.5 w-full scroll-m-8 animate-fadeIn">
              <div className="w-full max-w-2xl bg-slate-900 text-slate-100 rounded-2xl px-4 py-3 shadow-2xs space-y-2 border border-slate-800 opacity-90">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 select-text">
                    <p className="text-xs sm:text-sm text-slate-100 whitespace-pre-wrap leading-relaxed font-sans">
                      {pendingIntake.text}
                    </p>
                  </div>
                </div>

                {pendingIntake.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800/80">
                    {pendingIntake.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-mono border border-slate-700"
                      >
                        {att.type.startsWith('image/') ? (
                          <ImageIcon className="w-3.5 h-3.5 text-slate-300" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span className="truncate max-w-[160px]">{att.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Staged Dynamic Progress Indicator */}
          {isLoading && (
            <div className="flex items-center gap-3.5 p-3.5 bg-white rounded-2xl border border-indigo-100/90 shadow-2xs max-w-md animate-pulse">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
              </div>
              <div className="text-xs text-slate-700">
                <p className="font-semibold text-slate-900">
                  {loadingPhase === 0
                    ? t.reconstructingRecord
                    : loadingPhase === 1
                    ? (locale === 'vi' ? 'Đang trích xuất mốc thời gian và đối soát bằng chứng...' : 'Extracting timeline events & matching evidence...')
                    : (locale === 'vi' ? 'Đang đồng bộ Sổ cái và xác định điểm còn thiếu...' : 'Synchronizing Ledger V3 & identifying gaps...')}
                </p>
                <p className="text-[10px] text-indigo-600 font-mono mt-0.5">
                  {runMode === 'web_assisted'
                    ? (locale === 'vi' ? '⚡ Chế độ hỗ trợ tra cứu nguồn web chính thống' : '⚡ Web-assisted authoritative verification')
                    : (locale === 'vi' ? '⚡ Phân tích Sổ cái bất biến (Deterministic)' : '⚡ Deterministic Epistemic Model Run')}
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Sticky Composer at Bottom */}
      <div className="border-t border-slate-200 bg-white/95 backdrop-blur-md p-3 sm:p-4 shrink-0">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Mode toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 w-fit" role="group" aria-label="Model run mode">
              <button
                type="button"
                disabled={isLoading}
                aria-pressed={runMode === 'analysis_only'}
                onClick={() => onRunModeChange?.('analysis_only')}
                className={`rounded-lg px-3 py-1 text-[11px] font-medium transition-colors ${
                  runMode === 'analysis_only'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Gemini analyzes the supplied record without public-web retrieval"
              >
                Analysis only
              </button>
              <button
                type="button"
                disabled={isLoading}
                aria-pressed={runMode === 'web_assisted'}
                onClick={() => onRunModeChange?.('web_assisted')}
                className={`rounded-lg px-3 py-1 text-[11px] font-medium transition-colors ${
                  runMode === 'web_assisted'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Gemini reads your record first; Tavily receives only a sanitized public query"
              >
                Web-assisted
              </button>
            </div>

            {/* Live Attachment Size Indicator */}
            {attachments.length > 0 && (
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className={isSizeOverLimit ? 'text-red-600 font-bold' : 'text-slate-500'}>
                  {(totalAttachmentBytes / (1024 * 1024)).toFixed(1)} MB / 12 MB
                </span>
                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isSizeOverLimit ? 'bg-red-500' : sizePercentage > 75 ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${sizePercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Attachment Chips Preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-1">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-full text-xs font-mono shadow-2xs"
                >
                  {att.type.startsWith('image/') ? (
                    <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  <span className="truncate max-w-[180px]">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="p-0.5 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-800 cursor-pointer"
                    title={t.removeAttachment}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            multiple
            accept="image/*,.pdf,.txt"
            className="hidden"
          />

          {/* Composer Form */}
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-slate-300 focus-within:border-slate-300 transition-all"
          >
            <button
              type="button"
              disabled={isLoading}
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-full transition-colors shrink-0 ${
                isLoading
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 cursor-pointer'
              }`}
              title={t.addFiles}
              aria-label={t.addFiles}
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              disabled={isLoading}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                messages.length === 0
                  ? t.initialComposerPlaceholder
                  : t.followUpComposerPlaceholder
              }
              rows={1}
              className={`flex-1 bg-transparent text-sm placeholder-slate-400 focus:outline-hidden resize-none py-2 px-1 max-h-44 ${
                isLoading ? 'text-slate-400 cursor-not-allowed' : 'text-slate-900'
              }`}
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!inputText.trim() && attachments.length === 0) || isSizeOverLimit || isLoading}
              className={`p-2.5 rounded-xl font-medium transition-all shrink-0 cursor-pointer flex items-center justify-center ${
                (inputText.trim() || attachments.length > 0) && !isSizeOverLimit && !isLoading
                  ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
              title={t.sendMessage}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>{t.supportsFiles}</span>
            <span>{t.composerShortcut}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
