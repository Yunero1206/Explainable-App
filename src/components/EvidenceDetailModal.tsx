import React from 'react';
import {
  X,
  ShieldAlert,
  Link,
  ExternalLink
} from 'lucide-react';
import { EvidenceItem, CaseEvent, Claim } from '../types';

interface EvidenceDetailModalProps {
  evidence: EvidenceItem | null;
  events: CaseEvent[];
  claims: Claim[];
  onClose: () => void;
  onOpenOriginal?: (evidence: EvidenceItem) => void;
  onSelectClaim?: (claimId: string) => void;
  onSelectEvent?: (eventId: string) => void;
}

export const EvidenceDetailModal: React.FC<EvidenceDetailModalProps> = ({
  evidence,
  events,
  claims,
  onClose,
  onOpenOriginal,
  onSelectClaim,
  onSelectEvent,
}) => {
  if (!evidence) return null;

  // Find linked claims and events
  const linkedEvents = events.filter((e) => e.evidence_ids.includes(evidence.id));
  const linkedClaims = claims.filter(
    (c) =>
      c.supporting_evidence.includes(evidence.id) ||
      c.qualifying_evidence.includes(evidence.id) ||
      c.conflicting_evidence.includes(evidence.id)
  );

  const sha256 = evidence.raw_submission?.sha256_hash;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-white text-slate-900 p-6 flex items-start justify-between gap-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                Level 2 Inspection · {evidence.id}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Evidence Artifact Provenance
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">{evidence.label}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Epistemic Provenance Rule Warning */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-800">
            <ShieldAlert className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 mb-0.5">
                Epistemic Inspection & Boundaries
              </p>
              <p className="leading-relaxed text-slate-600">
                {evidence.limitations?.[0] ||
                  'Claimed source: User · Supplied by user · Original-source authenticity not independently verified.'}
              </p>
            </div>
          </div>

          {/* Key Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="block text-slate-500 font-medium mb-0.5">Claimed Source</span>
              <span className="font-semibold text-slate-900">{evidence.claimed_source || 'Unspecified'}</span>
            </div>
            <div>
              <span className="block text-slate-500 font-medium mb-0.5">Input Form</span>
              <span className="font-mono capitalize text-slate-800">{(evidence.input_form || 'document').replaceAll('_', ' ')}</span>
            </div>
            <div>
              <span className="block text-slate-500 font-medium mb-0.5">Acquisition Method</span>
              <span className="font-mono capitalize text-slate-800">{(evidence.acquisition_method || 'user_upload').replaceAll('_', ' ')}</span>
            </div>
            <div>
              <span className="block text-slate-500 font-medium mb-0.5">Artifact Timestamp</span>
              <span className="font-mono text-slate-800">{evidence.evidence_time || 'Not specified'}</span>
            </div>
          </div>

          {/* SHA-256 Fixity Hash */}
          {sha256 && (
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 flex items-center justify-between">
              <span className="font-semibold text-slate-900">Fixity Hash (SHA-256):</span>
              <span className="text-slate-600 select-all truncate max-w-xs">{sha256}</span>
            </div>
          )}

          {/* Extracted or submitted source content */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Raw Extracted / Submitted Source Content
              </h4>
              <div className="p-4 bg-slate-50 text-slate-900 font-mono text-xs rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {evidence.content || 'No raw text provided for this artifact.'}
              </div>
            </div>

          </div>

          {/* Subject/Object Identifiers Observed */}
          {evidence.subject_object_ids && evidence.subject_object_ids.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Subject / Object Identifiers Observed
              </h4>
              <div className="flex flex-wrap gap-2">
                {evidence.subject_object_ids.map((id, i) => (
                  <span
                    key={i}
                    className="bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded-md font-mono border border-slate-200"
                  >
                    {id}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Complete 5-Point Evidence Provenance Evaluation */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              5-Point Evidence Provenance Evaluation
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-0.5">1. Source Attribution</span>
                <p className="text-slate-600">{evidence.source_attribution}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-0.5">2. Case / Object Match</span>
                <p className="text-slate-600">{evidence.case_object_match}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-0.5">3. Completeness & Context</span>
                <p className="text-slate-600">{evidence.completeness_context}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-0.5">4. Integrity Signals</span>
                <p className="text-slate-600">{evidence.integrity_signals}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 sm:col-span-2">
                <span className="font-semibold text-slate-800 block mb-0.5">5. Explicit Limitations</span>
                <p className="text-slate-600">
                  {evidence.limitations?.join(' · ') || 'Supplied by user · Original-source authenticity not independently verified.'}
                </p>
              </div>
            </div>
          </div>

          {/* Traceability: Linked Events & Claims */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5 text-slate-500" />
              Traceability Links ({linkedEvents.length} Events · {linkedClaims.length} Claims)
            </h4>

            {linkedEvents.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500">Relied on by Timeline Events:</span>
                <div className="space-y-1.5">
                  {linkedEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => onSelectEvent?.(ev.id)}
                      className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold bg-slate-800 text-white px-1.5 py-0.5 rounded">
                          {ev.id}
                        </span>
                        <span className="font-medium text-slate-900">
                          {ev.time} · {ev.actor} {ev.action} {ev.target}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {ev.assessment}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {linkedClaims.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500">Linked Claims:</span>
                <div className="space-y-1.5">
                  {linkedClaims.map((claim) => (
                    <div
                      key={claim.id}
                      onClick={() => onSelectClaim?.(claim.id)}
                      className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold bg-emerald-800 text-white px-1.5 py-0.5 rounded">
                          {claim.id}
                        </span>
                        <span className="font-medium text-slate-900 line-clamp-1">{claim.text}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                        {claim.assessment}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          {onOpenOriginal ? (
            <button
              onClick={() => {
                onClose();
                onOpenOriginal(evidence);
              }}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Original Raw Artifact (Level 3)</span>
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close Inspection
          </button>
        </div>
      </div>
    </div>
  );
};
