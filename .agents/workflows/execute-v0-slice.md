# Execute Explainable Trust V0 Slice

## Description

Explore, plan, execute and verify exactly one active V0 slice while preserving project mission, phase boundaries and evidence standards.

## Steps

### 1. Load project truth

Read completely:

- `project-context/PROJECT_CONTRACT.md`;
- `project-context/CURRENT_STATE.md`;
- `project-context/CURRENT_SLICE.md`;
- the Always-On Explainable Trust operating rule.

### 2. Inspect actual baseline

Without editing code:

- inspect `git status`, current branch and `git rev-parse HEAD`;
- confirm whether the recorded baseline is present;
- inspect relevant source, tests and package scripts;
- reproduce unresolved counterexamples when feasible;
- identify unrelated dirty-worktree changes that must be preserved.

Do not treat earlier reports as proof.

### 3. Context Handshake

Report concisely:

- mission and V0 output;
- current phase and active slice;
- confirmed baseline;
- unresolved behavior;
- in-scope files/behavior;
- explicitly out-of-scope work;
- required gates;
- contradictions or blockers.

### 4. Implementation Plan

Provide a bounded plan mapping each change to:

- invariant/behavior;
- expected file edits;
- positive tests;
- negative/counterexample tests;
- verification command.

Then **STOP**. Wait for the user to explicitly approve execution.

### 5. Execute approved plan

After approval only:

- edit only the approved slice;
- add regression coverage before declaring a fix;
- run focused tests while iterating;
- do not change contract or deferred scope;
- if a new issue is outside the active slice, record it without fixing it.

### 6. Run final gates

Run every exact command listed in `CURRENT_SLICE.md` independently. Capture:

- command;
- exit status;
- relevant file/test counts;
- any warnings or skipped gates.

If a gate fails, continue only when the correction remains inside the approved slice. Otherwise stop and report the blocker.

### 7. Update state

Only after all active-slice gates pass:

- update `project-context/CURRENT_STATE.md` with verified facts;
- mark only the active slice complete;
- identify the next pending slice without activating or implementing it unless user asks.

### 8. Commit and handoff

Commit/push only when authorized by `CURRENT_SLICE.md` or the user.

Final report must include:

- slice result: pass / partial / blocked;
- full commit SHA and branch/upstream result;
- exact gate results;
- changed files and why;
- remaining phase/V0 work;
- explicit statement that unrun gates are not proven.
