# AR-S5 — Client projection and ledger-derived chat

## Outcome

Switch the React application to accepted Ledger V3 state and derive the existing three-pane presentation from it. Keep the UI thin and visually stable.

## Allowed changes

- `src/presentation/types.ts` — add
- `src/presentation/projectCase.ts` — add
- `src/presentation/projectChat.ts` — add
- `src/App.tsx` — V3 state/intake response/projection wiring only
- `src/domain/translationOverlay.ts` — adapt to stable V3 entity keys only
- `tests/clientAcceptance.test.ts` — add
- `tests/presentationProjection.test.ts` — add
- `project-context/ACTIVE_WORK.md` — checkpoint only
- `project-context/CURRENT_STATE.md` — verified facts only

If an existing UI component truly cannot compile against the adapter, list each component and exact prop-only change in the handshake and obtain approval before adding it.

## Required behavior

- Accepted Ledger V3 is the only authoritative React case state.
- `projectCase` is a pure, lossless-enough presentation adapter; it may format but must not invent evidence, actors, priorities, status, dates or source text.
- `projectChat` derives core messages from stored intake records and revision assistant explanations.
- Sending an intake does not append a second authoritative chat object.
- Client parses the complete accepted response and rejects wrong case, stale parent, unknown run or invalid ledger before replacement.
- A rejected response leaves the accepted ledger and core chat unchanged and presents a staged error.
- Translation overlay remains presentation-only, keyed by case/revision/entity/language, rejects stale responses and ignores unknown IDs.
- Existing three-pane layout, modal behavior and static UI translations remain structurally unchanged.

## Positive tests

- Initial V3 case projects into all three panes without placeholders.
- Accepted response replaces the correct head and chat gains exactly the stored intake/explanation pair.
- Re-render/reprojection creates no duplicate chat entries.
- Translation overlay changes labels only, never canonical values.

## Counterexamples

- Separate mutable `messages`, `attachments` or current-case DTO becoming a second source of truth.
- `Unknown`, empty actor/action, default priority or fabricated source text.
- Stale/wrong-case response replacing current state.
- Rejected provider response altering case/chat.
- Translation output inserting an unknown entity.
- Component redesign or broad CSS change.

## Gates

```bash
npm test -- tests/clientAcceptance.test.ts tests/presentationProjection.test.ts
npm run typecheck
npm run build
git diff --check
```

## Temporary seam

Until AR-S6, accepted V3 state may remain in memory. Do not claim reload durability and do not use the rejected V2 case store for V3 writes.
