import { CanonicalCaseRecord } from './types.js';

export function createEmptyCanonicalRecord(
  caseId: string,
  caseNumber: string,
  title: string,
  objective: string = ''
): CanonicalCaseRecord {
  const timestamp = new Date().toISOString();
  
  return {
    id: caseId,
    schema_version: '2.0.0',
    case_number: caseNumber,
    created_at: timestamp,
    updated_at: timestamp,
    current_revision_id: 'R01',
    intake_ledger: [
      {
        id: 'IN01',
        received_at: timestamp,
        resulting_revision_id: 'R01',
        parts: []
      }
    ],
    statements: [],
    evidence: [],
    relationships: [],
    revisions: [
      {
        revision_id: 'R01',
        created_at: timestamp,
        title,
        objective,
        triggering_intake_id: 'IN01',
        input_statement_ids: [],
        input_evidence_ids: [],
        events: [],
        claims: [],
        gaps: [],
        actions: [],
        evidence_inspections: [],
        delta: { changes: [] },
        summary: {
          total_evidence_count: 0,
          established_claims_count: 0,
          unresolved_claims_count: 0,
          conflicted_claims_count: 0,
          user_reported_claims_count: 0
        }
      }
    ]
  };
}
