# Explainable Trust V0

Explainable Trust is a portfolio case for turning messy evidence into an auditable, explainable decision ledger. V0 is intentionally local-first and thin: React UI, a server-held Gemini boundary, deterministic ledger application, IndexedDB persistence and replayable proof.

## Current reset

The active architecture-reset cursor is `project-context/ACTIVE_WORK.md`. The reset replaces model-authored full snapshots with typed proposals applied by deterministic code to Ledger V3. The V0 model is pinned to `gemini-3.5-flash`.

## Start an Antigravity turn

Ask Antigravity:

```text
Continue from project-context/ACTIVE_WORK.md. Load project truth, inspect actual git state, and plan only the active micro-slice. Stop for approval before editing.
```

The agent must return a handshake and plan first. Approve only one slice at a time. The always-on contract is `.agents/rules/explainable-trust-operating-contract.md`; the execution workflow is `.agents/workflows/execute-active-work.md`.

## Local commands

Use the commands declared by the repository's current `package.json`. Do not infer acceptance from a dev server alone; each slice names its own focused and aggregate gates.
