import { describe, expect, it } from 'vitest';
import { createIntakeService } from '../server/intakeService.js';
import { createEmptyLedgerCase } from '../src/ledger/factory.js';
import {
  parseCaseId,
  parseCaseNumber,
  parseCaseTitle,
  parseLedgerV3,
  parseStructuralInstant,
} from '../src/ledger/schema.js';

function emptyLedger() {
  return createEmptyLedgerCase({
    id: parseCaseId('CASE_replay-demo'),
    case_number: parseCaseNumber('DEMO-REPLAY'),
    title: parseCaseTitle('Replay flow'),
    created_at: parseStructuralInstant('2026-08-11T00:00:00.000Z'),
  });
}

function clock() {
  let tick = Date.parse('2026-08-11T03:00:00.000Z');
  return () => new Date(tick++);
}

describe('credential-free replay product flow', () => {
  it('creates, transitions, rejects safely, and remains a valid linear ledger', async () => {
    const runIntake = createIntakeService({ now: clock() });
    const first = await runIntake({
      prior_ledger: emptyLedger(),
      client_request_id: 'demo-turn-1',
      message: 'My order arrived damaged.',
      inference_mode: 'replay',
    });
    expect(first.success).toBe(true);
    if (!first.success) return;
    expect(first.ledger.revisions[0]?.gaps[0]?.status).toBe('open');
    expect(first.ledger.revisions[0]?.actions[0]?.status).toBe('pending');

    const acceptedParent = structuredClone(first.ledger);
    const second = await runIntake({
      prior_ledger: first.ledger,
      client_request_id: 'demo-turn-2',
      message: 'The merchant confirmed the replacement was received today.',
      inference_mode: 'replay',
    });
    expect(second.success).toBe(true);
    if (!second.success) return;
    expect(parseLedgerV3(second.ledger).current_revision_id).toBe('R02');
    expect(second.ledger.revisions[1]?.parent_id).toBe('R01');
    expect(second.ledger.revisions[1]?.gaps.find((gap) => gap.id === 'G01')?.status).toBe('resolved');
    expect(second.ledger.revisions[1]?.actions.find((action) => action.id === 'A01')?.status).toBe('completed');
    expect(first.ledger).toEqual(acceptedParent);

    const beforeRejectedAttempt = JSON.stringify(second.ledger);
    const rejected = await runIntake({
      prior_ledger: second.ledger,
      client_request_id: 'demo-turn-3-rejected',
      message: '[reject]',
      inference_mode: 'replay',
    });
    expect(rejected.success).toBe(false);
    expect(JSON.stringify(second.ledger)).toBe(beforeRejectedAttempt);
    if (rejected.success === false) {
      expect(rejected.run.status).toBe('rejected');
      expect(rejected.run.committed_revision_id).toBeNull();
    }
  });
});
