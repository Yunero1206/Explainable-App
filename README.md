# Explainable Trust

**Explainable Trust** turns complex, messy user reports and attached documents into a traceable, logically rigorous, and evidence-backed case ledger. Built on a local-first architecture, your case data and files stay private in your browser (IndexedDB), while deterministic model runs invoke server-held validation, reasoning graph orchestration, and authoritative retrieval boundaries.

---

## ✨ Key Features & Capabilities

### 1. 🧠 Toulmin Argumentation Model (Anti-Bias & Logic Verification)
* **Proposition & Evidentiary Strength Gauge**: Real-time counter of corroborating independent proofs (`+X`) vs contested claims (`-Y`).
* **Grounding Data Breakdown**: Two-column division clearly distinguishing **Independent Hard Evidence `[E*]`** (cryptographically hashed documents, photos, logs) from **Subjective Statements `[U*]`** (self-reported claims requiring corroboration).
* **Explicit Logical Warrant**: Transparent rationale establishing exactly *why* grounding evidence necessitates the conclusion without non-sequitur or logical leaps.
* **Rebuttal Conditions & Blindspots**: Anticipates counter-arguments and specifies exact factual conditions that would refute the proposition—protecting users from confirmation bias.
* **Statutory Rule Anchoring**: Cites relevant legal articles, decrees, and public regulatory authorities.

### 2. 🕸️ Interactive Reasoning Graph & DAG (`@xyflow/react`)
* **ArbGraph & ArgRAG Relationship Edges**:
  * 🟢 **Solid Green**: Corroborating / Supporting relationships.
  * 🔴 **Dashed Red**: Conflicting / Rebuttal relationships.
  * 🟡 **Dotted Amber**: Qualifying / Limiting conditions.
  * 🟣 **Purple**: Missing Evidence Gaps (`[G*]`) & Next Actions (`[A*]`).
* **Interactive Graph Controls**: Top-to-Bottom (TB) / Left-to-Right (LR) auto-layout, floating visual legend, zoom/pan/fit-to-view, and full-screen inspection modal.

### 3. 📑 Forensic Provenance Dossier Export (W3C PROV-O Standard)
* **Cryptographic Fixity Verification**: Exportable audit-ready dossiers with complete SHA-256 hash tables for all attached evidence.
* **Statement-to-Evidence Corroboration Matrix**: Detailed breakdown mapping every factual occurrence to its source statements, corroborating files, and unresolved gaps.
* **Multi-Format Export**: One-click Markdown copy/download and synchronized clean print view.

### 4. 💬 Modern Ergonomic UX & Workspace
* **ChatGPT-Grade Chat Interface**: Clean typography, crisp right-aligned user messages (`bg-blue-600`), and real-time revision delta badges.
* **Spacious 3-Pane Workspace**: Collapsible case navigation sidebar, centered intake chat stream, and an expanded right-hand dossier panel (420px–560px) for timelines, claims, gaps, and graphs.
* **Uniform Temporal Phrasing**: Automated date-first chronological formatting for all timeline events (`[Ngày/Buổi], lúc [Giờ:Phút]`).

### 5. 🛡️ Data Privacy & Trust Boundaries
* **Local-First Storage**: Authoritative storage remains on-device (`ExplainableTrustV3` in IndexedDB).
* **Sanitized Authoritative Retrieval**: Opt-in public law and regulatory lookup via Tavily Search. Only server-sanitized queries and official domain filters are dispatched—**never** raw case text, personal identities, or private files.
* **Strict Evidence Admission**: Automatically filters out untrusted social media, forums, and unverified AI answers from evidentiary record.
* **Multi-Language Support**: Complete localization across 6 languages (English, Tiếng Việt, Español, Français, 简体中文, 日本語) while strictly preserving source-owned intake text verbatim.

---

## 🚀 Quick Start

### Prerequisites
* **Node.js**: v20 or newer
* **npm**: v9 or newer

### Installation & Setup

```bash
# 1. Clone the repository
git clone https://github.com/Yunero1206/Explainable-App.git
cd Explainable-App

# 2. Install dependencies
npm ci

# 3. Configure environment variables
cp .env.example .env
```

Edit `.env` to configure your API keys:
```env
# Required for Gemini Model Runs
GEMINI_API_KEY=your_gemini_api_key_here

# Optional model selection (defaults to gemini-2.5-flash)
GEMINI_MODEL=gemini-2.5-flash

# Optional for Web-assisted statutory retrieval
TAVILY_API_KEY=your_tavily_api_key_here

# Optional server port (defaults to 3000)
PORT=3000
```

### Run Locally
```bash
# Start local development server (Express + Vite HMR)
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🧪 NPM Scripts & Verification

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Express server with Vite in development mode |
| `npm run lint` | Type-checks the entire TypeScript codebase (`tsc --noEmit`) |
| `npm test` | Runs the full Vitest suite (19 test files, 462+ unit & integration tests) |
| `npm run eval` | Runs Promptfoo LLM evaluation benchmarks |
| `npm run eval:view` | Opens Promptfoo evaluation web UI viewer |
| `npm run verify` | Complete verification pipeline: linting, tests, and production build |
| `npm run build` | Builds Vite frontend and esbuild server bundles (`dist/`) |
| `npm start` | Runs production server (`dist/server.cjs`) |

---

## 🏗️ Architecture & Technical Reference

For architectural diagrams, linear ledger mutation schemas, deterministic replay invariants, and authoritative retrieval boundaries, see:
* [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
* [docs/AUTHORITATIVE_RETRIEVAL.md](docs/AUTHORITATIVE_RETRIEVAL.md)

---

## 📄 License
MIT License. Created with ❤️ for transparent, explainable, and accountable human-AI collaboration.
