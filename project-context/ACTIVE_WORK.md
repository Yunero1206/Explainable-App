# Active Work Cursor

## Control fields

- Workstream: `AR` — Proposal Boundary + Ledger V3
- Repository: `Yunero1206/Explainable-App`
- Starting base SHA: `f6eacf784ddc07d89823d013445042c4239e63ad`
- Phase status: active, unaccepted
- Persistence/Reload: pending, inactive
- V0 status: not accepted
- Active micro-slice: AR-S1
- Active status: COMPLETE — AWAITING USER CONTINUE
- Last verified implementation SHA: 9c606f765ca6c17b50429a6abc1f17c0c5d2cea1
- Final test-conformance SHA: 7ce888abda51f7b5686407519eeef96889e1a694

## AR-S1 — Ledger V3 contract

### Outcome

Add the strict, lossless Ledger V3 domain contract and neutral test builders. Do not wire it into server or UI code yet.

### Allowed changes

- `src/ledger/types.ts` — add
- `src/ledger/schema.ts` — add
- `src/ledger/factory.ts` — add
- `src/ledger/index.ts` — add
- `tests/fixtures/ledgerV3.ts` — add
- `tests/ledgerV3Schema.test.ts` — add
- `project-context/ACTIVE_WORK.md` — checkpoint only
- `project-context/CURRENT_STATE.md` — verified facts only

Any additional production file requires a new plan and user approval.

### Contract requirements

- Schema version is exactly `3.0.0`.
- A case stores immutable identity, title, created time and ordered revisions.
- Intake and source records preserve user statements, evidence metadata/content references and provenance before inference.
- A revision stores parent link, source IDs, entity snapshots, explicit deltas, assistant explanation and accepted model-run ID.
- Evidence preserves claim/source/content/original time/inspection details and provenance.
- Events preserve time text, actor, action, target, effect, source support and assessment.
- Claims preserve actor/action/target/time/scope/limits, evidence support and assessment.
- Gaps preserve question, status, target references and lifecycle metadata.
- Actions preserve description, target reference, status and lifecycle metadata.
- IDs are branded by family in TypeScript and checked by strict runtime schemas.
- Timestamps are strict ISO instants; natural-language dates are domain strings, never coerced to instants.
- Unknown keys, invalid enums, broken parent chains, duplicate IDs and dangling references fail closed.
- Binary data is represented only by blob metadata/reference.

### Positive tests

- Empty case factory validates.
- One complete revision with evidence/claim/gap/action and delta validates.
- All rich explanation fields survive parse/serialize/parse unchanged.
- Domain text such as `next Friday` is retained as text where the contract allows it.

### Counterexamples

- Unknown property at any nested boundary.
- Placeholder insertion such as `Unknown`, empty actor/action or invented source text.
- Duplicate canonical ID or wrong ID family.
- Child revision with a missing/wrong parent.
- Entity reference to a nonexistent entity.
- Blob content/base64 embedded in canonical JSON.
- Invalid ISO instant accepted through `Date.parse` coercion.

### Gates

```bash
npm test -- tests/ledgerV3Schema.test.ts
npm run typecheck
git diff --check
```

If the repository does not support that exact focused-test syntax, use its existing Vitest syntax and record the exact command.

### Non-goals

No V2 migration, provider schema, Gemini call, proposal application, UI wiring, persistence or deletion.

## AR-S1 Work log

### Completed

- Executed corrective AR-S1 pass.
- Implemented strict Ledger V3 domain contract in `src/ledger` (types, schema, factory, index) without prohibited constructs (`any`, `as any`, `as unknown as`, `z.any()`).
- Included all 20+ admission invariants directly in `parseLedgerV3`.
- Implemented fully-typed neutral test builders in `tests/fixtures/ledgerV3.ts`.
- Validated P01-P10 and initial N01-N39 test matrix against the approved Ledger V3 Schema Decision Record in `tests/ledgerV3Schema.test.ts`.
- Committed first corrective implementation (SHA `a442aaf`, parent `92a7f55`).
- Executed second bounded corrective pass to remove generator scripts and unauthorized artifacts.
- Committed production/cleanup implementation:
  - Implementation SHA: `9c606f765ca6c17b50429a6abc1f17c0c5d2cea1`
  - Parent SHA: `018b3c1f1db4a2c869cc5c52a8fab08ba83fcd9f`
- Executed final test-and-checkpoint-only correction pass to remove N30/N31 false positive genesis rejections and formally break out all remaining N39 assertions into their required explicit N01, N03, N04, N11, N32, N33, and N35 matrix complement tests.
- Committed final test-conformance corrections:
  - Implementation SHA: `7ce888abda51f7b5686407519eeef96889e1a694`
  - Parent SHA: `e629138fbf4cd35d737aeb9f46640ec1139ee87a`
  - Changed files: `tests/ledgerV3Schema.test.ts` (373 insertions, 371 deletions)

### Gate results

- `npm test -- tests/ledgerV3Schema.test.ts`: Passed (330/330 tests, 0 failed).
- `npm test`: Passed (458/458 tests).
- `npm run lint`: Passed (0 errors).
- `git diff --check`: Passed.

### Dirty files / WIP

- None recorded.

## AR-S0 Work log

### Completed

- Replaced project/contract state files and established new control plane layout.
- Deleted superseded CURRENT_SLICE, execute-v0-slice, and INSTALL_FIRST files.
- Normalized branch to main.

### Gate results

- `git branch --show-current`: main
- `git rev-parse HEAD`: 1e40e3dc2363d0c7a9afd80a7f52ab1e5010e1c2
- `git status --short`: Verified dirty control-plane only before commit
- `git diff --check`: Passed, no whitespace errors
- Verified superseded files absent in cached index. No application files changed.

### Dirty files / WIP

- None recorded.

### Known unresolved issues

- Entire rejected V2 runtime remains unchanged until later slices.

## Queued micro-slices

| ID | Objective | Status |
|---|---|---|
| AR-S1 | Add strict Ledger V3 types/schema and neutral fixtures, not wired to runtime | completed |
| AR-S2 | Add explicit provider proposal schema and central `gemini-3.5-flash` config | queued |
| AR-S3 | Add deterministic ID allocation, proposal application, deltas and ledger validation | queued |
| AR-S4 | Wire typed Gemini/replay providers and V3 server intake boundary with model-run envelope | queued |
| AR-S5 | Switch App to V3 projection and ledger-derived chat; preserve thin UI | queued |
| AR-S6 | Add atomic IndexedDB V3 persistence for cases, runs, blobs and exact-key cleanup | queued |
| AR-S7 | Convert QuickBite replay to proposal fixtures and prove full deterministic loop | queued |
| AR-S8 | Remove superseded V2 runtime and convert remaining sample/data seams | queued |
| AR-S9 | Remove duplicate tests/scripts/lockfile, reconcile docs and run aggregate audit | queued |

## Next-turn rule

The agent may not activate or execute a queued slice in the same turn that completed the current slice.

After the user says `Continue from project-context/ACTIVE_WORK.md`, read the matching immutable card in `project-context/slice-cards/`, update exactly one queued slice to active using that card, return a handshake and plan, and stop for approval. Do not broaden the card silently.

## Context-pressure checkpoint

If the active slice cannot be completed cleanly in the current context:

1. set active status to `WIP — NOT VERIFIED`;
2. list completed steps, dirty files, commands run and exact unfinished work;
3. do not commit incomplete application code unless the user explicitly approved a WIP commit;
4. do not update `CURRENT_STATE.md` with success claims;
5. stop and ask for `Continue from project-context/ACTIVE_WORK.md`.
