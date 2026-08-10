# Current State

Audit date: 2026-08-10

Repository: `Yunero1206/Explainable-App`

Branch intent: `main` → `origin/main`

Audited HEAD: `1e40e3dc2363d0c7a9afd80a7f52ab1e5010e1c2`

Current phase: **Phase 1A-R Architecture Reset — active and unaccepted**

Persistence/Reload: **pending and inactive**

Deterministic V0 Behavior: **pending and inactive**

V0: **not accepted**

## Rejected candidate chain

1. implementation `612bbd0cb0b4aa2cd99af592b53011808161a74d`;
2. docs `f6eacf784ddc07d89823d013445042c4239e63ad`.

The implementation candidate is rejected. Green compile/build reports do not close its reproduced counterexamples.

## Verified source facts at HEAD

- Reconstruction and translation hard-code `gemini-3.6-flash` separately.
- Provider output is a complete snapshot with provider-supplied IDs.
- V2 transition code infers changes by comparing provider arrays with the parent.
- V2 canonical types discard fields that the UI displays.
- The presentation projector invents placeholder values for discarded fields.
- legacy date admission uses `Date.parse`.
- invalid assessment and gap status silently fall back.
- entity omission and historical identity remain under-specified.
- React state updates before IndexedDB save is known to have succeeded.
- attachment bytes remain in an in-memory App map while `blobStore.ts` is not the active path.
- chat, UI metadata and translation overlays are not fully restored from persistence.
- no accepted/rejected model-run audit store exists.
- `tests/cleanup.test.ts` imports another test file, inflating executions.
- 81 distinct Vitest definitions can be reported as 128 executions because of duplicate registration.
- stale dev harnesses contain broad explicit `any` usage and target prior API shapes.
- both npm and Bun lockfiles are present.

## Architecture decision

Replace full-snapshot reconstruction with an explicit proposal/patch boundary.

Pin live inference to stable `gemini-3.5-flash` through one server-owned model config.

Create a full-fidelity Ledger V3 and new IndexedDB V3 database. Leave the V2 database untouched.

## Acceptance boundary

No current runtime slice, Phase 1A-R or V0 is accepted by this file.

Only an independent aggregate audit may change phase/V0 acceptance.

## Active cursor

Read `project-context/ACTIVE_WORK.md`. It is the only source for the active micro-slice and queue.
