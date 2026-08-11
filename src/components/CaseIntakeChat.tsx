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
} from 'lucide-react';
import type { AttachmentFile, CaseReference, ChatMessage } from '../types.js';
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
}) => {
  const { t } = useLanguage();
  const isLoading = isLoadingProp || isAnalyzingProp;
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedSubmissions, setExpandedSubmissions] = useState<Record<string, boolean>>({});
  const [highlightedStatementId, setHighlightedStatementId] = useState<string | null>(null);

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

  // Handle file reading
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
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext || '')) return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    return 'text/plain';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && attachments.length === 0) || isLoading) return;

    const textToSend = inputText.trim();
    const attachmentsToSend = [...attachments];

    setInputText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await onSendMessage(textToSend, attachmentsToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Drag & drop handlers
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
    if (e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-[#F8FAFC] relative overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-6 border-2 border-dashed border-slate-700 m-4 rounded-2xl pointer-events-none">
          <div className="bg-white rounded-2xl p-6 shadow-xl text-center max-w-sm space-y-2">
            <Paperclip className="w-8 h-8 text-slate-700 mx-auto animate-bounce" />
            <p className="text-sm font-semibold text-slate-900">{t.dropFilesHere}</p>
            <p className="text-xs text-slate-500">{t.dropFilesDescription}</p>
          </div>
        </div>
      )}

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Empty State / Initial Greeting */}
          {messages.length === 0 && (
            <div className="py-12 sm:py-20 text-center space-y-4">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                Explainable Trust
              </h1>

              <div className="max-w-xl mx-auto space-y-2">
                <p className="text-lg font-medium text-slate-800">
                  &ldquo;{t.welcomePrompt}&rdquo;
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t.welcomeDescription}
                </p>
              </div>

              {/* Sample Prompts */}
              <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left">
                <div
                  onClick={() => {
                    if (onLoadSample) {
                      onLoadSample('CASE_quickbite-demo');
                    } else {
                      setInputText(
                        'I had my subscription cancelled abruptly without clear reason. I received a notice email and my service access stopped working immediately.'
                      );
                    }
                  }}
                  className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 cursor-pointer transition-all shadow-2xs hover:shadow-xs group"
                >
                  <p className="font-medium text-slate-900 group-hover:text-slate-800 mb-1">
                    {t.openDemo}
                  </p>
                  <p className="text-slate-500 line-clamp-2">
                    {t.openDemoDescription}
                  </p>
                </div>

                <div
                  onClick={() => {
                    if (onLoadSample) {
                      setInputText(t.sampleFollowUpText);
                    } else {
                      setInputText(
                        'I was charged for an order that courier claims was delivered, but the seller tracking mismatch shows delivery in another city.'
                      );
                    }
                  }}
                  className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 cursor-pointer transition-all shadow-2xs hover:shadow-xs group"
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

            return (
              <div
                key={msg.id}
                data-chat-message-id={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5 w-full scroll-m-8`}
              >
                {/* User Message: 2-line collapsed preview by default */}
                {isUser ? (
                  <div className={`w-full max-w-2xl bg-slate-900 text-slate-100 rounded-2xl px-4 py-3 shadow-2xs space-y-2 border transition-all ${msg.source_ids?.includes(highlightedStatementId ?? '') ? 'border-sky-300 ring-2 ring-sky-400 ring-offset-2' : 'border-slate-800'}`}>
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

                      {/* Expand / Collapse Button if text is multi-line or long */}
                      {(msg.text.length > 100 || (msg.attachments && msg.attachments.length > 0)) && (
                        <button
                          type="button"
                          onClick={() => toggleSubmissionExpand(msg.id)}
                          className="text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer shrink-0 mt-0.5"
                          title={isExpanded ? t.collapseMessage : t.expandMessage}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
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
                  /* Assistant Message: Revision delta only */
                  <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 space-y-2 text-slate-800">
                    {msg.error ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-amber-700 font-medium text-xs">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>{t.notice}</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {msg.error}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2.5">
                          <div className="font-normal text-xs sm:text-sm text-slate-800 leading-relaxed flex-1">
                            {msg.text ? (
                              msg.text.split('\n').map((line, idx) => (
                                <div key={idx} className="mb-1">{renderTextWithChips(line)}</div>
                              ))
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs max-w-md">
              <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />
              <div className="text-xs text-slate-600">
                <p className="font-medium text-slate-900">{t.reconstructingRecord}</p>
                <p className="text-[11px] text-slate-500">{t.updatingRecord}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Sticky Composer at Bottom */}
      <div className="border-t border-slate-200 bg-white/90 backdrop-blur-md p-3 sm:p-4">
        <div className="max-w-3xl mx-auto space-y-2">
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
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0"
              title={t.addFiles}
              aria-label={t.addFiles}
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                messages.length === 0
                  ? t.initialComposerPlaceholder
                  : t.followUpComposerPlaceholder
              }
              rows={1}
              className="flex-1 bg-transparent text-slate-900 text-sm placeholder-slate-400 focus:outline-none resize-none py-2 px-1 max-h-44"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!inputText.trim() && attachments.length === 0) || isLoading}
              className={`p-2.5 rounded-xl font-medium transition-all shrink-0 cursor-pointer flex items-center justify-center ${
                (inputText.trim() || attachments.length > 0) && !isLoading
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
