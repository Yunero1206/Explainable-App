# Explainable Trust

Explainable Trust turns a messy user report and attached files into a traceable case ledger. It is a working local-first product: case data stays in the browser, while Model Runs call server-held analysis and retrieval providers.

## What works

- Three-pane case workspace with local case creation, rename, archive, and deletion.
- Text and file intake, including click-to-upload and drag-and-drop.
- Immutable raw statements, attachment metadata, SHA-256 fixity, and locally preserved blobs.
- Deterministic proposal application into a strictly validated Ledger V3 revision.
- Direct answers plus a source-linked reasoning chain with explicit prior-step dependencies for complex decisions.
- App-owned reconciliation that turns semantic corrections into stable-ID updates and rejects ambiguous targets.
- Claims, events, evidence inspections, gaps, next actions, revision deltas, and model-run audit.
- Rejected/provider-error runs preserve the last accepted ledger.
- Atomic IndexedDB commits for the accepted ledger, model run, and attachment blobs.
- Synchronized JSON/Print export of the case Timeline and its gap-owned actions.
- Explicit Analysis-only and Web-assisted modes. Web-assisted uses Tavily Search with first-party/public-authority admission and bounded web `[E]` citations.

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
npm ci
npm run dev
```

Copy `.env.example` to `.env`, add `GEMINI_API_KEY`, then open `http://localhost:3000`. Add `TAVILY_API_KEY` to use Web-assisted runs. The analysis model is deliberately pinned to `gemini-3.6-flash`; there is no alias, fallback, router, or client override.

## Production and verification

```bash
npm run verify
NODE_ENV=production npm start
```

`npm run verify` type-checks, runs the complete test suite, and builds the browser and server bundles. Set `PORT` to override the default port `3000`.

## Data and trust boundary

The authoritative browser database is `ExplainableTrustV3`. The app never deletes or upgrades the former V2 database automatically. UI language changes presentation labels only; accepted source text and IDs are not translated or rewritten.

Web retrieval is opt-in per intake through the Web-assisted toggle. Gemini reads the user statement and attached PDF/image evidence before it plans any public information need. Tavily receives only a server-validated public query plus official-domain filters—never the raw case, names, contacts, private document text, or unique account/order/invoice/case identifiers. A result becomes `[E]` only when its direct URL and claim-specific authority pass application-owned admission. Reddit, social posts, forums, media, blogs, search snippets, and AI answers are non-admissible. Web citations show an excerpt and copyable URL inside the app without opening or embedding the webpage.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the runtime flow and invariants.
