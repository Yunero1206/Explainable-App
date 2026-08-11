# Explainable Trust

Explainable Trust turns a messy user report and attached files into a traceable case ledger. It is a working local-first product: the default replay mode needs no API key, while live mode calls Gemini only from the server.

## What works

- Three-pane case workspace with local case creation, rename, archive, and deletion.
- Text and file intake, including click-to-upload and drag-and-drop.
- Immutable raw statements, attachment metadata, SHA-256 fixity, and locally preserved blobs.
- Deterministic proposal application into a strictly validated Ledger V3 revision.
- Claims, events, evidence inspections, gaps, next actions, revision deltas, and model-run audit.
- Rejected/provider-error runs preserve the last accepted ledger.
- Atomic IndexedDB commits for the accepted ledger, model run, and attachment blobs.
- Portable JSON export of the authoritative ledger plus its run audit.

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. Replay is selected by default and works without credentials.

For live inference, copy `.env.example` to `.env`, add `GEMINI_API_KEY`, start the app, then choose **Live** in the left sidebar. The model is deliberately pinned to `gemini-3.5-flash`; there is no alias, fallback, router, or client override.

## Production and verification

```bash
npm run verify
NODE_ENV=production npm start
```

`npm run verify` type-checks, runs the complete test suite, and builds the browser and server bundles. Set `PORT` to override the default port `3000`.

## Data and trust boundary

The authoritative browser database is `ExplainableTrustV3`. The app never deletes or upgrades the former V2 database automatically. UI language changes presentation labels only; accepted source text and IDs are not translated or rewritten.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the runtime flow and invariants.
