# Explainable Trust

Explainable Trust turns messy user reports and attached files into a traceable, evidence-backed case ledger. It is a working local-first product: case data stays in the browser (IndexedDB), while Model Runs call server-held analysis and retrieval providers.

## What works

- **Local-First Workspace**: Three-pane case workspace with local case creation, rename, archive, import/export, and deletion.
- **Multi-Format Intake**: Text and file intake supporting click-to-upload and drag-and-drop (PDFs, images, screenshots, text files).
- **Cryptographic & Immutable Provenance**: Immutable raw statements, attachment metadata, SHA-256 fixity hashing, and locally preserved blobs.
- **Deterministic Ledger V3**: Deterministic proposal application into a strictly validated Ledger V3 revision with stable-ID updates.
- **Reasoning Graph & Provenance DAG**: Interactive graph visualization powered by React Flow (`@xyflow/react`) with top-to-bottom / left-to-right layouts, node filtering, full-screen view, and upstream/downstream dependency tracking.
- **Source-Linked Reasoning Chain**: Direct answers plus a step-by-step reasoning chain with explicit prior-step dependencies (Fact, Public Rule, Assumption, Derivation, Scenario, Conclusion).
- **App-Owned Reconciliation**: Semantic corrections map to stable-ID updates and fail closed on ambiguous target entities.
- **Living Case Auditing**: Full tracking of claims, timeline events, evidence inspections, gaps, next actions, revision deltas, and model-run audit logs.
- **Web-Assisted Privacy & Admission**: Bounded web search via Tavily Search with first-party/public-authority admission. Only sanitized public queries and official-domain filters are sent—never raw case details or private documents.
- **Multi-Language Support**: Complete UI localization across 6 languages (English, Tiếng Việt, Español, Français, 简体中文, 日本語).
- **Robust Persistence & Export**: Atomic IndexedDB commits (`ExplainableTrustV3`), full case JSON import/export, Markdown report generation, and synchronized print views.

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
# Install dependencies
npm ci

# Start local development server (Express + Vite)
npm run dev
```

1. Copy `.env.example` to `.env`.
2. Add your `GEMINI_API_KEY`.
3. (Optional) Set `GEMINI_MODEL` (defaults to `gemini-3.5-flash-lite`, supports models such as `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-3.6-flash`, etc.).
4. (Optional) Add `TAVILY_API_KEY` to enable Web-assisted runs.
5. Open `http://localhost:3000` in your browser.

## NPM Scripts & Verification

| Command | Description |
| --- | --- |
| `npm run dev` | Starts Express server with Vite in development mode |
| `npm run lint` | Type-checks the TypeScript codebase (`tsc --noEmit`) |
| `npm test` | Runs the full Vitest test suite |
| `npm run eval` | Runs Promptfoo LLM evaluation tests |
| `npm run eval:view` | Opens Promptfoo evaluation web UI viewer |
| `npm run verify` | Runs linting, unit tests, and production build |
| `npm run build` | Builds Vite frontend and esbuild server bundles |
| `npm start` | Runs built production server (`dist/server.cjs`) |

```bash
# Run full verification suite
npm run verify

# Start in production mode
NODE_ENV=production npm start
```

Set `PORT` in `.env` or process environment to override the default port (`3000`).

## Data and Trust Boundary

- **Local Storage**: The authoritative browser database is `ExplainableTrustV3`. The app never deletes or overwrites prior V2 databases automatically. UI language changes presentation labels only; accepted source text and IDs remain untranslated to preserve audit integrity.
- **Web-Assisted Privacy**: Web retrieval is opt-in per intake. Gemini inspects the user statement and inline evidence before planning public query needs. Tavily receives only a server-sanitized public query and official-domain filters—never raw case statements, private text, names, contacts, or account identifiers.
- **Strict Evidence Admission**: A search result becomes an admissible `[E]` evidence source only when its direct URL and claim authority pass application admission rules. Social media posts, forums, AI snippets, and blogs are rejected as non-admissible.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the runtime flow, module boundaries, and acceptance invariants.
