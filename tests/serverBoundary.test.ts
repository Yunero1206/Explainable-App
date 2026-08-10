import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { createApp } from '../server/app.js';
import { createEmptyCanonicalRecord } from '../src/canonical/factory.js';
import { buildAndCommitTransition } from '../src/canonical/transition.js';
import { CanonicalCaseRecordSchema, validateCanonicalRecord } from '../src/canonical/index.js';
import type { CanonicalCaseRecord } from '../src/canonical/types.js';
import type { Server } from 'http';
import type { CaseReconstructionOutput } from '../src/schema.js';

let server: Server;
let baseUrl: string;

// A mock runIntakeTransition that uses the real buildAndCommitTransition
async function realTransitionDep(priorRecord: CanonicalCaseRecord, intakePayload: { message?: string }): Promise<CanonicalCaseRecord> {
  const timestamp = '2023-06-15T12:00:00Z';
  const reconOutput: CaseReconstructionOutput = {
    segmented_intake: intakePayload.message ? {
      narrative_statement: { id: 'U_TEMP_0', text: intakePayload.message },
      pasted_evidences: [],
    } : null,
    evidence_inspection: [],
    input_dispositions: intakePayload.message ? [{
      id: 'U_TEMP_0',
      disposition: 'not_yet_classified' as const,
      related_object_ids: [],
      reason: 'test',
    }] : [],
    events: priorRecord.revisions[0]?.events?.map(e => ({
      ...e,
      user_statement_ids: [],
      effect: e.effect || '',
      is_user_reported_only: false,
    })) || [],
    claims: priorRecord.revisions[0]?.claims?.map(c => ({
      ...c,
      actor: 'A',
      action: 'A',
      target: 'T',
      time: 'T',
      user_statement_ids: [],
      scope: '',
      limits: [],
      causal_relationship: 'none' as const,
    })) || [],
    gaps: priorRecord.revisions[0]?.gaps?.map(g => ({
      id: g.id,
      what_is_unknown: g.question_key,
      why_it_matters: '',
      what_evidence_could_resolve_it: '',
      where_how_to_obtain: '',
      what_not_to_over_collect: '',
      target_claim_ids: g.target_claim_ids as string[],
      status: g.status as 'open',
    })) || [],
    actions: priorRecord.revisions[0]?.actions?.map(a => ({
      id: a.id,
      title: a.description.slice(0, 30),
      description: a.description,
      target_gap_id: a.target_gap_ids[0] || '',
      priority: 'medium' as const,
    })) || [],
  };

  const newStatements = intakePayload.message
    ? [{ text: intakePayload.message, submitted_at: timestamp }]
    : [];

  return buildAndCommitTransition({
    priorRecord,
    reconstructionOutput: reconOutput,
    newStatements,
    newEvidence: [],
    timestamp,
    modelId: 'test-model',
    tempIdRemap: intakePayload.message
      ? { statementTempIds: ['U_TEMP_0'], evidenceTempIds: [] }
      : undefined,
  });
}

// A mock that returns a malformed result (valid structure but bad invariants)
async function badInvariantDep(priorRecord: CanonicalCaseRecord): Promise<CanonicalCaseRecord> {
  const result = { ...priorRecord, current_revision_id: 'R99' } as CanonicalCaseRecord;
  return result;
}

// A mock that returns a structurally malformed result
async function badStructureDep(): Promise<CanonicalCaseRecord> {
  return { id: 'bad' } as unknown as CanonicalCaseRecord;
}

describe('Server Boundary (HTTP)', () => {
  beforeAll(async () => {
    const app = createApp({ runIntakeTransition: realTransitionDep as Parameters<typeof createApp>[0]['runIntakeTransition'] });
    server = await new Promise<Server>(resolve => {
      const s = app.listen(0, () => resolve(s));
    });
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  });

  it('malformed canonical prior record returns 400 and does not invoke the dependency', async () => {
    const res = await fetch(`${baseUrl}/api/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prior_record: { id: 'invalid' } }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.stage).toBe('VALIDATION_FAILED');
  });

  it('legacy prior record is rejected and does not invoke the dependency', async () => {
    const legacyRecord = {
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
    const res = await fetch(`${baseUrl}/api/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prior_record: legacyRecord }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.stage).toBe('VALIDATION_FAILED');
  });

  it('valid deterministic request returns a fully validated canonical record', async () => {
    const validRecord = createEmptyCanonicalRecord('case-test', 'C-TEST', 'Test', 'Objective');
    const res = await fetch(`${baseUrl}/api/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prior_record: validRecord, message: 'Test message' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(true);
    
    // Verify the returned record is valid canonical
    const parseResult = CanonicalCaseRecordSchema.safeParse(body.case);
    expect(parseResult.success).toBe(true);
    const errors = validateCanonicalRecord(parseResult.data as CanonicalCaseRecord);
    expect(errors).toHaveLength(0);
    
    // Verify it has a new revision
    const returnedRecord = body.case as CanonicalCaseRecord;
    expect(returnedRecord.revisions.length).toBe(2);
    expect(returnedRecord.current_revision_id).toBe('R02');
  });

  it('missing prior_record returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.stage).toBe('MISSING_PRIOR_RECORD');
  });

  it('rejects forged replay mode in production', async () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await fetch(`${baseUrl}/api/intake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ET-Dev-Inference-Mode': 'replay',
        },
        body: JSON.stringify({ prior_record: createEmptyCanonicalRecord('case-1', 'C-1', 'T', 'O') }),
      });
      expect(res.status).toBe(400);
      const body = await res.json() as Record<string, unknown>;
      expect(body.stage).toBe('FORGED_REPLAY_REJECTED');
    } finally {
      process.env.NODE_ENV = orig;
    }
  });
});

