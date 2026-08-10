# Execute the active Explainable Trust micro-slice

Use this workflow only when the user asks to continue from `project-context/ACTIVE_WORK.md`.

## Stage 1 — Handshake and stop

1. Read all required project-truth files and the always-on operating contract completely.
2. Run read-only git checks: branch, full HEAD, status, recent commits and the active slice's relevant diff/history.
3. Inspect only enough source to validate the active slice's premises.
4. Return:
   - the active slice and status;
   - branch, HEAD and worktree status;
   - source/project-truth contradictions;
   - proposed behavior and non-goals;
   - exact allowed files;
   - positive cases and counterexamples;
   - exact gates;
   - any blocker.
5. Stop. Wait for explicit approval. Make no edit and no external write.

## Stage 2 — Execute after approval

1. Recheck branch, HEAD and worktree before editing.
2. Edit only allowed files and only for the approved behavior.
3. Add the stated positive and negative tests. Prefer contract tests over implementation-detail tests.
4. Run focused gates first, then all aggregate gates required by the slice.
5. Review `git diff --check`, the complete diff and changed-file list.
6. If a gate fails, diagnose within scope. Do not weaken the contract to make a test pass.
7. Commit and push the implementation with a slice-scoped message.
8. Capture the full SHA and its exact parent.
9. Update `ACTIVE_WORK.md` with evidence and `CURRENT_STATE.md` only with verified facts.
10. Commit and push the checkpoint update separately.
11. Stop. Do not activate or implement the queued next slice.

## Required refusal cases

Stop and ask when:

- the current HEAD differs from the recorded base in a way that invalidates the slice;
- overlapping user changes are present;
- an allowed-file expansion is materially required;
- a dependency upgrade, migration or deletion falls outside the active slice;
- provider output, persistence behavior or test evidence cannot meet the declared invariant;
- commit or push fails because authorization or protected workflow is required.
