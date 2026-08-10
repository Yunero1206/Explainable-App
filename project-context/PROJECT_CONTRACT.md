# Explainable Trust V0 — Project Contract

## Mission

Explainable Trust V0 is an executable portfolio case study demonstrating:

**Evidence → AI proposal → validated assessment → explanation/action → committed revision**

The viewer must be able to understand:

- which statements and evidence support each assessment;
- what is observation, interpretation and unresolved gap;
- what action or recovery step is available;
- why a later revision differs from its parent;
- which model run proposed a change and why it was accepted or rejected.

This is not a production SaaS.

## Authority model

Gemini is an untrusted inference provider.

The app owns:

- all canonical IDs and timestamps;
- input provenance;
- proposal schema and reference resolution;
- parent carry-forward;
- deterministic delta construction;
- complete-record validation;
- atomic persistence;
- accepted/rejected model-run audit history.

Gemini may propose interpretations, explanations, gaps and actions. It may not write canonical state directly.

## V0 model

Use the stable model code `gemini-3.5-flash` through the server-side `@google/genai` client.

Do not use a `latest` alias. Do not add Flash-Lite or a second reasoning model during the architecture reset.

## V0 storage

Use a new IndexedDB V3 database as the local V0 database.

The database must durably store:

- canonical case ledgers;
- accepted and rejected model runs;
- attachment blobs outside canonical JSON;
- required non-epistemic UI metadata;
- translation overlays only if translation remains enabled.

Do not add an external database, auth, billing, tenancy or remote sync.

Do not destroy the prior V2 IndexedDB database during the reset.

## Required V0 demo

1. Open a deterministic sample case.
2. Inspect source statements/evidence and their provenance.
3. Inspect the current assessment, explanation, gaps and actions.
4. Submit or replay one new statement/evidence/action result.
5. Produce a structured proposal.
6. Validate and commit exactly one child revision.
7. Show a human-readable revision explanation and traceable delta.
8. Reload the app and recover the same record, model run and current projection.
9. Demonstrate at least one rejected provider proposal that leaves the parent unchanged.
10. Pass typecheck, full tests, production build and deterministic demo gates.

Live Gemini is the default interactive mode. Deterministic replay must make the portfolio demo independent of API availability.

## Architecture rule

The provider returns explicit operations, not a complete canonical snapshot.

- New entities use response-local refs, not canonical IDs.
- Updates target one existing parent entity.
- Gap lifecycle changes use explicit transition operations.
- No deletion operation exists in V0.
- Omitted parent entities are carried forward unchanged by code.
- Invalid/missing values reject; no enum or timestamp fallback is allowed.

## Phase map

### Phase 1A-R Reset — Provider Boundary + Ledger V3

Build and independently validate the proposal contract, full-fidelity V3 ledger, deterministic applicator, server/client boundaries and model-run audit record.

### Persistence/Reload

Commit case, model run and blobs atomically; prove save → reload → replay.

### Deterministic V0 Behavior

Convert QuickBite to proposal fixtures and run the complete mission loop.

### V0 Gate

Run aggregate tests and a local demo smoke test, then package the portfolio artifact.

## Explicit exclusions

- production auth, security hardening, billing or multi-tenancy;
- Postgres, Supabase, Neon or another remote database;
- Flash-Lite extraction split;
- autonomous external integrations;
- large dashboard or broad UI redesign;
- model fine-tuning;
- every possible case type;
- self-acceptance by the implementation agent.

## Definition of Done

V0 is not complete until independent evidence proves:

- provider output cannot supply canonical identity or silently delete parent state;
- unknown/wrong-family references and invalid enums reject atomically;
- the ledger preserves every field displayed as assessment/explanation/gap/action;
- accepted and rejected model runs are auditable;
- complete candidate validation occurs before persistence and UI replacement;
- persistence failure cannot leave React state ahead of durable state;
- save → reload → replay preserves identity, sources, revisions and current projection;
- the deterministic demo completes the mission loop;
- `npm run lint`, full `npm test` and `npm run build` exit 0;
- no known blocker makes the demo misleading or loses data.

Passing a slice or focused test proves only that slice.

## Evidence policy

- Source, git state and reproduced command output are evidence.
- Agent summaries and walkthroughs are not independent evidence.
- No test file may import another test file.
- Shared fixtures belong under `tests/fixtures/`.
- Do not add `as any`, `as unknown as`, `z.any(`, broad explicit `any` or fallback defaults to hide contract failures.
- `@ts-expect-error` is allowed only on the exact negative test call.
- Record distinct test definitions and executions; duplicate registration is a failure.

## Execution policy

`project-context/ACTIVE_WORK.md` is the only work cursor.

One execution may complete only one approved micro-slice. After gates, implementation commit, checkpoint commit and push, the agent must stop. It may not activate the next slice.

This contract may change only with explicit user approval.
