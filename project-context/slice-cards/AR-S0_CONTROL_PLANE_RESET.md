# AR-S0 — Control-plane reset

## Outcome

Replace stale project truth and the open-ended workflow with a single resumable work cursor. Application behavior must remain byte-for-byte untouched.

## Allowed changes

- `.agents/rules/explainable-trust-operating-contract.md`
- `.agents/workflows/execute-active-work.md`
- `.agents/workflows/execute-v0-slice.md` — delete only
- `project-context/PROJECT_CONTRACT.md`
- `project-context/ARCHITECTURE_TARGET.md`
- `project-context/CURRENT_STATE.md`
- `project-context/ACTIVE_WORK.md`
- `project-context/CURRENT_SLICE.md` — delete only
- `project-context/slice-cards/*.md`
- `README.md`
- `INSTALL_FIRST.md` — delete only

## Must prove

- All authoritative files agree on V0 scope, Ledger V3, proposal ownership, IndexedDB and exact model ID.
- There is exactly one active cursor and one execution workflow.
- The current source is described as rejected V2 evidence, not accepted behavior.
- No source, server, test, fixture, package or lockfile changed.

## Counterexamples

- Editing `src/inferenceProvider.ts` to change the model in this docs-only slice.
- Marking AR-S1 active before AR-S0 is accepted.
- Claiming persistence/reload or V0 is complete.
- Keeping a second live slice document that can contradict `ACTIVE_WORK.md`.

## Gates

```bash
git branch --show-current
git rev-parse HEAD
git status --short
git diff --check
test ! -e project-context/CURRENT_SLICE.md
test ! -e .agents/workflows/execute-v0-slice.md
test -e project-context/ACTIVE_WORK.md
test -e .agents/workflows/execute-active-work.md
rg -n "gemini-3\.5-flash" .agents project-context README.md
git diff --name-only
```

Review the changed-file list manually and prove no application/source/test/package file changed.

## Stop condition

Commit and push the control plane, record the SHA in `ACTIVE_WORK.md`, commit and push that checkpoint, queue AR-S1, then stop.
