import React from 'react';
import { X, Download, FileText, Image as ImageIcon, FileCheck, ExternalLink } from 'lucide-react';
import { EvidenceItem } from '../types';

interface OriginalArtifactModalProps {
  evidence: EvidenceItem | null;
  onClose: () => void;
}

export const OriginalArtifactModal: React.FC<OriginalArtifactModalProps> = ({
  evidence,
  onClose,
}) => {
  if (!evidence) return null;

  const isImage =
    evidence.file_type?.startsWith('image/') ||
    evidence.input_form === 'screenshot' ||
    evidence.input_form === 'image' ||
    evidence.file_data_url?.startsWith('data:image/');

  const isPdf =
    evidence.file_type === 'application/pdf' ||
    evidence.input_form === 'pdf' ||
    evidence.file_data_url?.startsWith('data:application/pdf');

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        {/* Modal Header */}
        <div className="bg-slate-900 text-slate-100 p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-lg border border-emerald-500/30">
              {isImage ? (
                <ImageIcon className="w-5 h-5" />
              ) : isPdf ? (
                <FileCheck className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                  Level 3 Raw Artifact · {evidence.id}
                </span>
                <span className="text-xs text-slate-400 capitalize">
                  {(evidence.input_form || 'Document').replaceAll('_', ' ')}
                </span>
              </div>
              <h3 className="text-base font-bold text-white truncate max-w-md sm:max-w-lg mt-0.5">
                {evidence.label}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {evidence.file_data_url && (
              <a
                href={evidence.file_data_url}
                download={evidence.file_name || `${evidence.id}-original`}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1.5"
                title="Download original file"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download Raw</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Render Original Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950 flex flex-col items-center justify-center min-h-[300px]">
          {isImage && evidence.file_data_url ? (
            <div className="max-w-full max-h-[65vh] flex flex-col items-center justify-center overflow-auto p-2 bg-slate-900/50 rounded-xl border border-slate-800">
              <img
                src={evidence.file_data_url}
                alt={evidence.label}
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-md"
              />
            </div>
          ) : isPdf && evidence.file_data_url ? (
            <div className="w-full h-[60vh] bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
              <iframe
                src={evidence.file_data_url}
                title={evidence.label}
                className="w-full h-full border-none"
              />
            </div>
          ) : (
            <div className="w-full bg-slate-900 text-slate-100 font-mono text-xs sm:text-sm p-6 rounded-xl border border-slate-800 whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto select-text shadow-inner">
              {evidence.content || 'No text content extracted for this original artifact.'}
            </div>
          )}
        </div>

        {/* Modal Footer / Source Metadata Bar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              <strong className="text-slate-300">Claimed Source:</strong>{' '}
              {evidence.claimed_source || 'Unspecified'}
            </span>
            <span>·</span>
            <span>
              <strong className="text-slate-300">Acquisition:</strong>{' '}
              {(evidence.acquisition_method || 'user_upload').replaceAll('_', ' ')}
            </span>
            {evidence.evidence_time && (
              <>
                <span>·</span>
                <span>
                  <strong className="text-slate-300">Artifact Time:</strong>{' '}
                  {evidence.evidence_time}
                </span>
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer self-end sm:self-auto"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
