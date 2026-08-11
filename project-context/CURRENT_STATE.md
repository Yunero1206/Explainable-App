# Current State

Audit date: 2026-08-11

Repository: `Yunero1206/Explainable-App`

Branch intent: `main` → `origin/main`

Audited implementation/test HEAD: `9de4f9708a5b02bb54b9a40797c62cb713a573ac`
Current phase: **Phase 1A-R Architecture Reset — active and unaccepted**

Persistence/Reload: **pending and inactive**

Deterministic V0 Behavior: **pending and inactive**

V0: **not accepted**

## Rejected candidate chain

1. implementation `612bbd0cb0b4aa2cd99af592b53011808161a74d`;
2. docs `f6eacf784ddc07d89823d013445042c4239e63ad`.

The implementation candidate is rejected. Green compile/build reports do not close its reproduced counterexamples.

## Verified source facts at HEAD

- Ledger V3 strict domain contracts, schema, and tests are implemented and pass validation.
- The negative test matrix explicitly tests all transition/gap variants, missing/extra sources, delta operations, ID families, duplicate items, and unknown keys independently without genesis rejections.
- Provider proposal boundary schema, types, and model configuration (`gemini-3.5-flash`) are centralized, implement strict structurally valid unions for source disposition and lossless `EvidenceInspection`, enforce duplicate-free arrays natively via Zod `refine`, require actual mutable-field changes for updates, utilize local reference families (`new_event_`, `new_claim_`, etc.), and pass strict independent type-checked validation.
- Proposal JSON Schema conformance is now proved against an explicit 15-branch manifest with complete discriminant signatures, exactly one match per signature, one-to-one coverage, exact order-independent required-field and disposition-enum sets, `additionalProperties === false`, and non-empty properties.
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

## AR-S2 verification checkpoint

- Frozen production implementation: `761feb0c0b83f26633b73189f77ea4973c1c922c`.
- Incomplete verification commit retained for history: `6fb3ebf136c14bdcdf9827cf5e1ee27292bd4038`.
- Final test-only conformance commit: `9de4f9708a5b02bb54b9a40797c62cb713a573ac` (parent `ee5dde09e5d85614b70acc6ab25936b1be73f480`).
- `npm test -- tests/proposalSchema.test.ts`: 57/57 passed, exit 0.
- `npm test`: 564/564 passed across 7 files, exit 0.
- `npm run lint`: exit 0.
- `npm run build`: exit 0.
- `git diff --check`: exit 0.
- Unsafe construct scan: no matches, exit 1 as expected.
- Forbidden model scan: no matches, exit 1 as expected.
- AR-S2 is complete and verified, awaiting explicit user continuation. AR-S3 remains queued and inactive.

## Architecture decision

Replace full-snapshot reconstruction with an explicit proposal/patch boundary.

Pin live inference to stable `gemini-3.5-flash` through one server-owned model config.

Create a full-fidelity Ledger V3 and new IndexedDB V3 database. Leave the V2 database untouched.

## Acceptance boundary

No current runtime slice, Phase 1A-R or V0 is accepted by this file.

Only an independent aggregate audit may change phase/V0 acceptance.

## Active cursor

Read `project-context/ACTIVE_WORK.md`. It is the only source for the active micro-slice and queue.
