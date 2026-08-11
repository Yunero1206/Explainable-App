import React from 'react';
import { CheckCircle2, Cpu, ShieldAlert, Sparkles } from 'lucide-react';
import type { ModelRunAudit } from '../runtime/modelRun.js';

export type InferenceMode = 'live' | 'replay';

export function InferenceModeControl({
  inferenceMode,
  onChangeInferenceMode,
  latestRun,
}: {
  inferenceMode: InferenceMode;
  onChangeInferenceMode: (mode: InferenceMode) => void;
  latestRun?: ModelRunAudit;
}) {
  const latestRunLabel = latestRun?.provider === 'deterministic-replay'
    ? 'Replay'
    : latestRun?.model_id;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2 space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        {inferenceMode === 'replay' ? <Cpu className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
        Model run
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
      {latestRun ? (
        <div className="flex items-start justify-between gap-2 text-[9px] leading-snug">
          <span className="font-mono text-slate-500 truncate" title={`${latestRun.id} · ${latestRun.provider} · ${latestRun.model_id}`}>
            {latestRun.id} · {latestRunLabel}
          </span>
          <span className={`flex items-center gap-1 font-semibold shrink-0 ${latestRun.status === 'accepted' ? 'text-emerald-700' : 'text-rose-700'}`}>
            {latestRun.status === 'accepted' ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
            {latestRun.status}
          </span>
        </div>
      ) : (
        <p className="text-[10px] leading-snug text-slate-500">
          {inferenceMode === 'replay' ? 'Deterministic replay' : 'gemini-3.5-flash'}
        </p>
      )}
    </div>
  );
}
