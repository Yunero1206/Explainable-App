# AR-S6 — Atomic IndexedDB V3 persistence

## Outcome

Persist accepted ledgers, model-run audit envelopes, translation overlays and blobs in one versioned local database. The UI may advance only after the durable acceptance transaction succeeds.

## Allowed changes

- `src/storage/db.ts` — add
- `src/storage/repository.ts` — add
- `src/domain/acceptIntakeResponse.ts` — add
- `src/domain/cleanup.ts` — exact-key V3 cleanup only
- `src/App.tsx` — load/save/delete orchestration only
- `tests/persistence.test.ts` — add/replace
- `tests/cleanup.test.ts` — rewrite as an owned V3 suite
- `project-context/ACTIVE_WORK.md` — checkpoint only
- `project-context/CURRENT_STATE.md` — verified facts only

## Database contract

- Use a new database name/version for V3 so the rejected V2 database remains untouched and recoverable.
- Stores cover cases/ledgers, model runs, translation overlays and blobs.
- Canonical JSON stores blob references and metadata, never binary/base64 content.
- Keys are explicit and compound where needed; no prefix/substring deletion.
- Save accepted ledger and its model run in one transaction before React state is replaced.
- If the transaction aborts, accepted React state remains at the parent and a staged persistence error is shown.
- Rejected model runs are stored for audit without altering the accepted ledger.
- Reload validates stored V3 records before exposing them to UI.
- Cleanup deletes exactly one case and its related runs/translations/blobs, then derives pure in-memory cleanup state.

## Positive tests

- Create, accept, close/reopen and recover the exact V3 head and derived chat.
- Accepted ledger and run commit atomically.
- Rejected run persists while parent ledger remains unchanged.
- Blob round-trip uses a blob store and canonical record contains only its reference.
- Deleting one case removes only its exact related records.

## Counterexamples

- UI state update followed by fire-and-forget `.catch(...)` persistence.
- Partial ledger saved without its accepted run, or vice versa.
- Prefix collision deleting another case.
- Invalid/corrupt stored record exposed to UI.
- Parallel in-memory attachment map as authority.
- External database, auth or cross-device sync.

## Gates

```bash
npm test -- tests/persistence.test.ts tests/cleanup.test.ts tests/clientAcceptance.test.ts
npm run typecheck
npm run build
git diff --check
```

Use the repository's established fake IndexedDB test setup. Do not treat jsdom localStorage as proof of IndexedDB behavior.
