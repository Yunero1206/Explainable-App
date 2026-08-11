import type { CaseReference, CaseReferenceKind } from '../types.js';

const REFERENCE_PATTERNS: Array<[CaseReferenceKind, RegExp]> = [
  ['event', /^EV\d{2,}$/],
  ['statement', /^U\d{2,}$/],
  ['evidence', /^E\d{2,}$/],
  ['finding', /^C\d{2,}$/],
  ['gap', /^G\d{2,}$/],
  ['action', /^A\d{2,}$/],
];

export const CASE_REFERENCE_SPLIT_PATTERN = /(\[(?:EV|U|E|C|G|A)\d{2,}\])/g;

export function caseReferenceFromId(id: string): CaseReference | null {
  const normalized = id.replace(/^\[/, '').replace(/\]$/, '');
  const match = REFERENCE_PATTERNS.find(([, pattern]) => pattern.test(normalized));
  return match === undefined ? null : { kind: match[0], id: normalized };
}

export function caseReferenceTarget(reference: CaseReference): string {
  return `${reference.kind}:${reference.id}`;
}
