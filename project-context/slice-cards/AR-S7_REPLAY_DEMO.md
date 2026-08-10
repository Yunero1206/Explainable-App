# AR-S7 — QuickBite replay and proof loop

## Outcome

Convert QuickBite into proposal-schema replay fixtures and prove the real V3 path from intake through durable reload, without special-case reconstruction logic.

## Allowed changes

- `tests/fixtures/quickbite.proposals.json` — add
- `tests/demoReplay.test.ts` — add
- `src/data/sampleCases.ts` — V3 QuickBite seed only
- `src/components/TestModeBanner.tsx` — wording/model metadata only if this file exists at HEAD
- `server/inference/replayProvider.ts` — fixture lookup/error handling only
- `project-context/ACTIVE_WORK.md` — checkpoint only
- `project-context/CURRENT_STATE.md` — verified facts only

If the actual banner path differs, record the real path and obtain approval before substituting it.

## Replay fixture requirements

- Fixture identifies schema version, replay scenario, request step and exact proposal response.
- New entities use local refs; no provider-authored canonical IDs or full snapshots.
- Steps cover initial QuickBite evidence, a contradiction/clarification, a gap/action transition and a no-change or rejected case.
- Expected model metadata is exactly `gemini-3.5-flash` plus the pinned prompt version, even though replay makes no network call.
- Fixture is data only; production code contains no QuickBite-specific branch.

## Proof loop

The integration test must exercise the same intake service, proposal parser, deterministic applier, client acceptance transaction, IndexedDB repository and presentation/chat projection used by the app.

## Positive tests

- Full replay produces deterministic IDs, revision chain, deltas and UI projection.
- Close/reopen returns the same accepted head and chat.
- Repeating projection or reload creates no duplicate revisions/messages.
- Test mode is visibly distinguishable and exposes pinned model metadata without pretending a live call occurred.

## Counterexamples

- Directly replacing the ledger from a fixture.
- Bypassing server service, applier or persistence.
- Snapshot fixture or dynamic current-time/random ID dependence.
- Replay fixture containing an API key.
- Failed/rejected step mutating the accepted parent.

## Gates

```bash
npm test -- tests/demoReplay.test.ts
npm run typecheck
npm run build
git diff --check
```

## Non-goals

No live API smoke test, production upload, UI redesign or broad old-code deletion.
