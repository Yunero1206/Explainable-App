# AR-S9 — Repository hygiene and aggregate audit

## Outcome

Remove obsolete duplicate harnesses, make each test owned exactly once, reconcile current documentation with evidence, and produce the final candidate checkpoint. Do not self-accept V0.

## Allowed changes

- `dev/run-stress-test.ts` — delete
- `dev/test-replay.ts` — delete
- `dev/verify.ps1` — delete
- `dev/fixtures/quickbite.replay.json` — delete after AR-S7 replacement
- `tests/canonical-record.test.ts` — delete after replacement
- `tests/canonicalRuntime.test.ts` — delete after replacement
- `tests/serverBoundary.test.ts` — delete after replacement
- `tests/cleanup.test.ts` — remove any imported-suite registration and own only cleanup tests
- `bun.lock` — delete
- `.vscode/settings.json` — delete if still empty
- `package.json` — scripts only
- `package-lock.json` — npm-generated changes only when package metadata actually changes
- `README.md`
- `project-context/PROJECT_CONTRACT.md` — contradiction correction only
- `project-context/ARCHITECTURE_TARGET.md` — contradiction correction only
- `project-context/CURRENT_STATE.md` — verified final candidate facts
- `project-context/ACTIVE_WORK.md` — final checkpoint

## Required audit

- Count test definitions and test executions; explain any difference. No suite may be registered by importing another test file.
- Run all focused contract suites and the aggregate suite from a clean install-compatible state.
- Review all remaining explicit `any`, double casts, TODO/FIXME, model IDs, V2 terms and provider/full-snapshot wording.
- Confirm a single lockfile/package-manager path.
- Confirm server-only key handling and no secret-like values in fixtures/build output.
- Confirm every current-state claim points to an exact test or source fact.
- Record branch, implementation SHA, parent SHA, checkpoint SHA, commands and results.

## Counterexamples

- Deleting a test before its behavior has an owned V3 replacement.
- `cleanup.test.ts` importing another `.test.ts` file.
- Claiming `81 tests` when the runner executed duplicated registrations.
- Editing lockfile by hand or keeping both npm and Bun locks.
- Marking Persistence/Reload or V0 accepted without the user's independent acceptance.
- Hiding a failed/flaky gate behind a prose summary.

## Gates

```bash
npm ci
npm run lint
npm test
npm run typecheck
npm run build
git diff --check
rg -n "from .*\.test|import .*\.test" tests
! rg -n "gemini-3\.6-flash|gemini-.*latest|flash-lite" . --glob '!node_modules/**' --glob '!project-context/**'
rg -n "\bany\b|as unknown as|TODO|FIXME" src server tests --glob '!node_modules/**'
git status --short
```

If `npm ci` would delete or rewrite user-owned local state, run it in a clean temporary worktree and record that fact.

## Final status

Mark the architecture reset `IMPLEMENTED — CANDIDATE FOR ACCEPTANCE`. Keep Persistence/Reload and V0 unaccepted until the user reviews evidence and explicitly accepts them. Queue no new implementation slice.
