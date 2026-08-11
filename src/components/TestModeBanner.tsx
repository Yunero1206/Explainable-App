import React from 'react';

export function ModelRunsSummary() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        Model Runs
      </div>
      <p className="font-mono text-[10px] leading-snug text-slate-500">gemini-3.6-flash</p>
    </div>
  );
}
