import React from 'react';
import { Cpu, Sparkles } from 'lucide-react';

export type InferenceMode = 'live' | 'replay';

export function InferenceModeControl({
  inferenceMode,
  onChangeInferenceMode,
}: {
  inferenceMode: InferenceMode;
  onChangeInferenceMode: (mode: InferenceMode) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2 space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        {inferenceMode === 'replay' ? <Cpu className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
        Inference
      </div>
      <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-md">
        <button
          type="button"
          onClick={() => onChangeInferenceMode('replay')}
          className={`rounded px-1.5 py-1 text-[10px] font-semibold ${inferenceMode === 'replay' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500'}`}
          title="Deterministic local demo; no API key required"
        >
          Replay
        </button>
        <button
          type="button"
          onClick={() => onChangeInferenceMode('live')}
          className={`rounded px-1.5 py-1 text-[10px] font-semibold ${inferenceMode === 'live' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500'}`}
          title="Live Gemini; server requires GEMINI_API_KEY"
        >
          Live
        </button>
      </div>
      <p className="text-[10px] leading-snug text-slate-500">
        {inferenceMode === 'replay' ? 'Runs without credentials.' : 'Uses gemini-3.5-flash.'}
      </p>
    </div>
  );
}
