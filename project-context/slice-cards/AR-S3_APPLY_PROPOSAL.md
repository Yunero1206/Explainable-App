# AR-S3 — Deterministic proposal application

## Outcome

Turn a validated proposal into a candidate child revision entirely in deterministic code, then validate the complete candidate before it can be accepted.

## Allowed changes

- `src/ledger/idAllocator.ts` — add
- `src/ledger/applyProposal.ts` — add
- `src/ledger/validateLedger.ts` — add
- `tests/fixtures/proposals.ts` — add
- `tests/applyProposal.test.ts` — add
- `project-context/ACTIVE_WORK.md` — checkpoint only
- `project-context/CURRENT_STATE.md` — verified facts only

## Required behavior

- Application code receives preallocated intake/source/model-run/revision IDs.
- It clones/carries forward the accepted parent; never mutates it.
- It resolves local refs, allocates canonical entity IDs deterministically and applies operations in order.
- Omitted entities remain byte-for-byte unchanged.
- Lifecycle changes require explicit transition operations and legal transition tables.
- Every effective change produces a deterministic delta with before/after or added-entity evidence.
- A no-change proposal may create a revision only if the architecture contract explicitly records that intake; it must have an empty delta list.
- Complete Ledger V3 validation runs after application.
- Any failure returns a typed rejection and no candidate is exposed as accepted state.

## Positive tests

- Apply one source disposition, then add linked event, claim, gap and action entities through local refs.
- Update an allowed claim field.
- Legal gap/action transition.
- Carry-forward proves omission is unchanged.
- Reapplying the same inputs with the same allocator seed produces equal output.
- Parent object is deeply unchanged.

## Counterexamples

- Unknown canonical target or local ref.
- Reference to the wrong entity family.
- Duplicate local ref or canonical allocation collision.
- Update of immutable field.
- Illegal lifecycle transition, resurrection or implicit delete.
- Provider-supplied revision/entity ID.
- Dangling relationship after application.
- Partial mutation surviving any failed operation.

## Gates

```bash
npm test -- tests/applyProposal.test.ts tests/ledgerV3Schema.test.ts tests/proposalSchema.test.ts
npm run typecheck
git diff --check
```

## Non-goals

No network/provider call, server endpoint, React state, IndexedDB or V2 deletion.
