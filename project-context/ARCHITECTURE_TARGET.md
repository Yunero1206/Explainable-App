# Architecture Target — Ledger V3

## Flow

```text
User input/files
  → app allocates intake/source/run/revision IDs
  → Gemini 3.5 Flash returns a structured patch proposal
  → proposal schema + reference validation
  → code carries parent snapshot forward and applies operations
  → code creates deterministic delta
  → complete ledger validation
  → accepted/rejected model-run audit record
  → one IndexedDB transaction
  → pure UI/chat projection
```

## Trust boundaries

| Boundary | Required behavior |
|---|---|
| Provider | Server-side API key; stable `gemini-3.5-flash`; structured JSON schema. |
| Proposal | Strict discriminated operations; no provider-created canonical IDs/timestamps. |
| References | Resolve only known U/E/entity IDs or same-response local refs; reject unknown/wrong family. |
| Transition | Carry parent forward; no deletion by omission; explicit gap/action lifecycle transitions only. |
| Commit | Validate complete candidate; append one immutable child revision or commit nothing. |
| Persistence | One IndexedDB V3 transaction before React state changes. |
| Presentation | Pure projection; translation and UI metadata cannot overwrite ledger fields. |
| Audit | Store accepted, rejected and provider-error model runs with model/prompt versions. |

## Proposal rules

- `add` operations use unique local refs such as `new_claim_1`.
- `update` operations target existing parent IDs and contain only mutable fields.
- gap status uses a dedicated `transition` operation.
- no `delete` operation in V0.
- omitted entities remain unchanged.
- schema has no enum defaults.
- source arrays are deduplicated and deterministically ordered by code.
- each operation has reason and source IDs.
- V0 makes exactly one provider attempt; invalid output is rejected without repair.

## Ledger field coverage

V3 must store, without placeholder reconstruction:

- evidence provenance, content reference, inspection and limitations;
- event actor/action/target/effect/time/sources/assessment;
- claim text, assessment, reasoning, scope, limits and source categories;
- gap question, relevance, resolving evidence, acquisition guidance, collection boundary, status and transition metadata;
- action title, description, target gaps, priority and lifecycle status;
- revision explanation/assistant message, delta and accepted model-run ID.

Binary/base64 attachment bytes stay in the blob store.

## Model-run record

Every run records:

- run ID, case ID and parent/proposed revision IDs;
- provider, exact model ID and prompt version;
- timestamps;
- one raw attempt in V0;
- accepted/rejected/provider-error status;
- validation errors;
- committed revision ID when accepted.

## Database

Use a new database name such as `ExplainableTrustV3` with stores for `cases`, `modelRuns`, `blobs`, `uiMetadata` and optional `translationOverlays`.

Do not delete the V2 database. Do not add a remote database.

## Client state

Accepted V3 case ledgers are the only epistemic React state.

Derive chat from intake statements and revision explanations. Keep only selection, composer, loading, modal and locale state transient.

## Preserved behavior

- three-pane UI;
- server-owned API key;
- deterministic replay concept;
- complete-record server/client validation;
- stale translation rejection and unknown overlay-ID filtering;
- local sample/demo cases.

## Failure contract

Provider, schema, reference, canonical or persistence failure leaves the prior accepted ledger unchanged. The failed run is auditable and the UI displays a recoverable error.
