import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app.js';
import { createIntakeService } from '../server/intakeService.js';
import { createEmptyLedgerCase } from '../src/ledger/factory.js';
import {
  parseCaseId,
  parseCaseNumber,
  parseCaseTitle,
  parseLedgerV3,
  parseStructuralInstant,
} from '../src/ledger/schema.js';
import { parseIntakeResponse } from '../src/runtime/modelRun.js';

function emptyLedger() {
  return createEmptyLedgerCase({
    id: parseCaseId('CASE_server-test'),
    case_number: parseCaseNumber('CASE-001'),
    title: parseCaseTitle('Server boundary test'),
    created_at: parseStructuralInstant('2026-08-11T00:00:00.000Z'),
  });
}

function clock() {
  let tick = Date.parse('2026-08-11T01:00:00.000Z');
  return () => new Date(tick++);
}

describe('Ledger V3 intake boundary', () => {
  it('accepts a replay proposal and returns a fully validated ledger plus audit', async () => {
    const runIntake = createIntakeService({ now: clock() });
    const result = parseIntakeResponse(await runIntake({
      prior_ledger: emptyLedger(),
      client_request_id: 'request-accepted-1',
      message: 'My delivery arrived damaged.',
      locale: 'en',
      inference_mode: 'replay',
    }));

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(parseLedgerV3(result.ledger).current_revision_id).toBe('R01');
    expect(result.ledger.statements[0]?.text).toBe('My delivery arrived damaged.');
    expect(result.ledger.revisions[0]?.claims[0]?.assessment).toBe('Reported');
    expect(result.run).toMatchObject({
      status: 'accepted',
      provider: 'deterministic-replay',
      model_id: 'gemini-3.5-flash',
      committed_revision_id: 'R01',
    });
  });

  it('keeps the accepted parent unchanged when proposal validation rejects', async () => {
    const parent = emptyLedger();
    const before = JSON.stringify(parent);
    const runIntake = createIntakeService({ now: clock() });
    const result = parseIntakeResponse(await runIntake({
      prior_ledger: parent,
      client_request_id: 'request-rejected-1',
      message: '[reject] exercise the rejection boundary',
      inference_mode: 'replay',
    }));

    expect(result.success).toBe(false);
    expect(JSON.stringify(parent)).toBe(before);
    if (result.success === true) return;
    expect(result.run.status).toBe('rejected');
    expect(result.run.committed_revision_id).toBeNull();
    expect(result.error.code).toBe('PROPOSAL_REJECTED');
    expect('ledger' in result).toBe(false);
  });

  it('accepts an attachment only after hashing and inspecting it', async () => {
    const runIntake = createIntakeService({ now: clock() });
    const bytes = Buffer.from('receipt body', 'utf8');
    const result = await runIntake({
      prior_ledger: emptyLedger(),
      client_request_id: 'request-file-1',
      attachments: [{
        name: 'receipt.txt',
        type: 'text/plain',
        size: bytes.byteLength,
        dataUrl: `data:text/plain;base64,${bytes.toString('base64')}`,
      }],
      inference_mode: 'replay',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.ledger.evidence[0]?.content.blob?.sha256).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(result.ledger.revisions[0]?.inspections).toHaveLength(1);
    expect(result.ledger.relationships[0]?.relationship_type).toBe('not_yet_classified');
  });

  it('maps an invalid request to HTTP 400 and a rejected proposal to HTTP 422', async () => {
    const app = createApp({ runIntake: createIntakeService({ now: clock() }) });
    const invalid = await request(app).post('/api/intake').send({ prior_ledger: emptyLedger() });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('INVALID_REQUEST');

    const rejected = await request(app).post('/api/intake').send({
      prior_ledger: emptyLedger(),
      client_request_id: 'request-http-reject',
      message: '[reject]',
      inference_mode: 'replay',
    });
    expect(rejected.status).toBe(422);
    expect(rejected.body.success).toBe(false);
    expect(rejected.body.run.status).toBe('rejected');
  });
});
