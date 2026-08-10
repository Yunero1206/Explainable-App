---
trigger: always_on
glob:
description:
---

# Explainable Trust Operating Contract

Before modifying code in this workspace:

1. Read completely:

   * `project-context/PROJECT_CONTRACT.md`
   * `project-context/CURRENT_STATE.md`
   * `project-context/CURRENT_SLICE.md`

2. Inspect the actual repository before trusting prior reports:

   * working tree and current commit;
   * relevant source and tests;
   * package scripts and verification commands;
   * unrelated dirty-worktree changes that must be preserved.

3. Produce a Context Handshake containing:

   * product mission and intended V0 output;
   * current phase and active slice;
   * confirmed baseline;
   * in-scope and explicitly out-of-scope behavior;
   * expected files and verification gates;
   * contradictions or blockers.

4. Produce an implementation plan before editing application code. State the invariant, expected files, positive tests, counterexamples and failure boundary. Stop for explicit approval before implementation.

5. During execution:

   * remain inside `CURRENT_SLICE.md`;
   * preserve unrelated changes;
   * do not widen scope to make tests pass;
   * do not weaken schemas, validators, types or assertions;
   * do not use unsafe casts or fallback defaults to hide invalid state.

6. Evidence rules:

   * source, git state and reproduced command output are evidence;
   * agent summaries and walkthroughs are not independent evidence;
   * a passing subset proves only that subset;
   * never report a focused test run as the full suite.

7. Completion rules:

   * report slice, phase and V0 status separately;
   * never claim a phase complete unless every required gate passes;
   * update `CURRENT_STATE.md` only with verified facts;
   * do not change `PROJECT_CONTRACT.md` without explicit user approval.
