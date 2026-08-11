import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createIntakeService } from '../server/intakeService.js';
import { createEmptyLedgerCase } from '../src/ledger/factory.js';
import {
  BlobRefSchema,
  parseCaseId,
  parseCaseNumber,
  parseCaseTitle,
  parseStructuralInstant,
} from '../src/ledger/schema.js';
import {
  closeLedgerStore,
  commitAcceptedIntake,
  deleteLedgerCase,
  initializeCase,
  loadWorkspace,
  recordRejectedRun,
} from '../src/storage/ledgerStore.js';

function emptyLedger() {
  return createEmptyLedgerCase({
    id: parseCaseId('CASE_persistence-test'),
    case_number: parseCaseNumber('CASE-900'),
    title: parseCaseTitle('Persistence test'),
    created_at: parseStructuralInstant('2026-08-11T00:00:00.000Z'),
  });
}

function clock() {
  let tick = Date.parse('2026-08-11T02:00:00.000Z');
  return () => new Date(tick++);
}

async function deleteDatabase() {
  await closeLedgerStore();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('ExplainableTrustV3');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

beforeEach(deleteDatabase);
afterEach(deleteDatabase);

describe('Ledger V3 atomic persistence', () => {
  it('stores a new case and accepted ledger/run/blob in one transaction', async () => {
    const parent = emptyLedger();
    await initializeCase({
      ledger: parent,
      metadata: {
        case_id: parent.id,
        display_title: 'Persistence test',
        display_case_number: 'CASE-900',
        is_archived: false,
      },
    });
    const bytes = Buffer.from('document bytes');
    const dataUrl = `data:text/plain;base64,${bytes.toString('base64')}`;
    const response = await createIntakeService({ now: clock() })({
      prior_ledger: parent,
      client_request_id: 'atomic-accept',
      message: 'A source was submitted for review.',
      attachments: [{ name: 'record.txt', type: 'text/plain', size: bytes.byteLength, dataUrl }],
      inference_mode: 'replay',
    });
    expect(response.success).toBe(true);
    if (!response.success) return;
    const blobRef = response.ledger.evidence[0]?.content.blob?.blob_ref;
    expect(blobRef).toBeDefined();
    await commitAcceptedIntake({
      ledger: response.ledger,
      run: response.run,
      blobs: [{ blob_ref: BlobRefSchema.parse(blobRef), case_id: parent.id, data_url: dataUrl }],
    });

    const snapshot = await loadWorkspace();
    expect(snapshot.ledgers[0]?.current_revision_id).toBe('R01');
    expect(snapshot.runs).toHaveLength(1);
    expect(snapshot.blobs[0]?.data_url).toBe(dataUrl);
    expect(snapshot.metadata[0]?.display_title).toBe('Persistence test');
  });

  it('persists rejected audits without replacing the accepted ledger', async () => {
    const parent = emptyLedger();
    await initializeCase({
      ledger: parent,
      metadata: {
        case_id: parent.id,
        display_title: 'Persistence test',
        display_case_number: 'CASE-900',
        is_archived: false,
      },
    });
    const response = await createIntakeService({ now: clock() })({
      prior_ledger: parent,
      client_request_id: 'atomic-reject',
      message: '[reject]',
      inference_mode: 'replay',
    });
    expect(response.success).toBe(false);
    if (response.success) return;
    await recordRejectedRun(response.run);

    const snapshot = await loadWorkspace();
    expect(snapshot.ledgers[0]?.current_revision_id).toBeNull();
    expect(snapshot.runs[0]?.status).toBe('rejected');
  });

  it('deletes only one exact case and its dependent local records', async () => {
    const parent = emptyLedger();
    await initializeCase({
      ledger: parent,
      metadata: {
        case_id: parent.id,
        display_title: 'Persistence test',
        display_case_number: 'CASE-900',
        is_archived: false,
      },
    });
    await deleteLedgerCase(parent.id);
    expect(await loadWorkspace()).toEqual({ ledgers: [], runs: [], blobs: [], metadata: [] });
  });
});
