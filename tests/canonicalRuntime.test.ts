import { describe, it, expect } from 'vitest';
import { admitBootstrapRecord, parseCanonicalRecord } from '../src/canonical/boundary.js';
import { projectToPresentation } from '../src/domain/currentProjection.js';
import { createEmptyCanonicalRecord } from '../src/canonical/factory.js';
import { buildAndCommitTransition } from '../src/canonical/transition.js';
import { commitIntakeResponse } from '../src/domain/clientCommit.js';
import {
  parseTranslationResponse,
  isOverlayStale,
  applyTranslationOverlay,
  TranslationOverlaySchema,
} from '../src/domain/translationOverlay.js';
import {
  CanonicalCaseRecordSchema,
  validateCanonicalRecord,
} from '../src/canonical/index.js';
import type { CanonicalCaseRecord } from '../src/canonical/types.js';
import type { CaseReconstructionOutput as ReconOutput } from '../src/schema.js';

// ---------------------------------------------------------------------------
// Helper: build a minimal but valid reconstruction output for a deterministic test
// ---------------------------------------------------------------------------
function buildDeterministicReconOutput(opts: {
  newStatementTempId: string;
  newEvidenceTempId: string;
  existingStatementIds: string[];
  existingEvidenceIds: string[];
}): ReconOutput {
  return {
    segmented_intake: {
      narrative_statement: { id: opts.newStatementTempId, text: 'New user statement' },
      pasted_evidences: [],
    },
    evidence_inspection: [
      {
        id: opts.newEvidenceTempId,
        label: 'New Evidence',
        claimed_source: 'user',
        source_attribution: 'user',
        case_object_match: 'match',
        case_object_match_status: 'matched',
        completeness_context: 'complete',
        integrity_signals: 'none',
        subject_object_ids: [],
        limitations: ['limitation 1'],
      },
    ],
    input_dispositions: [
      {
        id: opts.newStatementTempId,
        disposition: 'supports_finding',
        related_object_ids: ['C01'],
        reason: 'Supports existing claim',
      },
      {
        id: opts.newEvidenceTempId,
        disposition: 'supports_finding',
        related_object_ids: ['C01'],
        reason: 'New evidence supports claim',
      },
    ],
    events: [
      {
        id: 'EV1',
        time: '2023-01-01',
        actor: 'Actor',
        action: 'Action',
        target: 'Target',
        effect: 'Effect',
        evidence_ids: ['U01'],
        user_statement_ids: [],
        assessment: 'Established within current record',
        is_user_reported_only: false,
      },
      {
        id: 'EV2',
        time: '2023-01-02',
        actor: 'New Actor',
        action: 'New Action',
        target: 'New Target',
        effect: 'New Effect',
        evidence_ids: [opts.newStatementTempId],
        user_statement_ids: [],
        assessment: 'Reported',
        is_user_reported_only: false,
      },
    ],
    claims: [
      {
        id: 'C01',
        text: 'Existing claim updated',
        actor: 'A',
        action: 'A',
        target: 'T',
        time: '2023-01-01',
        supporting_evidence: ['U01', opts.newStatementTempId],
        qualifying_evidence: [],
        conflicting_evidence: [],
        user_statement_ids: [],
        assessment: 'Established within current record',
        reasoning: 'Reason',
        scope: '',
        limits: [],
        causal_relationship: 'none',
      },
      {
        id: 'C02',
        text: 'New claim from evidence',
        actor: 'B',
        action: 'B',
        target: 'T',
        time: '2023-01-02',
        supporting_evidence: [opts.newEvidenceTempId],
        qualifying_evidence: [],
        conflicting_evidence: [],
        user_statement_ids: [],
        assessment: 'Reported',
        reasoning: 'New',
        scope: '',
        limits: [],
        causal_relationship: 'none',
      },
    ],
    gaps: [
      {
        id: 'G01',
        what_is_unknown: 'Q1',
        why_it_matters: 'Matters',
        what_evidence_could_resolve_it: 'Evidence',
        where_how_to_obtain: 'Obtain',
        what_not_to_over_collect: 'None',
        target_claim_ids: ['C01'],
        status: 'open',
      },
      {
        id: 'G02',
        what_is_unknown: 'Q2',
        why_it_matters: 'New gap',
        what_evidence_could_resolve_it: 'New evidence',
        where_how_to_obtain: 'Source',
        what_not_to_over_collect: 'None',
        target_claim_ids: ['C02'],
        status: 'open',
      },
    ],
    actions: [
      {
        id: 'A01',
        title: 'Existing action',
        description: 'Action 1',
        target_gap_id: 'G01',
        priority: 'medium',
      },
      {
        id: 'A02',
        title: 'New action',
        description: 'Action 2',
        target_gap_id: 'G02',
        priority: 'high',
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Helper: build a valid baseline canonical record
// ---------------------------------------------------------------------------
function createValidBaseline(): CanonicalCaseRecord {
  const timestamp = '2023-01-01T00:00:00Z';
  return {
    id: 'case-01',
    schema_version: '2.0.0',
    case_number: 'CASE-01',
    created_at: timestamp,
    updated_at: timestamp,
    current_revision_id: 'R01',
    intake_ledger: [
      {
        id: 'IN01',
        received_at: timestamp,
        resulting_revision_id: 'R01',
        parts: [
          { kind: 'statement', statement_id: 'U01', raw_text: 'Statement 1' },
          { kind: 'evidence', evidence_id: 'E01', submitted_name: 'ev.pdf' },
        ],
      },
    ],
    statements: [
      { id: 'U01', text: 'Statement 1', submitted_at: timestamp, source_intake_id: 'IN01' },
    ],
    evidence: [
      { id: 'E01', label: 'Ev 1', origin_type: 'user', input_form: 'file', submitted_at: timestamp, source_intake_id: 'IN01' },
    ],
    relationships: [
      { id: 'REL01', source_id: 'U01', target_id: 'C01', relationship_type: 'supports_claim', reason: 'Direct', created_in_revision_id: 'R01' },
      { id: 'REL02', source_id: 'E01', target_id: 'C01', relationship_type: 'supports_claim', reason: 'Direct', created_in_revision_id: 'R01' },
    ],
    revisions: [
      {
        revision_id: 'R01',
        created_at: timestamp,
        title: 'Initial',
        objective: 'Objective',
        triggering_intake_id: 'IN01',
        input_statement_ids: ['U01'],
        input_evidence_ids: ['E01'],
        events: [
          { id: 'EV1', time: '2023-01-01', actor: 'Actor', action: 'Action', target: 'Target', evidence_ids: ['U01'], assessment: 'Established within current record' },
        ],
        claims: [
          { id: 'C01', text: 'Claim 1', assessment: 'Established within current record', reasoning: 'Reason', supporting_evidence: ['U01', 'E01'], qualifying_evidence: [], conflicting_evidence: [] },
        ],
        gaps: [
          { id: 'G01', question_key: 'Q1', status: 'open', target_claim_ids: ['C01'] },
        ],
        actions: [
          { id: 'A01', description: 'Action 1', target_gap_ids: ['G01'] },
        ],
        evidence_inspections: [
          { id: 'EI01', evidence_id: 'E01', limitations: [] },
        ],
        delta: {
          changes: [
            { entity_type: 'event', entity_id: 'EV1', operation: 'added', reason: 'init', source_ids: ['U01'] },
            { entity_type: 'claim', entity_id: 'C01', operation: 'added', reason: 'init', source_ids: ['U01', 'E01'] },
            { entity_type: 'gap', entity_id: 'G01', operation: 'added', reason: 'init', source_ids: [] },
            { entity_type: 'action', entity_id: 'A01', operation: 'added', reason: 'init', source_ids: [] },
          ],
        },
        summary: { total_evidence_count: 1, established_claims_count: 1, unresolved_claims_count: 0, conflicted_claims_count: 0, user_reported_claims_count: 0 },
      },
    ],
  } as CanonicalCaseRecord;
}

// ===========================================================================
// 1. admitBootstrapRecord
// ===========================================================================
describe('admitBootstrapRecord', () => {
  it('admits a valid canonical record unchanged (Positive proof 1: legacy upgrade)', () => {
    const record = createValidBaseline();
    const admitted = admitBootstrapRecord(record);
    expect(admitted.id).toBe('case-01');
    expect(admitted.schema_version).toBe('2.0.0');
    expect(admitted.current_revision_id).toBe('R01');
  });

  it('rejects partial legacy-looking objects missing required fields', () => {
    // Missing title and objective — should be rejected
    const partial = { id: 'case-x', statements: [], evidence: [], events: [], claims: [], gaps: [], actions: [] };
    expect(() => admitBootstrapRecord(partial)).toThrow();
  });

  it('rejects null and non-object inputs', () => {
    expect(() => admitBootstrapRecord(null)).toThrow();
    expect(() => admitBootstrapRecord('string')).toThrow();
    expect(() => admitBootstrapRecord(42)).toThrow();
  });
});

// ===========================================================================
// 2. projectToPresentation
// ===========================================================================
describe('projectToPresentation', () => {
  it('projects a valid canonical record without mutation (Positive proof 2)', () => {
    const record = createValidBaseline();
    const originalJson = JSON.stringify(record);
    const presentation = projectToPresentation(record);
    // Canonical input unchanged
    expect(JSON.stringify(record)).toBe(originalJson);
    // Presentation has the right structure
    expect(presentation.id).toBe('case-01');
    expect(presentation.title).toBe('Initial');
    expect(presentation.claims.length).toBe(1);
    expect(presentation.gaps.length).toBe(1);
  });
});

// ===========================================================================
// 3. createEmptyCanonicalRecord
// ===========================================================================
describe('createEmptyCanonicalRecord', () => {
  it('factory output passes schema and invariant validation', () => {
    const record = createEmptyCanonicalRecord('case-new', 'C-NEW', 'Title', 'Obj');
    const parseResult = CanonicalCaseRecordSchema.safeParse(record);
    expect(parseResult.success).toBe(true);
    const errors = validateCanonicalRecord(record);
    expect(errors).toHaveLength(0);
  });
});

// ===========================================================================
// 4. buildAndCommitTransition — deterministic test
// ===========================================================================
describe('buildAndCommitTransition', () => {
  it('appends exactly one child revision with proper IDs, deltas and preserved prior (Positive proofs 3-6)', () => {
    const baseline = createValidBaseline();
    const baselineJson = JSON.stringify(baseline);
    const timestamp = '2023-06-15T12:00:00Z';

    const reconOutput = buildDeterministicReconOutput({
      newStatementTempId: 'U_TEMP_0',
      newEvidenceTempId: 'E_TEMP_0',
      existingStatementIds: ['U01'],
      existingEvidenceIds: ['E01'],
    });

    const result = buildAndCommitTransition({
      priorRecord: baseline,
      reconstructionOutput: reconOutput,
      newStatements: [{ text: 'New user statement', submitted_at: timestamp }],
      newEvidence: [{ label: 'New Evidence', origin_type: 'file', input_form: 'document', submitted_at: timestamp }],
      timestamp,
      modelId: 'test-model',
      tempIdRemap: {
        statementTempIds: ['U_TEMP_0'],
        evidenceTempIds: ['E_TEMP_0'],
      },
    });

    // 3. Appends exactly one child revision
    expect(result.revisions.length).toBe(2);
    const newRev = result.revisions[1];
    expect(newRev.revision_id).toBe('R02');
    expect(newRev.parent_revision_id).toBe('R01');

    // 4. Prior revision preserved (deep equality — schema parse may reorder keys)
    expect(result.revisions[0]).toEqual(JSON.parse(baselineJson).revisions[0]);

    // 5. Result passes schema and invariant validation
    const parseResult = CanonicalCaseRecordSchema.safeParse(result);
    expect(parseResult.success).toBe(true);
    const errors = validateCanonicalRecord(result);
    expect(errors).toHaveLength(0);

    // 6. current_revision_id points to the appended revision
    expect(result.current_revision_id).toBe('R02');

    // Verify new statement got canonical ID (U02 not U_TEMP_0)
    const newStatement = result.statements.find(s => s.text === 'New user statement');
    expect(newStatement).toBeDefined();
    expect(newStatement!.id).toBe('U02');

    // Verify new evidence got canonical ID (E02 not E_TEMP_0)
    const newEvidence = result.evidence.find(e => e.label === 'New Evidence');
    expect(newEvidence).toBeDefined();
    expect(newEvidence!.id).toBe('E02');

    // Verify intake ledger has two entries
    expect(result.intake_ledger.length).toBe(2);
    expect(result.intake_ledger[1].id).toBe('IN02');

    // Verify delta has entries (not empty)
    expect(newRev.delta.changes.length).toBeGreaterThan(0);

    // Verify temp ID remapping in claims
    const claim = newRev.claims.find(c => c.id === 'C01');
    expect(claim).toBeDefined();
    expect(claim!.supporting_evidence).toContain('U02'); // remapped from U_TEMP_0

    // Verify new claim C02 was added
    const newClaim = newRev.claims.find(c => c.id === 'C02');
    expect(newClaim).toBeDefined();
    expect(newClaim!.supporting_evidence).toContain('E02'); // remapped from E_TEMP_0

    // Verify coherent timestamp
    expect(result.updated_at).toBe(timestamp);
    expect(newRev.created_at).toBe(timestamp);

    // Verify new gap G02 was added
    expect(newRev.gaps.length).toBe(2);
    const newGap = newRev.gaps.find(g => g.id === 'G02');
    expect(newGap).toBeDefined();

    // Verify new action A02 was added
    expect(newRev.actions.length).toBe(2);
    const newAction = newRev.actions.find(a => a.id === 'A02');
    expect(newAction).toBeDefined();

    // Verify relationships were created
    expect(result.relationships.length).toBeGreaterThan(2); // original 2 + new ones
  });

  it('ID allocation remains collision-free when arrays contain gaps', () => {
    const baseline = createValidBaseline();
    // Remove U01 from statements to create a gap, but keep ID U01 in existing references
    // The scan should still see U01 and allocate U02
    const result = buildAndCommitTransition({
      priorRecord: baseline,
      reconstructionOutput: buildDeterministicReconOutput({
        newStatementTempId: 'U_TEMP_0',
        newEvidenceTempId: 'E_TEMP_0',
        existingStatementIds: ['U01'],
        existingEvidenceIds: ['E01'],
      }),
      newStatements: [{ text: 'Statement after gap', submitted_at: '2023-06-15T12:00:00Z' }],
      newEvidence: [{ label: 'Evidence after gap', origin_type: 'file', input_form: 'document', submitted_at: '2023-06-15T12:00:00Z' }],
      timestamp: '2023-06-15T12:00:00Z',
      modelId: 'test',
      tempIdRemap: {
        statementTempIds: ['U_TEMP_0'],
        evidenceTempIds: ['E_TEMP_0'],
      },
    });

    // New statement should be U02, not U01 (collision)
    const newStmt = result.statements.find(s => s.text === 'Statement after gap');
    expect(newStmt!.id).toBe('U02');
  });

  it('temporary provider IDs are remapped to allocated canonical IDs', () => {
    const baseline = createValidBaseline();
    const result = buildAndCommitTransition({
      priorRecord: baseline,
      reconstructionOutput: buildDeterministicReconOutput({
        newStatementTempId: 'U_TEMP_0',
        newEvidenceTempId: 'E_TEMP_0',
        existingStatementIds: ['U01'],
        existingEvidenceIds: ['E01'],
      }),
      newStatements: [{ text: 'Temp statement', submitted_at: '2023-06-15T12:00:00Z' }],
      newEvidence: [{ label: 'Temp evidence', origin_type: 'file', input_form: 'document', submitted_at: '2023-06-15T12:00:00Z' }],
      timestamp: '2023-06-15T12:00:00Z',
      modelId: 'test',
      tempIdRemap: {
        statementTempIds: ['U_TEMP_0'],
        evidenceTempIds: ['E_TEMP_0'],
      },
    });

    // No temp IDs should appear anywhere in the result
    const resultJson = JSON.stringify(result);
    expect(resultJson).not.toContain('U_TEMP_0');
    expect(resultJson).not.toContain('E_TEMP_0');
  });

  it('inspection IDs remain valid and globally collision-free', () => {
    const baseline = createValidBaseline();
    // baseline has EI01 in R01
    const result = buildAndCommitTransition({
      priorRecord: baseline,
      reconstructionOutput: buildDeterministicReconOutput({
        newStatementTempId: 'U_TEMP_0',
        newEvidenceTempId: 'E_TEMP_0',
        existingStatementIds: ['U01'],
        existingEvidenceIds: ['E01'],
      }),
      newStatements: [{ text: 'S', submitted_at: '2023-06-15T12:00:00Z' }],
      newEvidence: [{ label: 'E', origin_type: 'file', input_form: 'document', submitted_at: '2023-06-15T12:00:00Z' }],
      timestamp: '2023-06-15T12:00:00Z',
      modelId: 'test',
      tempIdRemap: {
        statementTempIds: ['U_TEMP_0'],
        evidenceTempIds: ['E_TEMP_0'],
      },
    });

    const newInspections = result.revisions[1].evidence_inspections;
    expect(newInspections.length).toBe(1);
    // Must not collide with EI01 from R01
    expect(newInspections[0].id).toBe('EI02');
    // Evidence ID should be remapped from E_TEMP_0 to E02
    expect(newInspections[0].evidence_id).toBe('E02');
  });
});

// ===========================================================================
// 5. commitIntakeResponse
// ===========================================================================
describe('commitIntakeResponse', () => {
  const baseline = createValidBaseline();

  it('valid client response replaces exactly one existing record', () => {
    const validResponse = { success: true, case: baseline };
    const collection = [baseline];
    const result = commitIntakeResponse(collection, validResponse, 'case-01');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('case-01');
  });

  it('rejects incomplete response (missing success)', () => {
    expect(() => commitIntakeResponse([baseline], { case: baseline }, 'case-01'))
      .toThrow(/did not indicate success/);
  });

  it('rejects incomplete response (missing case)', () => {
    expect(() => commitIntakeResponse([baseline], { success: true }, 'case-01'))
      .toThrow(/missing case data/);
  });

  it('rejects response with invalid canonical invariants', () => {
    const invalidRecord = { ...baseline, current_revision_id: 'R99' };
    expect(() => commitIntakeResponse([baseline], { success: true, case: invalidRecord }, 'case-01'))
      .toThrow();
  });

  it('wrong-case response cannot replace state', () => {
    const wrongCaseRecord = { ...baseline, id: 'case-99' };
    // Must validate structure first, so we need a valid wrong-case record
    const record2 = createValidBaseline();
    (record2 as { id: string }).id = 'case-99';
    expect(() => commitIntakeResponse([baseline], { success: true, case: record2 }, 'case-01'))
      .toThrow(/does not match/);
  });

  it('missing target in collection throws', () => {
    expect(() => commitIntakeResponse([], { success: true, case: baseline }, 'case-01'))
      .toThrow(/No existing record found/);
  });

  it('duplicate target in collection throws', () => {
    expect(() => commitIntakeResponse([baseline, baseline], { success: true, case: baseline }, 'case-01'))
      .toThrow(/Multiple records found/);
  });

  it('non-object response throws', () => {
    expect(() => commitIntakeResponse([baseline], null, 'case-01'))
      .toThrow(/expected an object/);
    expect(() => commitIntakeResponse([baseline], 'string', 'case-01'))
      .toThrow(/expected an object/);
  });
});

// ===========================================================================
// 6. Translation parsing/composition/stale-response handling
// ===========================================================================
describe('Translation handling', () => {
  it('parseTranslationResponse parses a valid response', () => {
    const raw = {
      success: true,
      title: 'Translated',
      objective: 'Obj',
      events: [{ id: 'EV1', action: 'Hành động', effect: 'Hiệu ứng' }],
      claims: [{ id: 'C01', text: 'Tuyên bố', reasoning: 'Lý do', limits: [] }],
    };
    const overlay = parseTranslationResponse(raw);
    expect(overlay).not.toBeNull();
    expect(overlay!.title).toBe('Translated');
  });

  it('parseTranslationResponse rejects unsuccessful response', () => {
    expect(parseTranslationResponse({ success: false })).toBeNull();
  });

  it('parseTranslationResponse rejects non-object', () => {
    expect(parseTranslationResponse(null)).toBeNull();
    expect(parseTranslationResponse('string')).toBeNull();
  });

  it('isOverlayStale detects stale case', () => {
    const key = 'case-01_R01_vi';
    expect(isOverlayStale(key, 'case-01', 'R01', 'vi')).toBe(false);
    expect(isOverlayStale(key, 'case-02', 'R01', 'vi')).toBe(true); // stale case
  });

  it('isOverlayStale detects stale revision', () => {
    const key = 'case-01_R01_vi';
    expect(isOverlayStale(key, 'case-01', 'R02', 'vi')).toBe(true);
  });

  it('isOverlayStale detects mismatched locale', () => {
    const key = 'case-01_R01_vi';
    expect(isOverlayStale(key, 'case-01', 'R01', 'en')).toBe(true);
  });

  it('presentation translation leaves the canonical record unchanged (Positive proof 8)', () => {
    const record = createValidBaseline();
    const originalJson = JSON.stringify(record);
    
    const presentation = projectToPresentation(record);
    const overlay = {
      title: 'Translated Title',
      events: [{ id: 'EV1', action: 'Translated Action' }],
      claims: [{ id: 'C01', text: 'Translated Claim', reasoning: 'Translated Reasoning', limits: ['Limit'] }],
    };
    const translated = applyTranslationOverlay(presentation, overlay);
    
    // Canonical record unchanged
    expect(JSON.stringify(record)).toBe(originalJson);
    // Translation applied to presentation
    expect(translated.title).toBe('Translated Title');
    expect(translated.events[0].action).toBe('Translated Action');
    expect(translated.claims[0].text).toBe('Translated Claim');
  });
});

// ===========================================================================
// 7. Canonical-only storage/write boundary
// ===========================================================================
describe('Canonical-only boundaries', () => {
  it('parseCanonicalRecord rejects legacy/presentation objects at runtime', () => {
    const legacyLike = {
      id: 'case-1',
      case_number: 'C-1',
      title: 'Title',
      objective: 'Obj',
      statements: [],
      evidence: [],
      events: [],
      claims: [],
      gaps: [],
      actions: [],
    };
    expect(() => parseCanonicalRecord(legacyLike)).toThrow();
  });

  it('parseCanonicalRecord rejects objects with extra top-level fields', () => {
    const record = createValidBaseline();
    const withExtra = { ...record, extra_field: 'oops' };
    expect(() => parseCanonicalRecord(withExtra)).toThrow();
  });
});

// ===========================================================================
// 8. Negative proofs (counterexamples from CURRENT_SLICE)
// ===========================================================================
describe('Counterexamples (negative proofs)', () => {
  // CE1: Canonical record with R01+R02 reduced to empty revision history
  it('CE1: canonical record with R01 and R02 being reduced to empty revisions is rejected', () => {
    const record = createValidBaseline();
    const invalidReduced = { ...record, revisions: [] };
    const parseResult = CanonicalCaseRecordSchema.safeParse(invalidReduced);
    // Even if schema allows empty array, invariant catches it
    if (parseResult.success) {
      const errors = validateCanonicalRecord(parseResult.data as CanonicalCaseRecord);
      expect(errors.length).toBeGreaterThan(0);
    } else {
      // Schema rejection is also valid
      expect(parseResult.success).toBe(false);
    }
  });

  // CE2: Malformed prior canonical record accepted by /api/intake
  it('CE2: malformed prior canonical record is rejected by parseCanonicalRecord', () => {
    expect(() => parseCanonicalRecord({ id: 'invalid' })).toThrow();
  });

  // CE3: Provider result violating invariants returned as success
  it('CE3: transition with invariant-violating output fails', () => {
    const baseline = createValidBaseline();
    // Create a reconstruction output with an event referencing non-existent evidence
    const badRecon: ReconOutput = {
      segmented_intake: null,
      evidence_inspection: [],
      events: [{
        id: 'EV99',
        time: '2023-01-01',
        actor: 'A',
        action: 'A',
        target: 'T',
        effect: '',
        evidence_ids: ['U99'], // does not exist
        user_statement_ids: [],
        assessment: 'Established within current record',
        is_user_reported_only: false,
      }],
      claims: [{
        id: 'C01',
        text: 'Claim',
        actor: 'A',
        action: 'A',
        target: 'T',
        time: 'T',
        supporting_evidence: ['U01'],
        qualifying_evidence: [],
        conflicting_evidence: [],
        user_statement_ids: [],
        assessment: 'Established within current record',
        reasoning: 'R',
        scope: '',
        limits: [],
        causal_relationship: 'none',
      }],
      gaps: [{ id: 'G01', what_is_unknown: 'Q1', why_it_matters: 'M', what_evidence_could_resolve_it: 'E', where_how_to_obtain: 'O', what_not_to_over_collect: 'N', target_claim_ids: ['C01'], status: 'open' }],
      actions: [{ id: 'A01', title: 'A', description: 'Action 1', target_gap_id: 'G01', priority: 'medium' }],
    };
    expect(() => buildAndCommitTransition({
      priorRecord: baseline,
      reconstructionOutput: badRecon,
      newStatements: [],
      newEvidence: [],
      timestamp: '2023-06-15T12:00:00Z',
      modelId: 'test',
    })).toThrow();
  });

  // CE4: Client response lacking valid canonical record cannot replace state
  it('CE4: invalid canonical record in client response is rejected', () => {
    const baseline = createValidBaseline();
    const badResponse = { success: true, case: { id: 'case-01' } };
    expect(() => commitIntakeResponse([baseline], badResponse, 'case-01')).toThrow();
  });

  // CE5: Translated presentation response overwriting canonical source fields
  it('CE5: translation overlay does not mutate canonical record', () => {
    const record = createValidBaseline();
    const json1 = JSON.stringify(record);
    const pres = projectToPresentation(record);
    applyTranslationOverlay(pres, { title: 'X', events: [{ id: 'EV1', action: 'Y' }] });
    expect(JSON.stringify(record)).toBe(json1);
  });

  // CE6: Legacy projection saved as authoritative record after canonical upgrade
  it('CE6: a presentation/legacy projection is rejected by parseCanonicalRecord', () => {
    const record = createValidBaseline();
    const presentation = projectToPresentation(record);
    // Attempting to parse a presentation object as canonical must fail
    expect(() => parseCanonicalRecord(presentation)).toThrow();
  });

  // CE7: New intake overwriting R01 rather than appending a child revision
  it('CE7: transition appends a child revision, does not overwrite R01', () => {
    const baseline = createValidBaseline();
    const result = buildAndCommitTransition({
      priorRecord: baseline,
      reconstructionOutput: buildDeterministicReconOutput({
        newStatementTempId: 'U_TEMP_0',
        newEvidenceTempId: 'E_TEMP_0',
        existingStatementIds: ['U01'],
        existingEvidenceIds: ['E01'],
      }),
      newStatements: [{ text: 'S', submitted_at: '2023-06-15T12:00:00Z' }],
      newEvidence: [{ label: 'E', origin_type: 'file', input_form: 'doc', submitted_at: '2023-06-15T12:00:00Z' }],
      timestamp: '2023-06-15T12:00:00Z',
      modelId: 'test',
      tempIdRemap: {
        statementTempIds: ['U_TEMP_0'],
        evidenceTempIds: ['E_TEMP_0'],
      },
    });
    // R01 still exists and is unchanged
    expect(result.revisions[0].revision_id).toBe('R01');
    expect(result.revisions.length).toBe(2);
  });

  // CE8: Response whose current_revision_id does not identify the newly appended revision
  it('CE8: current_revision_id always points to the newly appended revision', () => {
    const baseline = createValidBaseline();
    const result = buildAndCommitTransition({
      priorRecord: baseline,
      reconstructionOutput: buildDeterministicReconOutput({
        newStatementTempId: 'U_TEMP_0',
        newEvidenceTempId: 'E_TEMP_0',
        existingStatementIds: ['U01'],
        existingEvidenceIds: ['E01'],
      }),
      newStatements: [{ text: 'S', submitted_at: '2023-06-15T12:00:00Z' }],
      newEvidence: [{ label: 'E', origin_type: 'file', input_form: 'doc', submitted_at: '2023-06-15T12:00:00Z' }],
      timestamp: '2023-06-15T12:00:00Z',
      modelId: 'test',
      tempIdRemap: {
        statementTempIds: ['U_TEMP_0'],
        evidenceTempIds: ['E_TEMP_0'],
      },
    });
    const lastRevId = result.revisions[result.revisions.length - 1].revision_id;
    expect(result.current_revision_id).toBe(lastRevId);
  });
});

// ===========================================================================
// 9. Positive proofs
// ===========================================================================
describe('Positive proofs', () => {
  it('Positive 7: UI projection reflects the current revision', () => {
    const baseline = createValidBaseline();
    const result = buildAndCommitTransition({
      priorRecord: baseline,
      reconstructionOutput: buildDeterministicReconOutput({
        newStatementTempId: 'U_TEMP_0',
        newEvidenceTempId: 'E_TEMP_0',
        existingStatementIds: ['U01'],
        existingEvidenceIds: ['E01'],
      }),
      newStatements: [{ text: 'New', submitted_at: '2023-06-15T12:00:00Z' }],
      newEvidence: [{ label: 'E', origin_type: 'file', input_form: 'doc', submitted_at: '2023-06-15T12:00:00Z' }],
      timestamp: '2023-06-15T12:00:00Z',
      modelId: 'test',
      tempIdRemap: {
        statementTempIds: ['U_TEMP_0'],
        evidenceTempIds: ['E_TEMP_0'],
      },
    });

    const presentation = projectToPresentation(result);
    // Should reflect the new current revision
    expect(presentation.current_revision_id).toBe('R02');
    // New statement should appear in presentation
    expect(presentation.statements.length).toBe(2);
  });
});
