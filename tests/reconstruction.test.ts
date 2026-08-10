import { describe, it, expect } from 'vitest';
import { reconcileNextRevision } from '../src/domain/reconcile';
import { CaseRevision, UserStatement, EvidenceItem, AnalysisSummary } from '../src/types';
import { CaseReconstructionOutput } from '../src/schema';
describe('Deterministic Reconciliation', () => {
  it('should generate a new revision correctly', () => {
    const existingRevisions: CaseRevision[] = [{
      revision_id: 'R01',
      created_at: '2023-01-01T00:00:00Z',
      input_statement_ids: ['U01'],
      input_evidence_ids: ['E01'],
      events: [],
      claims: [{ id: 'C01', description: 'Existing claim', assessment_state: 'Reported' } as any],
      gaps: [],
      actions: [],
      summary: {} as any,
      reasoning_contract_version: '1.0.0',
    }];

    const reconstructionOutput: CaseReconstructionOutput = {
      segmented_intake: {
        narrative_statement: { id: 'U02', text: 'new text' } as any,
        pasted_evidences: []
      },
      evidence_inspection: [],
      events: [],
      claims: [
        { id: 'C01', description: 'Existing claim', assessment_state: 'Reported' } as any,
        { id: 'C02', description: 'New claim', assessment_state: 'Reported' } as any,
      ],
      gaps: [],
      actions: [],
      input_dispositions: [],
      revision_delta_summary: '',
    };

    const updatedStatements: UserStatement[] = [
      { id: 'U01', text: 'old text' } as any,
      { id: 'U02', text: 'new text' } as any,
    ];

    const mergedEvidence: EvidenceItem[] = [
      { id: 'E01', label: 'old ev' } as any,
    ];

    const deterministicSummary: AnalysisSummary = {
      total_evidence_count: 2,
      established_claims_count: 0,
      unresolved_claims_count: 0,
      conflicted_claims_count: 0,
      user_reported_claims_count: 0
    };

    const newRevision = reconcileNextRevision({
      existingRevisions,
      reconstructionOutput,
      updatedStatements,
      mergedEvidence,
      turnTimestamp: '2023-01-02T00:00:00Z',
      deterministicSummary,
      usedModelId: 'test-model',
      inferenceModeModelId: 'fallback-model',
    });

    expect(newRevision.revision_id).toBe('R02');
    expect(newRevision.input_statement_ids).toEqual(['U01', 'U02']);
    expect(newRevision.input_evidence_ids).toEqual(['E01']);
    expect(newRevision.claims.length).toBe(2);
    expect(newRevision.revision_delta_summary).toContain('Recorded Findings: C02');
    expect(newRevision.model_id).toBe('test-model');
  });
});
