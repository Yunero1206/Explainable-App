# AR-S4 — Server inference boundary

## Outcome

Wire typed Gemini and replay providers to a V3 intake service. Every attempt receives a model-run envelope; only a fully applied and validated candidate can be returned as accepted.

## Allowed changes

- `server/inference/geminiProvider.ts` — add
- `server/inference/replayProvider.ts` — add
- `server/inference/provider.ts` — add
- `server/intakeService.ts` — add
- `server/app.ts` — V3 intake endpoint and model metadata route only
- `server.ts` — dependency wiring only
- `tests/serverIntakeV3.test.ts` — add
- `tests/fixtures/providerResponses.ts` — add
- `project-context/ACTIVE_WORK.md` — checkpoint only
- `project-context/CURRENT_STATE.md` — verified facts only

## Required boundary

- API key stays server-only and is never echoed to browser, logs or fixtures.
- Request contains the complete accepted Ledger V3 plus one intake statement/source metadata and a client request ID.
- Server preallocates all run/source/revision identities before provider execution.
- Gemini receives a compact canonical context with stable IDs and a strict structured-output schema.
- Provider code returns `unknown`; proposal schema validation occurs before application.
- The service records provider/model/prompt identifiers, started/finished times, raw response text or safe diagnostic, validation outcome and rejection code.
- V0 performs exactly one provider attempt. Invalid output is rejected; there is no repair prompt or second call.
- Markdown-fence stripping or silent JSON surgery is forbidden.
- Replay provider implements the same interface without network access.
- HTTP response is a discriminated accepted/rejected envelope. Rejected responses contain no replacement ledger.

## Positive tests

- Valid structured proposal returns accepted candidate ledger plus accepted run envelope.
- Replay provider follows the identical service path.
- No-change proposal is handled explicitly.
- Model metadata reports exactly `gemini-3.5-flash` and the pinned prompt version.

## Counterexamples

- Malformed/unknown-field output, invalid op or dangling ref.
- Provider exception, timeout or empty response.
- Invalid first output followed by a hidden repair call or mutation.
- Rejected response containing a candidate/replacement ledger.
- API key in serialized result/log diagnostic.
- Request parent revision not equal to ledger head.
- Broad `any` at provider or HTTP boundary.

## Gates

```bash
npm test -- tests/serverIntakeV3.test.ts tests/applyProposal.test.ts tests/proposalSchema.test.ts
npm run typecheck
npm run build
! rg -n "gemini-3\.6-flash|gemini-.*latest|flash-lite" src server tests
git diff --check
```

## Non-goals

Do not switch the React app, add persistence, convert the demo or delete the V2 boundary in this slice.
