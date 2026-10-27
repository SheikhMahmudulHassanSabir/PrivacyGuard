# PrivacyGuard 🛡️

**Context-Aware Personally Identifiable Information (PII) Protection & Comparative Research Benchmark**

PrivacyGuard is a high-performance, context-aware framework for evaluating and executing PII protection methodologies across text datasets. Rewritten as a modern React application with interactive analytical dashboards and deterministic evaluation pipelines.

---

## 🌟 The 5 Privacy Protection Paradigms

1. **PIIvot (Context-Preserving Synthetic Pseudonymization)**:
   Replaces sensitive entities with realistic synthetic surrogates (*Alex Morgan*, *user_104@synthetic-privacy.org*), maintaining grammatical fluency, casing, and semantic structure without leaking sensitive source data.
2. **PRvL (Logic-Driven Symbolic Tokenization)**:
   Replaces sensitive entities with deterministic canonical logic tokens (`<PERSON_1>`, `<EMAIL_1>`) paired with First-Order Logic constraint proofs to verify composite disclosure risk.
3. **PII-Bench (Query & Task-Aware Selective Masking)**:
   Inspects downstream task intent to selectively retain query-critical PII (e.g. preserving contact details when answering *"What is their email?"*) while strictly redacting extraneous personal attributes.
4. **PrivacyLens (Helen Nissenbaum's Contextual Integrity Audit)**:
   Audits information flows across 5 parameters (*Sender, Recipient, Subject, Attribute, Transmission Principle*) to render normative **ALLOW** or **DENY** privacy decisions.
5. **ConfAIde (Multi-Factor Contextual Privacy Risk Reasoning)**:
   Computes quantitative disclosure risk across Domain Sensitivity ($S_d$), Entity Exposure ($S_e$), Recipient Trust ($T_r$), and Purpose Necessity ($P_n$), mapping to standard schema risk tiers.

---

## 🧭 Navigation & Features

- **Overview**: System status, dataset verification report (4,434 annotated cases, 22,226 ground truth entities), and architecture overview.
- **🧪 Interactive Test**: Live real-time testing of custom inputs across all 5 paradigms with multi-stage Hybrid Detection (Regex + Contextual NER) and entity span visualization.
- **⚖️ Compare Methods**: Side-by-side comparative diff showing decisions, masked counts, and latencies across all 5 methods on identical inputs.
- **🚀 Run Experiment**: Configurable benchmark evaluation runner with reproducible random seed, stratified sampling, and saved runs history.
- **📊 Results Dashboard**: 7 analytical tabs including executive summary, PII detection breakdown by category, privacy leakage analysis, privacy-utility trade-off scatter plot, contextual privacy risk audit, interactive case explorer, and CSV/JSON data export.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + Plus Jakarta Sans + JetBrains Mono
- **Icons**: Lucide React
- **Architecture**: In-browser vectorized detection and evaluation engine adhering to the Metrics Applicability Matrix.

---

## 🚀 Running the Project

```bash
npm install
npm run dev
```

App runs on port `3000`.