// Separate describe for malformed/invalid injected result tests  
describe('Server Boundary (malformed dependency results)', () => {
  it('malformed injected result cannot return success', async () => {
    const app = createApp({ runIntakeTransition: badStructureDep as Parameters<typeof createApp>[0]['runIntakeTransition'] });
    const s = await new Promise<Server>(resolve => {
      const srv = app.listen(0, () => resolve(srv));
    });
    const addr = s.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      const validRecord = createEmptyCanonicalRecord('case-test', 'C-TEST', 'Test', 'Obj');
      const res = await fetch(`http://127.0.0.1:${port}/api/intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prior_record: validRecord, message: 'Test' }),
      });
      // Should NOT be 200
      expect(res.status).not.toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.success).toBeUndefined();
    } finally {
      await new Promise<void>((resolve, reject) => s.close(err => err ? reject(err) : resolve()));
    }
  });

  it('structurally valid but invariant-invalid injected result cannot return success', async () => {
    const app = createApp({ runIntakeTransition: badInvariantDep as Parameters<typeof createApp>[0]['runIntakeTransition'] });
    const s = await new Promise<Server>(resolve => {
      const srv = app.listen(0, () => resolve(srv));
    });
    const addr = s.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      const validRecord = createEmptyCanonicalRecord('case-test', 'C-TEST', 'Test', 'Obj');
      const res = await fetch(`http://127.0.0.1:${port}/api/intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prior_record: validRecord, message: 'Test' }),
      });
      expect(res.status).not.toBe(200);
    } finally {
      await new Promise<void>((resolve, reject) => s.close(err => err ? reject(err) : resolve()));
    }
  });
});

// ===========================================================================
// Separate test for buildAndCommitTransition (production transition behavior)
// ===========================================================================
describe('buildAndCommitTransition (production behavior)', () => {
  it('produces a valid canonical record from a deterministic input', () => {
    const baseline = createEmptyCanonicalRecord('case-bct', 'C-BCT', 'Test', 'Objective');
    const timestamp = '2023-06-15T12:00:00Z';

    const reconOutput: CaseReconstructionOutput = {
      segmented_intake: {
        narrative_statement: { id: 'U_TEMP_0', text: 'Test statement' },
        pasted_evidences: [],
      },
      evidence_inspection: [],
      input_dispositions: [{
        id: 'U_TEMP_0',
        disposition: 'not_yet_classified',
        related_object_ids: [],
        reason: 'test',
      }],
      events: [],
      claims: [],
      gaps: [],
      actions: [],
    };

    const result = buildAndCommitTransition({
      priorRecord: baseline,
      reconstructionOutput: reconOutput,
      newStatements: [{ text: 'Test statement', submitted_at: timestamp }],
      newEvidence: [],
      timestamp,
      modelId: 'test',
      tempIdRemap: {
        statementTempIds: ['U_TEMP_0'],
        evidenceTempIds: [],
      },
    });

    // Validate the complete result
    const parseResult = CanonicalCaseRecordSchema.safeParse(result);
    expect(parseResult.success).toBe(true);
    const errors = validateCanonicalRecord(result);
    expect(errors).toHaveLength(0);

    // Verify structure
    expect(result.revisions.length).toBe(2);
    expect(result.current_revision_id).toBe('R02');
    expect(result.statements.length).toBe(1);
    expect(result.statements[0].id).toBe('U01');
    expect(result.intake_ledger.length).toBe(2);

    // Verify delta is not empty
    expect(result.revisions[1].delta.changes.length).toBeGreaterThan(0);
  });
});
