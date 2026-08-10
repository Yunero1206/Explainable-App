import React, { useState } from 'react';
import { Play, RotateCcw, Copy, Check, Cpu, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import quickbiteFixture from '../../dev/fixtures/quickbite.replay.json';

export type InferenceMode = 'live' | 'replay';

interface TestModeBannerProps {
  inferenceMode: InferenceMode;
  onChangeInferenceMode: (mode: InferenceMode) => void;
  onResetTest: () => void;
  turnCount: number;
  onInsertNextMessage?: (text: string) => void;
}

export function TestModeBanner({
  inferenceMode,
  onChangeInferenceMode,
  onResetTest,
  turnCount,
  onInsertNextMessage,
}: TestModeBannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Production safety: hide in production build
  if ((import.meta as any).env?.PROD || process.env.NODE_ENV === 'production') {
    return null;
  }

  const turns = (quickbiteFixture as any).turns || [];
  const totalTurns = turns.length;
  const isSequenceComplete = turnCount >= totalTurns;

  const getNextInputText = () => {
    if (isSequenceComplete) {
      return `QuickBite ${totalTurns}-turn calibration sequence complete. Click Reset Test to start over.`;
    }
    return turns[turnCount]?.input_match || 'No further steps in fixture.';
  };

  const nextInputText = getNextInputText();

  const handleCopy = () => {
    if (isSequenceComplete) return;
    navigator.clipboard.writeText(nextInputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onInsertNextMessage) {
      onInsertNextMessage(nextInputText);
    }
  };

  return (
    <div className="relative z-50">
      {/* Top Control Badge: Subtle light developer badge */}
      <div className="flex items-center gap-2 px-2.5 py-1 bg-white border border-slate-200 shadow-2xs rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800 hover:text-slate-900"
        >
          <Cpu className="w-3.5 h-3.5 text-slate-600" />
          <span>TEST MODE</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${inferenceMode === 'replay'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}>
            {inferenceMode.toUpperCase()}
          </span>
          {isOpen ? <ChevronUp className="w-3 h-3 text-slate-500 ml-0.5" /> : <ChevronDown className="w-3 h-3 text-slate-500 ml-0.5" />}
        </button>

        <span className="w-1 h-1 rounded-full bg-slate-300" />

        {inferenceMode === 'replay' ? (
          <span className="text-[11px] text-blue-700 font-medium flex items-center gap-1">
            0 Gemini requests
          </span>
        ) : (
          <span className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-slate-500" />
            Live Gemini
          </span>
        )}
      </div>

      {/* Expanded Popover Panel */}
      {isOpen && (
        <div className="absolute top-8 right-0 w-80 bg-white border border-slate-200 shadow-xl rounded-xl p-4 text-slate-800 space-y-3.5 text-xs font-sans">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Cpu className="w-4 h-4 text-slate-700" />
              <span>Test Mode Controls</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              Close
            </button>
          </div>

          {/* Mode Switcher */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1.5 font-medium">
              Inference Provider:
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => onChangeInferenceMode('replay')}
                className={`py-1.5 px-2 rounded-md font-medium cursor-pointer transition-colors text-center text-xs ${inferenceMode === 'replay'
                    ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Replay (0 API)
              </button>
              <button
                type="button"
                onClick={() => onChangeInferenceMode('live')}
                className={`py-1.5 px-2 rounded-md font-medium cursor-pointer transition-colors text-center text-xs ${inferenceMode === 'live'
                    ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Live Gemini
              </button>
            </div>
          </div>

          {/* Status Callout */}
          {inferenceMode === 'replay' ? (
            <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 text-blue-900 font-medium leading-relaxed">
              ⚡ <strong>Deterministic Replay</strong> · 0 Gemini requests. Inputs match pre-recorded test fixture.
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-medium leading-relaxed">
              🌐 <strong>Live AI Mode</strong> · Gemini API requests active.
            </div>
          )}

          {/* Test Case Selection & Progress */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-medium">Test Case:</span>
              <span className="font-semibold text-slate-900">QuickBite Calibration</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-medium">Progress:</span>
              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Turn {turnCount} / {totalTurns}
              </span>
            </div>
          </div>

          {/* Next Fixture Input & Copy Action */}
          <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Expected Next Input:</span>
              {!isSequenceComplete && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-blue-700 hover:text-blue-900 font-medium cursor-pointer"
                  title="Copy and insert into chat input"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied & Inserted!' : 'Copy & Insert'}</span>
                </button>
              )}
            </div>
            <div className="text-slate-800 font-mono text-[11px] bg-white p-2 rounded border border-slate-200 break-words select-all">
              "{nextInputText}"
            </div>
          </div>

          {/* Reset Control */}
          <button
            type="button"
            onClick={() => {
              onResetTest();
            }}
            className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold rounded-lg border border-slate-300 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start / Reset QuickBite Test</span>
          </button>
        </div>
      )}
    </div>
  );
}
