# Active Slice — Canonical Runtime Source of Truth

Baseline application/context commit: `64dcdd8d08d022f1004d1fc9d57cb80ae3718bce`

Phase: **Phase 1A-R runtime integration**.

## Objective

Make `CanonicalCaseRecord` the authoritative runtime state across client and server.

The UI may use read-only projections for rendering, but legacy `CaseData`, translated presentation data, chat snapshots or component state must not become a parallel epistemic source of truth.

This slice does not claim persistence/reload, deterministic demo or V0 completion.

## Confirmed baseline problems

The baseline currently contains these runtime contradictions:

1. `src/App.tsx` holds `useState<CaseData[]>` as the active case store.
2. `hydrateCurrentProjection()` accepts a canonical record but returns legacy `CaseData`.
3. That projection sets `revisions: []`, discarding canonical revision history.
4. `saveCase()` persists `CaseData`, so a projected object can overwrite the canonical record.
5. `/api/intake` receives separate legacy arrays such as `existing_statements`, `existing_evidence` and `existing_revisions`.
6. `reconcileNextRevision()` creates the legacy revision type rather than a canonical revision.
7. The server returns a legacy `fullCase`, and the client accepts it without validating the full canonical schema and invariants.
8. Translation currently writes translated presentation fields back into case state, even though translation must be representational only.

Agent reports are not proof. Reproduce and verify these facts against the actual baseline before proposing changes.

## Required behavior

### 1. Canonical client state

* The authoritative in-memory case collection must contain complete `CanonicalCaseRecord` objects.
* `current_revision_id`, intake ledger, statements, evidence, relationships and every revision must remain available.
* UI-facing `CaseData` or another view model may exist only as a derived, read-only projection.
* A projection or chat snapshot must never be submitted as the authoritative prior record or persisted over it.
* Remove the lossy `revisions: []` behavior from the authoritative path.

### 2. Canonical server transition

For every successful intake:

1. Receive or construct one complete prior canonical record.
2. Validate the prior record at the trust boundary.
3. Convert the new intake/provider result into one canonical intake/revision transition.
4. Validate the complete resulting record with:

   * `CanonicalCaseRecordSchema`;
   * `validateCanonicalRecord`.
5. Reject the request if schema or canonical invariants fail.
6. Return the complete validated canonical record.
7. The client atomically replaces the prior authoritative record only with that validated result.

The reconstruction-provider schema may remain an inference boundary, but its output must not itself become persisted case state.

### 3. Projection-only rendering

* `projectCurrentRecord()` or an equivalent canonical projector must select the UI’s current state.
* UI components may receive a presentation adapter, but edits to that adapter must not rewrite canonical history.
* Translation must remain a locale-specific presentation overlay and must not alter canonical events, claims, gaps, actions, title, objective or revisions.
* Non-epistemic UI metadata may remain separate only when it cannot overwrite canonical fields.
* The plan must explicitly account for rename/archive/sample-loading and chat-snapshot behavior where they touch case state.

### 4. Compatibility boundary

* Legacy sample cases or previously stored legacy records may be upgraded once at a named boundary.
* After upgrade, runtime processing must remain canonical.
* Do not repeatedly convert canonical → legacy → canonical between turns.
* Do not use duck typing alone at server, persistence or network trust boundaries.
* Do not introduce fallback defaults that conceal a malformed canonical record.

### 5. Persistence boundary for this slice

Persistence/reload acceptance remains a later slice.

However, this slice must prevent any active save path from writing a lossy projection over a canonical record. If a minimal storage signature change is required to preserve the runtime invariant, it is in scope; migration, reload and browser lifecycle proof remain pending.

## Counterexamples that must fail

Add independent regression proof that the runtime rejects or prevents:

1. A canonical record containing `R01` and `R02` being hydrated and then reduced to a record with empty revision history.
2. A malformed prior canonical record being accepted by `/api/intake`.
3. A provider/reconciliation result violating canonical invariants being returned as success.
4. A client response lacking a valid complete canonical record replacing current state.
5. A translated presentation response overwriting canonical source fields.
6. A legacy projection being saved or resubmitted as the authoritative record after canonical upgrade.
7. A new intake overwriting `R01` rather than appending a child revision.
8. A response whose `current_revision_id` does not identify the newly appended revision.

## Positive proof required

Add independent proof that:

1. A legacy sample upgrades once to a valid canonical record.
2. A valid canonical record survives projection without mutation.
3. One deterministic intake appends exactly one child revision.
4. The prior revision remains byte-for-byte unchanged.
5. The returned record passes both schema and canonical invariant validation.
6. `current_revision_id` points to the appended revision.
7. The UI projection reflects that current revision.
8. Presentation translation leaves the canonical record unchanged.

## Expected scope

Likely files include:

* `src/App.tsx`;
* `server.ts`;
* `src/domain/currentProjection.ts`;
* `src/domain/reconcile.ts`;
* `src/storage/caseStore.ts` only if required to prevent lossy runtime writes;
* canonical adapter/boundary modules;
* runtime/server regression tests.

The implementation plan must list every expected file and its invariant before editing. Do not perform a broad UI redesign.

## Explicitly out of scope

* full IndexedDB migration and reload acceptance;
* save → reload → replay proof;
* full QuickBite deterministic demo;
* Gemini Flash-Lite extraction;
* timeline hierarchy redesign;
* Gaps/Actions navigation redesign;
* chat acknowledgement enhancement;
* production auth, security, billing or multi-tenancy;
* Phase 1B;
* V0 completion.

## Failure boundaries

* Do not weaken canonical schema, validator or existing assertions.
* Do not preserve legacy runtime behavior merely by casting it to canonical types.
* Add no `as any`, `as unknown as`, double casts or fallback defaults.
* Record baseline and final unsafe-cast counts for changed files; the diff must add zero unsafe casts.
* If integration requires persistence/reload work beyond preventing lossy writes, stop and report it for the next slice.
* If a required counterexample still passes, this slice fails.
* If a full gate fails outside approved scope, stop and report the blocker.

## Required verification

Run independently and report exact exit status:

* `npm run lint`;
* focused canonical runtime/server integration tests;
* full `npm test`;
* `npm run build`;
* `git diff --check`.

Report:

* focused test file and test counts;
* full-suite file and test counts;
* baseline and final grep counts for `as any` and `as unknown as` in every changed file;
* exact authoritative runtime type on client and server;
* exact network request/response canonical boundary;
* remaining unproved persistence/reload behavior.

A typecheck or projector-only test does not prove runtime integration.

## Handoff

If every required counterexample and gate passes:

* update `project-context/CURRENT_STATE.md`;
* mark only Canonical Runtime Source of Truth as accepted;
* keep Phase 1A-R active;
* identify Persistence/Reload as next, without activating it.

Commit with:

`fix: make canonical record the runtime source of truth`

Push to `main` and provide the full SHA.

Do not claim Phase 1A-R, Phase 1B or V0 complete.
