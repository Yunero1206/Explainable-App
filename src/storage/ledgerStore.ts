import { parseLedgerV3 } from '../ledger/schema.js';
import type { BlobRef, CaseId, LedgerV3Case } from '../ledger/types.js';
import { parseModelRunAudit, type ModelRunAudit } from '../runtime/modelRun.js';

const DATABASE_NAME = 'ExplainableTrustV3';
const DATABASE_VERSION = 1;
const CASES_STORE = 'cases';
const RUNS_STORE = 'model_runs';
const BLOBS_STORE = 'blobs';
const METADATA_STORE = 'case_metadata';

export interface CaseUiMetadata {
  case_id: CaseId;
  display_title: string;
  display_case_number: string;
  is_archived: boolean;
}

export interface PersistedBlob {
  blob_ref: BlobRef;
  case_id: CaseId;
  data_url: string;
}

export interface WorkspaceSnapshot {
  ledgers: LedgerV3Case[];
  runs: ModelRunAudit[];
  blobs: PersistedBlob[];
  metadata: CaseUiMetadata[];
}

let databasePromise: Promise<IDBDatabase> | null = null;

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise !== null) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(CASES_STORE)) {
        database.createObjectStore(CASES_STORE, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(RUNS_STORE)) {
        const store = database.createObjectStore(RUNS_STORE, { keyPath: 'id' });
        store.createIndex('case_id', 'case_id', { unique: false });
      }
      if (!database.objectStoreNames.contains(BLOBS_STORE)) {
        const store = database.createObjectStore(BLOBS_STORE, { keyPath: 'blob_ref' });
        store.createIndex('case_id', 'case_id', { unique: false });
      }
      if (!database.objectStoreNames.contains(METADATA_STORE)) {
        database.createObjectStore(METADATA_STORE, { keyPath: 'case_id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      databasePromise = null;
      reject(request.error ?? new Error('Could not open IndexedDB.'));
    };
  });
  return databasePromise;
}

function validateMetadata(metadata: CaseUiMetadata): CaseUiMetadata {
  if (metadata.case_id.trim().length === 0) throw new Error('Case metadata requires a case ID.');
  if (metadata.display_title.trim().length === 0) throw new Error('Case title cannot be blank.');
  if (metadata.display_case_number.trim().length === 0) throw new Error('Case number cannot be blank.');
  return structuredClone(metadata);
}

export async function loadWorkspace(): Promise<WorkspaceSnapshot> {
  const database = await openDatabase();
  const transaction = database.transaction(
    [CASES_STORE, RUNS_STORE, BLOBS_STORE, METADATA_STORE],
    'readonly'
  );
  const [rawLedgers, rawRuns, blobs, metadata] = await Promise.all([
    requestResult(transaction.objectStore(CASES_STORE).getAll()),
    requestResult(transaction.objectStore(RUNS_STORE).getAll()),
    requestResult(transaction.objectStore(BLOBS_STORE).getAll()),
    requestResult(transaction.objectStore(METADATA_STORE).getAll()),
  ]);
  await transactionDone(transaction);
  return {
    ledgers: rawLedgers.map(parseLedgerV3),
    runs: rawRuns.map(parseModelRunAudit),
    blobs: blobs as PersistedBlob[],
    metadata: metadata.map((item) => validateMetadata(item as CaseUiMetadata)),
  };
}

export async function initializeCase(input: {
  ledger: LedgerV3Case;
  metadata: CaseUiMetadata;
  run?: ModelRunAudit;
}): Promise<void> {
  const ledger = parseLedgerV3(input.ledger);
  const metadata = validateMetadata(input.metadata);
  if (metadata.case_id !== ledger.id) throw new Error('Case metadata identity mismatch.');
  const run = input.run === undefined ? undefined : parseModelRunAudit(input.run);
  if (run !== undefined && (run.case_id !== ledger.id || run.status !== 'accepted')) {
    throw new Error('Seed model run does not match the accepted case.');
  }
  const database = await openDatabase();
  const stores = run === undefined
    ? [CASES_STORE, METADATA_STORE]
    : [CASES_STORE, METADATA_STORE, RUNS_STORE];
  const transaction = database.transaction(stores, 'readwrite');
  transaction.objectStore(CASES_STORE).put(ledger);
  transaction.objectStore(METADATA_STORE).put(metadata);
  if (run !== undefined) transaction.objectStore(RUNS_STORE).put(run);
  await transactionDone(transaction);
}

export async function commitAcceptedIntake(input: {
  ledger: LedgerV3Case;
  run: ModelRunAudit;
  blobs: PersistedBlob[];
}): Promise<void> {
  const ledger = parseLedgerV3(input.ledger);
  const run = parseModelRunAudit(input.run);
  if (run.status !== 'accepted' || run.case_id !== ledger.id || run.committed_revision_id !== ledger.current_revision_id) {
    throw new Error('Accepted commit ledger/run identity mismatch.');
  }
  for (const blob of input.blobs) {
    if (blob.case_id !== ledger.id || blob.data_url.length === 0) {
      throw new Error('Accepted commit blob identity mismatch.');
    }
    const evidenceOwnsBlob = ledger.evidence.some((item) => item.content.blob?.blob_ref === blob.blob_ref);
    if (!evidenceOwnsBlob) throw new Error('Accepted commit includes an unreferenced blob.');
  }

  const database = await openDatabase();
  const transaction = database.transaction([CASES_STORE, RUNS_STORE, BLOBS_STORE], 'readwrite');
  transaction.objectStore(CASES_STORE).put(ledger);
  transaction.objectStore(RUNS_STORE).put(run);
  const blobStore = transaction.objectStore(BLOBS_STORE);
  for (const blob of input.blobs) blobStore.put(structuredClone(blob));
  await transactionDone(transaction);
}

export async function recordRejectedRun(rawRun: ModelRunAudit): Promise<void> {
  const run = parseModelRunAudit(rawRun);
  if (run.status === 'accepted') throw new Error('Accepted runs must use the atomic ledger commit.');
  const database = await openDatabase();
  const transaction = database.transaction(RUNS_STORE, 'readwrite');
  transaction.objectStore(RUNS_STORE).put(run);
  await transactionDone(transaction);
}

export async function saveCaseMetadata(rawMetadata: CaseUiMetadata): Promise<void> {
  const metadata = validateMetadata(rawMetadata);
  const database = await openDatabase();
  const transaction = database.transaction(METADATA_STORE, 'readwrite');
  transaction.objectStore(METADATA_STORE).put(metadata);
  await transactionDone(transaction);
}

function deleteIndexEntries(store: IDBObjectStore, caseId: CaseId): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.index('case_id').openKeyCursor(IDBKeyRange.only(caseId));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor === null) {
        resolve();
        return;
      }
      store.delete(cursor.primaryKey);
      cursor.continue();
    };
    request.onerror = () => reject(request.error ?? new Error('Could not enumerate case records.'));
  });
}

export async function deleteLedgerCase(caseId: CaseId): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(
    [CASES_STORE, RUNS_STORE, BLOBS_STORE, METADATA_STORE],
    'readwrite'
  );
  transaction.objectStore(CASES_STORE).delete(caseId);
  transaction.objectStore(METADATA_STORE).delete(caseId);
  await Promise.all([
    deleteIndexEntries(transaction.objectStore(RUNS_STORE), caseId),
    deleteIndexEntries(transaction.objectStore(BLOBS_STORE), caseId),
  ]);
  await transactionDone(transaction);
}

export async function closeLedgerStore(): Promise<void> {
  if (databasePromise === null) return;
  const database = await databasePromise;
  database.close();
  databasePromise = null;
}
