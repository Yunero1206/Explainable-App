# Runtime architecture

Ledger V3 is the sole authoritative case state. Gemini can propose typed operations, but it cannot allocate canonical IDs, delete records, author a full replacement snapshot, or commit browser state.

```mermaid
flowchart TD
  A["User intake + files"] --> B["Server allocates IDs and hashes files"]
  B --> C["Replay or Gemini proposal"]
  C --> D["Strict proposal validation"]
  D --> E["Deterministic apply + delta"]
  E --> F["Full Ledger V3 validation"]
  F --> G["Atomic IndexedDB commit"]
  G --> H["Derived chat and three-pane UI"]
  D --> I["Rejected run audit"]
  F --> I
```

## Acceptance rules

- Every accepted intake creates one linear revision with a single parent.
- Every introduced source has an explicit relationship disposition.
- Every evidence item has an inspection in the current revision.
- Claim source categories equal the effective accepted relationships.
- Gap and action lifecycle changes are explicit transitions with source basis.
- Revision delta order, counts, operations, reasons, and source IDs are validated deterministically.
- A response is committed only after the complete candidate ledger validates.
- React canonical state changes only after the IndexedDB transaction completes.
- Rejected and provider-error responses contain an audit record and no replacement ledger.

## Main modules

| Area | Files |
| --- | --- |
| Ledger contract | `src/ledger/types.ts`, `src/ledger/schema.ts` |
| Proposal contract | `src/provider/proposalSchema.ts` |
| Deterministic application | `src/ledger/applyProposal.ts` |
| Server boundary | `server/intakeService.ts`, `server/proposalProvider.ts` |
| Local persistence | `src/storage/ledgerStore.ts` |
| UI projection | `src/presentation/projectLedger.ts` |

## Inference modes

Replay is a deterministic, credential-free product demo. It records user reports conservatively, inspects file metadata without inventing document contents, and supports an explicit `[reject]` input for commit-boundary demonstrations.

Live mode uses the server-held `GEMINI_API_KEY` and exactly `gemini-3.5-flash`. Source material is treated as untrusted data. The provider returns an operation proposal constrained by JSON Schema; application code remains the only path to an accepted revision.
