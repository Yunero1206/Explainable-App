# Active Work Cursor

## Control fields

- Workstream: `AR` — Proposal Boundary + Ledger V3
- Repository: `Yunero1206/Explainable-App`
- Starting base SHA: `f6eacf784ddc07d89823d013445042c4239e63ad`
- Phase status: active, unaccepted
- Persistence/Reload: pending, inactive
- V0 status: not accepted
- Active micro-slice: `AR-S0`
- Active status: `READY FOR HANDSHAKE`
- Last verified implementation SHA: none
- Last checkpoint SHA: none

## AR-S0 — Control-plane reset

### Objective

Install the architecture-reset project truth and checkpoint mechanism without changing application code.

### In scope

- replace `project-context/PROJECT_CONTRACT.md`;
- replace `project-context/CURRENT_STATE.md`;
- add `project-context/ARCHITECTURE_TARGET.md`;
- add this `project-context/ACTIVE_WORK.md`;
- replace `.agents/rules/explainable-trust-operating-contract.md`;
- add `.agents/workflows/execute-active-work.md`;
- add the immutable planning cards under `project-context/slice-cards/`;
- delete `project-context/CURRENT_SLICE.md`;
- delete `.agents/workflows/execute-v0-slice.md`;
- replace `INSTALL_FIRST.md` with a concise root `README.md`, then delete `INSTALL_FIRST.md`.

### Explicitly out of scope

- every application, server, test, fixture, package and lockfile change;
- Gemini model code change;
- Ledger V3 implementation;
- persistence or demo work.

### Allowed files

- `.agents/rules/explainable-trust-operating-contract.md`
- `.agents/workflows/execute-active-work.md`
- `.agents/workflows/execute-v0-slice.md` deletion only
- `project-context/PROJECT_CONTRACT.md`
- `project-context/CURRENT_STATE.md`
- `project-context/ARCHITECTURE_TARGET.md`
- `project-context/ACTIVE_WORK.md`
- `project-context/slice-cards/AR-S0_CONTROL_PLANE_RESET.md`
- `project-context/slice-cards/AR-S1_LEDGER_V3_CONTRACT.md`
- `project-context/slice-cards/AR-S2_PROPOSAL_SCHEMA_MODEL_CONFIG.md`
- `project-context/slice-cards/AR-S3_APPLY_PROPOSAL.md`
- `project-context/slice-cards/AR-S4_SERVER_BOUNDARY.md`
- `project-context/slice-cards/AR-S5_CLIENT_PROJECTION_CHAT.md`
- `project-context/slice-cards/AR-S6_PERSISTENCE.md`
- `project-context/slice-cards/AR-S7_REPLAY_DEMO.md`
- `project-context/slice-cards/AR-S8_REMOVE_V2_RUNTIME.md`
- `project-context/slice-cards/AR-S9_REPO_AUDIT.md`
- `project-context/CURRENT_SLICE.md` deletion only
- `README.md`
- `INSTALL_FIRST.md` deletion only

### Gates

- `git branch --show-current`
- `git rev-parse HEAD`
- `git status --short`
- `git diff --check`
- verify the superseded cursor/workflow files are absent and the new cursor/workflow files exist
- verify no application/source/test/package file changed

### Completion sequence

1. Commit and push the control-plane implementation.
2. Record its full SHA, exact parent and gate results below.
3. Change active status to `COMPLETE — AWAITING USER CONTINUE`.
4. Set `Queued next micro-slice` to `AR-S1` without activating it.
5. Commit and push this checkpoint update.
6. Stop.

## Work log

### Completed

- None.

### Gate results

- Not run.

### Dirty files / WIP

- None recorded.

### Known unresolved issues

- Entire rejected V2 runtime remains unchanged until later slices.

## Queued micro-slices

| ID | Objective | Status |
|---|---|---|
| AR-S1 | Add strict Ledger V3 types/schema and neutral fixtures, not wired to runtime | queued |
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
