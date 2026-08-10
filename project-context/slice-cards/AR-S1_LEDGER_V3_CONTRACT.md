# AR-S1 — Ledger V3 contract

## Outcome

Add the strict, lossless Ledger V3 domain contract and neutral test builders. Do not wire it into server or UI code yet.

## Allowed changes

- `src/ledger/types.ts` — add
- `src/ledger/schema.ts` — add
- `src/ledger/factory.ts` — add
- `src/ledger/index.ts` — add
- `tests/fixtures/ledgerV3.ts` — add
- `tests/ledgerV3Schema.test.ts` — add
- `project-context/ACTIVE_WORK.md` — checkpoint only
- `project-context/CURRENT_STATE.md` — verified facts only

Any additional production file requires a new plan and user approval.

## Contract requirements

- Schema version is exactly `3.0.0`.
- A case stores immutable identity, title, created time and ordered revisions.
- Intake and source records preserve user statements, evidence metadata/content references and provenance before inference.
- A revision stores parent link, source IDs, entity snapshots, explicit deltas, assistant explanation and accepted model-run ID.
- Evidence preserves claim/source/content/original time/inspection details and provenance.
- Events preserve time text, actor, action, target, effect, source support and assessment.
- Claims preserve actor/action/target/time/scope/limits, evidence support and assessment.
- Gaps preserve question, status, target references and lifecycle metadata.
- Actions preserve description, target reference, status and lifecycle metadata.
- IDs are branded by family in TypeScript and checked by strict runtime schemas.
- Timestamps are strict ISO instants; natural-language dates are domain strings, never coerced to instants.
- Unknown keys, invalid enums, broken parent chains, duplicate IDs and dangling references fail closed.
- Binary data is represented only by blob metadata/reference.

## Positive tests

- Empty case factory validates.
- One complete revision with evidence/claim/gap/action and delta validates.
- All rich explanation fields survive parse/serialize/parse unchanged.
- Domain text such as `next Friday` is retained as text where the contract allows it.

## Counterexamples

- Unknown property at any nested boundary.
- Placeholder insertion such as `Unknown`, empty actor/action or invented source text.
- Duplicate canonical ID or wrong ID family.
- Child revision with a missing/wrong parent.
- Entity reference to a nonexistent entity.
- Blob content/base64 embedded in canonical JSON.
- Invalid ISO instant accepted through `Date.parse` coercion.

## Gates

```bash
npm test -- tests/ledgerV3Schema.test.ts
npm run typecheck
git diff --check
```

If the repository does not support that exact focused-test syntax, use its existing Vitest syntax and record the exact command.

## Non-goals

No V2 migration, provider schema, Gemini call, proposal application, UI wiring, persistence or deletion.
