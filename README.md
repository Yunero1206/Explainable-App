# Explainable Trust

A local-first, evidence-grounded case intelligence platform that transforms unstructured reports, statements, and documents into verifiable, auditable case ledgers and interactive reasoning graphs.

---

## 🎯 Overview

**Explainable Trust** is designed for high-stakes decision-making, investigations, disputes, and compliance auditing where AI cannot be a black box. It grounds assertions in verifiable sources, tests logical warrants, identifies evidential blindspots, and records cryptographic hashes—built around a local-first persistence architecture with an optional, bounded cloud/Gemini experimental path.

```
┌─────────────────┐      ┌─────────────────────────┐      ┌──────────────────────┐
│  User Intake    │ ───► │  Structured Validation  │ ───► │  Immutable Ledger V3 │
│ (Text, Docs,    │      │  (Toulmin Logic,        │      │  (IndexedDB, SHA-256 │
│  Images, PDFs)  │      │   Web-Assisted Rules)   │      │   Interactive DAG)   │
└─────────────────┘      └─────────────────────────┘      └──────────────────────┘
```

---

## ⚡ Core Capabilities

* **🧠 Evidence-Grounded Toulmin Argumentation**: Structures claims into explicit propositions, grounding evidence, logical warrants, and rebuttal conditions—systematically mitigating cognitive bias and bounding generative outputs against ungrounded hallucinations.
* **🕸️ Interactive Provenance DAG (`@xyflow/react`)**: Renders dynamic argument graphs mapping corroborating (green), conflicting (red), and qualifying (amber) relationships between statements, evidence, and claims.
* **🔒 Local-First Cryptographic Integrity**: Case records and binary files are stored client-side in IndexedDB (`ExplainableTrustV3`) with SHA-256 fixity hashes for tamper-evident provenance.
* **📑 Forensic Dossier & Case Export**: Generates audit-ready provenance dossiers conforming to W3C PROV-O principles, downloadable Markdown reports, and structured case-view JSON snapshots.
* **🌐 Privacy-Preserving Statutory Retrieval**: Bounded, sanitized public regulation lookups via Tavily Search without transmitting private statements or confidential documents.
* **🌍 Multi-Language Support**: Complete interface localization across 6 languages (EN, VI, ES, FR, ZH, JA) while preserving source text verbatim.

---

## 🏛️ Architecture & Data Privacy Boundaries

Explainable Trust operates on two distinct operational models:

### 1. Intended / Local Persistence Architecture
* **Canonical Storage**: The sole authoritative case record is maintained client-side in the browser's IndexedDB (`ExplainableTrustV3`), including revision histories, user metadata, and attachment blobs.
* **Deterministic Replay (Demo / Offline)**: A fully offline, credential-free execution mode. Entity extraction, Toulmin logic validation, SHA-256 fixity hashing, and ledger revisions are executed locally without external API calls.
* **Data Egress**: **0 bytes leave the browser** in local/replay mode.

### 2. Optional Web / Gemini Experimental Path
* **Server-Assisted Inference**: An optional enhancement enabled when `GEMINI_API_KEY` is configured on the backend server.
* **Execution Modes**:
  * **Analysis Only**: Gemini extracts structured case entities, timeline events, and Toulmin arguments from user statements and uploaded files.
  * **Web-Assisted**: Gemini identifies statutory or policy evidence gaps, derives a sanitized public query and target official domains, and queries Tavily Search. The server independently verifies and admits only authoritative public sources into the ledger.

### 🔐 Data Egress Matrix

| Execution Mode | Destination | What Leaves the Browser? | What Stays Protected / Never Leaves? |
| :--- | :--- | :--- | :--- |
| **Deterministic Replay (Offline)** | None (Local only) | **None.** No network calls to external APIs. | All case ledgers, user statements, uploaded files, and hashes remain in local IndexedDB. |
| **Live Analysis (Analysis Only)** | Google Gemini API (via server) | User intake text, case objective, and uploaded document contents/blobs. | `GEMINI_API_KEY` remains server-side; inactive workspace cases and unreferenced files are not transmitted. |
| **Live Analysis (Web-Assisted)** | Tavily Search API (via server) | **Only sanitized public queries and official domain filters** (e.g. `query: "FDA recall notice", domains: ["fda.gov"]`). | **Private user statements, person names, contact details, transaction numbers, confidential documents, and case IDs NEVER leave to Tavily.** |

---

## 💾 Export / Import & Workspace Recovery Status

To maintain transparent technical claims regarding case data portability:

* **Active Case Export**:
  * **Forensic Provenance Dossier (.md)**: W3C PROV-O aligned report with SHA-256 fixity hashes for audit trails.
  * **Markdown Report (.md)**: Human-readable summary of timeline, claims, gaps, and actions.
  * **Case View JSON (`case-view-2.2.0`)**: A denormalized presentation projection of active case entities.
* **Single-Case Ledger Import**:
  * The intake interface supports importing individual canonical `LedgerV3` JSON files (`schema_version: 'ledger-3.0.0'`) into IndexedDB.
* **Workspace Recovery Boundary**:
  * Case data is persisted locally in the user's browser profile.
  * **Current State**: The application currently operates export and import at the **individual case record** level. It does *not* provide a monolithic full-workspace dump/restore archive (bulk export/recovery of all cases, binary blobs, and model audit records simultaneously). Presentation-level case view exports are separate from raw canonical ledger files. Workspace recovery claims should be understood as individual canonical ledger imports, not full-workspace archive restoration.

---

## 🚀 Quick Start

### 1. Prerequisites
* **Node.js** 20+ and **npm**

### 2. Setup
```bash
# Clone the repository
git clone https://github.com/Yunero1206/Explainable-App.git
cd Explainable-App

# Install dependencies
npm ci

# Configure environment
cp .env.example .env
```

### 3. Configure `.env`
```env
# Gemini API Key (Required for live model runs; key stays server-side)
GEMINI_API_KEY=your_gemini_api_key_here

# Gemini Model ID (Default: gemini-3.5-flash-lite; configurable via GEMINI_MODEL)
GEMINI_MODEL=gemini-3.5-flash-lite

# Tavily API Key (Optional; used only for web-assisted statutory lookups)
TAVILY_API_KEY=your_tavily_api_key_here

# Server Port (Default: 3000)
PORT=3000
```

### 4. Run
```bash
# Start local development server (Express + Vite)
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🛠️ Scripts & Verification

| Command | Description |
| :--- | :--- |
| `npm run dev` | Run local dev server with Hot Module Replacement |
| `npm run lint` | Type-check TypeScript codebase (`tsc --noEmit`) |
| `npm test` | Run test suite (19 test suites, 462+ unit & integration tests) |
| `npm run verify` | Full verification: Linting, tests, and production build |
| `npm run build` | Build production bundle (`dist/`) |
| `npm start` | Start production server (`dist/server.cjs`) |

---

## 📚 Documentation
* [Architecture & Invariants](docs/ARCHITECTURE.md) — System boundaries, Ledger V3 lifecycle, and deterministic replay.
* [Authoritative Retrieval](docs/AUTHORITATIVE_RETRIEVAL.md) — Public admission rules and privacy boundary.

---

## 📄 Usage & Rights

Copyright © 2026 Phạm Thanh Phú. All rights reserved.

The current source code is publicly available for portfolio review and evaluation. No permission is granted to reuse, adapt, redistribute, sublicense, or commercialize the current source unless explicitly authorized by the copyright holder.

For reuse, adaptation, or commercial licensing, please contact the author.

Earlier tagged releases or copies distributed under a different license remain subject to the terms that applied to those versions at the time of distribution.
