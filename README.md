# Explainable Trust

A local-first, evidence-grounded case intelligence platform that transforms unstructured reports, statements, and documents into verifiable, auditable case ledgers and interactive reasoning graphs.

---

## 🎯 Overview

**Explainable Trust** is designed for high-stakes decision-making, investigations, disputes, and compliance auditing where AI cannot be a black box. It ensures every assertion is backed by verifiable sources, tests logical warrants, identifies evidential blindspots, and preserves cryptographic integrity—all while keeping your private data strictly inside your browser.

```
┌─────────────────┐      ┌─────────────────────────┐      ┌──────────────────────┐
│  User Intake    │ ───► │  Structured Validation  │ ───► │  Immutable Ledger V3 │
│ (Text, Docs,    │      │  (Toulmin Logic,        │      │  (IndexedDB, SHA-256 │
│  Images, PDFs)  │      │   Web-Assisted Rules)   │      │   Interactive DAG)   │
└─────────────────┘      └─────────────────────────┘      └──────────────────────┘
```

---

## ⚡ Core Capabilities

* **🧠 Evidence-Grounded Toulmin Argumentation**: Structures claims into explicit propositions, grounding evidence, logical warrants, and rebuttal conditions—eliminating cognitive bias and preventing non-sequitur hallucinations.
* **🕸️ Interactive Provenance DAG (`@xyflow/react`)**: Renders dynamic argument graphs mapping corroborating (green), conflicting (red), and qualifying (amber) relationships between statements, evidence, and claims.
* **🔒 Local-First Cryptographic Integrity**: Case records and files are stored client-side in IndexedDB (`ExplainableTrustV3`) with SHA-256 fixity hashes for tamper-evident provenance.
* **📑 Forensic Dossier Export**: Generates audit-ready provenance dossiers conforming to W3C PROV-O principles, with cross-referenced statement matrices and downloadable Markdown reports.
* **🌐 Privacy-Preserving Statutory Retrieval**: Bounded, sanitized public regulation lookups via Tavily Search without ever transmitting private statements or confidential documents.
* **🌍 Multi-Language Support**: Complete interface localization across 6 languages (EN, VI, ES, FR, ZH, JA) while preserving source text verbatim.

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
# Gemini API Key (Required for model runs)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Tavily API Key (Optional for web statutory lookup)
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
