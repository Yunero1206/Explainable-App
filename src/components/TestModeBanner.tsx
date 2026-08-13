import React from 'react';
import type { ModelRunAudit, ModelRunMode } from '../runtime/modelRun.js';

interface ModelRunsSummaryProps {
  selectedMode?: ModelRunMode;
  latestRun?: ModelRunAudit | null;
}

function retrievalLabel(run: ModelRunAudit): string {
  const trace = run.retrieval_trace;
  if (run.run_mode === 'analysis_only' || trace?.status === 'not_requested') return 'No web requested';
  if (trace === undefined) return 'Web trace unavailable';
  if (trace.status === 'no_public_need') return 'Tavily not needed';
  if (trace.status === 'completed') {
    const credits = trace.credits_used === null ? '' : ` · ${trace.credits_used} credit${trace.credits_used === 1 ? '' : 's'}`;
    return `Tavily admitted ${trace.admitted_evidence_ids.length} source${trace.admitted_evidence_ids.length === 1 ? '' : 's'}${credits}`;
  }
  if (trace.status === 'no_authoritative_source') return 'No authoritative source admitted';
  if (trace.status === 'blocked') return 'Public query blocked';
  return 'Tavily/provider error';
}

export function ModelRunsSummary({
  selectedMode = 'analysis_only',
  latestRun = null,
}: ModelRunsSummaryProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        Model Runs
      </div>
      <div className="space-y-1 text-[10px] leading-snug">
        <div className={selectedMode === 'analysis_only' ? 'text-slate-900 font-semibold' : 'text-slate-500'}>
          {selectedMode === 'analysis_only' ? '● ' : '○ '}Analysis only
          <div className="pl-3 font-mono font-normal text-slate-500">gemini-3.6-flash</div>
        </div>
        <div className={selectedMode === 'web_assisted' ? 'text-slate-900 font-semibold' : 'text-slate-500'}>
          {selectedMode === 'web_assisted' ? '● ' : '○ '}Web-assisted
          <div className="pl-3 font-mono font-normal text-slate-500">Gemini + Tavily Search</div>
        </div>
      </div>
      {latestRun !== null && (
        <div className="border-t border-slate-100 pt-1.5 text-[10px] leading-snug text-slate-500">
          <div className="font-mono text-slate-600">{latestRun.id} · {latestRun.status}</div>
          <div>{retrievalLabel(latestRun)}</div>
          {latestRun.retrieval_trace !== undefined && latestRun.run_mode === 'web_assisted' && (
            <details className="mt-1.5">
              <summary className="cursor-pointer font-semibold text-slate-600">Retrieval trace</summary>
              <div className="mt-1 space-y-1 border-l border-slate-200 pl-2">
                {latestRun.retrieval_trace.executed_queries.map((query, index) => (
                  <div key={`${query}-${index}`} className="break-words font-mono text-[9px]" title={query}>
                    Query {index + 1}: {query}
                  </div>
                ))}
                <div>Admitted: {latestRun.retrieval_trace.admitted_evidence_ids.join(', ') || 'none'}</div>
                <div>Rejected: {latestRun.retrieval_trace.rejected_candidates.length}</div>
                {latestRun.retrieval_trace.provider_request_ids.length > 0 && (
                  <div className="break-all font-mono text-[9px]">
                    Request: {latestRun.retrieval_trace.provider_request_ids.join(', ')}
                  </div>
                )}
              </div>
            </details>
          )}
          {latestRun.retrieval_trace?.failure_reason && (
            <div className="mt-1 text-amber-700 line-clamp-3">{latestRun.retrieval_trace.failure_reason}</div>
          )}
        </div>
      )}
    </div>
  );
}
