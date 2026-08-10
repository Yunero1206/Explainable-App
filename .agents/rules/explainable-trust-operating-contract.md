---
trigger: always_on
description: Keep Explainable Trust work bounded, auditable, and resumable.
---

# Explainable Trust operating contract

## Project truth

Before planning or editing, read these files completely in this order:

1. `project-context/PROJECT_CONTRACT.md`
2. `project-context/ARCHITECTURE_TARGET.md`
3. `project-context/CURRENT_STATE.md`
4. `project-context/ACTIVE_WORK.md`

Then inspect the real branch, HEAD, worktree and relevant source. Source and git evidence outrank stale prose. Record every contradiction before proceeding.

## One-slice rule

- Work on exactly one micro-slice: the one marked active in `ACTIVE_WORK.md`.
- Treat its allowed-file list as a hard boundary.
- A queued slice is not permission to inspect broadly, edit, or implement it.
- Do not activate the next slice in the turn that completes the current one.
- Never silently absorb an adjacent cleanup, refactor, dependency upgrade, or UX improvement.

## Approval boundary

At the start of a slice, return a Context Handshake, git facts, contradictions, a bounded plan, exact files, counterexamples and gates. Then stop. Do not edit, commit or push until the user explicitly approves that plan.

After approval, execute only the approved slice. If facts require a material scope change, stop and ask instead of improvising.

## Architecture invariants

- The accepted Ledger V3 is the only authoritative product state.
- Gemini proposes typed operations; it never returns or owns the full canonical ledger.
- Only application code allocates canonical entity and revision IDs.
- Omission means unchanged. V0 exposes no model-driven delete operation.
- Every accepted revision is rebuilt, fully validated and committed atomically.
- Rejected or malformed model output must not change the accepted parent ledger.
- Every inference attempt is auditable, including rejected attempts. V0 performs exactly one attempt and no silent repair.
- Core chat is a projection of stored intake and accepted revision explanation data, not a second source of truth.
- Binary attachments live in the blob store; canonical JSON stores metadata and blob references only.
- The V0 inference model is exactly `gemini-3.5-flash`; do not use aliases such as `latest` and do not add model routing.
- API keys remain server-only.

## Evidence and honesty

- A passing test proves only the behavior it actually exercises.
- Never mark a slice, persistence, reload, or V0 accepted without the required evidence and independent user acceptance.
- Do not replace strict validation with coercion, fallback enums, placeholder data, or lossy projection.
- Preserve unknown-field rejection at provider and ledger boundaries.
- Record exact commands and results; do not write “all tests pass” from memory.

## Commit/checkpoint protocol

For an approved implementation slice:

1. run the slice gates;
2. commit the implementation and push it;
3. record the full implementation SHA, its parent, changed files and exact gate results in `ACTIVE_WORK.md`;
4. update `CURRENT_STATE.md` only with verified facts;
5. commit and push the checkpoint update separately;
6. mark the next slice queued, not active;
7. stop.

Do not amend, force-push, reset, or discard unrelated user changes. If the worktree is dirty in overlapping files, stop and report it.

## Context pressure

If context is becoming unsafe, checkpoint facts in `ACTIVE_WORK.md` as `WIP — NOT VERIFIED`, list dirty files and unfinished work, and stop. Do not manufacture completion and do not make an unapproved WIP commit.
