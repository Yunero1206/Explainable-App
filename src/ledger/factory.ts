import type { LedgerV3Case, CaseId, CaseNumber, CaseTitle, StructuralInstant } from './types';

export function createEmptyLedgerCase(input: {
  id: CaseId;
  case_number: CaseNumber;
  title: CaseTitle;
  created_at: StructuralInstant;
}): LedgerV3Case {
  return {
    id: input.id,
    schema_version: '3.0.0',
    case_number: input.case_number,
    title: input.title,
    created_at: input.created_at,
    current_revision_id: null,
    intake_ledger: [],
    statements: [],
    evidence: [],
    relationships: [],
    revisions: []
  };
}
