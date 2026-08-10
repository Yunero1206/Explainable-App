# AR-S2 — Proposal schema and model config

## Outcome

Define the only shape Gemini may return and centralize the exact V0 provider configuration. Do not call Gemini yet.

## Allowed changes

- `src/provider/proposalTypes.ts` — add
- `src/provider/proposalSchema.ts` — add
- `src/provider/index.ts` — add
- `server/inference/modelConfig.ts` — add
- `.env.example` — model-related documentation only
- `tests/proposalSchema.test.ts` — add
- `project-context/ACTIVE_WORK.md` — checkpoint only
- `project-context/CURRENT_STATE.md` — verified facts only

## Fixed model configuration

```ts
export const INFERENCE_MODEL = {
  provider: 'google-gemini',
  modelId: 'gemini-3.5-flash',
  promptVersion: 'explainable-trust-proposal-v1',
} as const;
```

There is one V0 inference model. No `latest` alias, environment override, fallback model, Flash-Lite path or router.

## Proposal contract

- The response contains an assistant explanation plus an ordered list of explicit operations.
- The response may disposition/inspect only the preallocated current-intake sources; it cannot create source identity.
- Allowed entity operations are narrowly typed: add/update event/claim/gap/action and transition gap/action lifecycle.
- Existing targets use canonical IDs supplied in the request.
- New entities use response-local references such as `new_claim_1`, never provider-invented canonical IDs.
- Every operation includes a concise reason and source/reference support when applicable.
- Omission means unchanged.
- V0 has no delete, replace-ledger, replace-array, set-revision-ID or set-entity-ID operation.
- Schema is strict and suitable for Gemini structured output.
- Cross-operation semantic validation detects duplicate local references and references to undeclared local entities.

## Positive tests

- A proposal dispositioning a preallocated source and adding linked event/claim entities through local refs validates.
- A proposal updating one existing claim and transitioning one gap validates.
- Empty operation list with an explanation validates as a no-change proposal.

## Counterexamples

- Full case/revision/entity arrays returned by the provider.
- A canonical-looking ID for a new entity.
- Unknown operation, field or enum.
- Delete operation or omission interpreted as delete.
- Duplicate/forward-missing local ref.
- Update to immutable identity/provenance fields.
- Missing reason, explanation or required support.
- Model ID `gemini-3.6-flash`, `gemini-3.5-flash-latest` or a variable override.

## Gates

```bash
npm test -- tests/proposalSchema.test.ts
npm run typecheck
! rg -n "gemini-3\.6-flash|gemini-.*latest|flash-lite" src server .env.example
git diff --check
```

## Non-goals

No Gemini SDK call, no ID allocation, no ledger mutation, no App/server endpoint wiring and no old-code deletion.
