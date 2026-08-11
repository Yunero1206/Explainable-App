import React from 'react';
import type { CaseReference, CaseReferenceKind } from '../types.js';
import { useLanguage } from '../contexts/LanguageContext.js';

const styles: Record<CaseReferenceKind, string> = {
  statement: 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100',
  evidence: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
  event: 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200',
  finding: 'border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100',
  gap: 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100',
  action: 'border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100',
};

export function CaseKeyButton({
  reference,
  onSelect,
  active = false,
  title,
}: {
  reference: CaseReference;
  onSelect: (reference: CaseReference) => void;
  active?: boolean;
  title?: string;
}) {
  const { t } = useLanguage();
  const referenceLabel: Record<CaseReferenceKind, string> = {
    statement: t.statementReference,
    evidence: t.evidenceReference,
    event: t.eventReference,
    finding: t.findingReference,
    gap: t.gapReference,
    action: t.actionReference,
  };
  const accessibleLabel = `${t.openReference} ${referenceLabel[reference.kind]} ${reference.id}`;

  return (
    <button
      type="button"
      data-case-key={reference.id}
      data-case-kind={reference.kind}
      onClick={() => onSelect(reference)}
      className={`inline-flex font-mono text-[10px] font-bold leading-none px-1.5 py-1 rounded border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 ${styles[reference.kind]} ${active ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
      title={title ?? accessibleLabel}
      aria-label={accessibleLabel}
    >
      [{reference.id}]
    </button>
  );
}
