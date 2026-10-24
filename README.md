# PrivacyGuard: Context-Aware Privacy-Preserving LLM Framework

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.28+-FF4B4B.svg)](https://streamlit.io/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-API%20Enabled-4285F4.svg)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Tests: 18 Passed](https://img.shields.io/badge/Tests-18%20Passed-brightgreen.svg)](tests/)

**PrivacyGuard** is an empirical, research-inspired framework for investigating how different privacy protection and evaluation approaches perform on text containing Personally Identifiable Information (PII).

The framework unifies a multi-layered **Hybrid Detector** with five distinct privacy-preserving paradigms, accompanied by an interactive SaaS-grade Streamlit research dashboard and a reproducible benchmark runner evaluated on 4,434 verified cases.

---

## 🔬 Research-Inspired Paradigms vs Implementation Truth

PrivacyGuard implements five research-inspired methods. To preserve scientific honesty, each component is explicitly documented:

| Method | Paradigm Category | Implementation Strategy | Primary Evaluation Metrics |
| :--- | :--- | :--- | :--- |
| **PIIvot** | PII Redaction & Pseudonymization | Context-preserving synthetic surrogates mapped via deterministic hashing | Residual Leakage Rate, Utility Score, Latency |
| **PRvL** | PII Redaction & Pseudonymization | Canonical logic tokens (`<PERSON_1>`, `<EMAIL_1>`) with first-order constraint proof | Residual Leakage Rate, Utility Score, Latency |
| **PII-Bench** | PII Redaction & Pseudonymization | Intent & query-aware selective masking (retains task-critical PII; masks extraneous PII) | Query-aware Leakage, Downstream Utility |
| **PrivacyLens** | Contextual Integrity (CI) Audit | Helen Nissenbaum's 5-parameter normative rule matrix (Sender, Recipient, Subject, Attribute, Principle) | Normative Decision Accuracy (ALLOW/DENY), Unsafe ALLOW Rate |
| **ConfAIde** | Contextual Privacy Risk Reasoning | Multi-factor quantitative risk scoring ($S_d, S_e, T_r, P_n$) mapped to standard schema risk tiers | Normative Decision Accuracy, Risk Distribution |

> [!NOTE]
> **Fair Comparison Guarantee**: We separate detector evaluation from method evaluation. Transformation methods (`PIIvot`, `PRvL`, `PII-Bench`) are evaluated on residual leakage and text utility preservation, whereas Contextual Integrity methods (`PrivacyLens`, `ConfAIde`) are evaluated on normative decision accuracy.

---

## 🔍 Multi-Stage Detection Pipeline

1. **Deterministic Regex Layer**: High-precision pattern matcher for structured PII: `EMAIL`, `PHONE_NUM`, `URL_PERSONAL`, `USERNAME`.
2. **Contextual Sequence Tagger**: Heuristic rule-based token sequence matcher for proper names (`NAME_STUDENT`) and street structures (`STREET_ADDRESS`). *(Transparently labeled: rule-based capitalization and honorific heuristics, not a trained deep neural network).*
3. **Optional LLM Layer**: Zero-shot and contextual entity extraction powered by Google Gemini API.
4. **Calibration & Deduplication**: Resolves overlapping spans with priority routing and applies replacements in reverse offset order to prevent index drift.

---

## 📂 Project Structure

```text
privacyguard/
├── app.py                      # Main Overview and system status page
├── ui_utils.py                 # Cohesive research-grade design system & UI components
├── run_experiment.py           # Benchmark experiment runner with reproducible sampling
├── pytest.ini                  # Pytest configuration
├── requirements.txt            # Python dependencies
├── IMPLEMENTATION_STATUS.md    # Feature status and verification notes
├── RESEARCH_NOTES.md           # Research and architectural rationale
├── src/
│   ├── core/                   # Schemas, registry, data loader, and Gemini API client
│   │   ├── data_loader.py      # Centralized loader, schema validation, and sampling
│   │   ├── schemas.py          # Pydantic schemas (PrivacyCase, PIIEntity, MethodResult)
│   │   ├── registry.py         # Dynamic method registration
│   │   └── gemini_client.py    # Lightweight Google Gemini REST client
│   ├── detectors/              # Regex, NER, LLM, and Hybrid detectors
│   ├── methods/                # PIIvot, PRvL, PII-Bench, PrivacyLens, ConfAIde pipelines
│   └── evaluation/             # Evaluator metrics, boundary leakage, and utility scoring
├── pages/
│   ├── 1_Interactive_Test.py   # Live single-case tester with entity span visualizer
│   ├── 2_Compare_Methods.py    # Side-by-side 5-method comparative inspector
│   ├── 3_Run_Experiment.py     # Interactive experiment runner UI with live progress
│   └── 4_Results_Dashboard.py  # 7-tab comprehensive research analytics & Case Explorer
├── dataset/                    # 4,434 verified cases and annotations
│   ├── evaluation_cases.csv    # Source cases across 11 professional domains
│   ├── annotated_cases.json    # 22,226 ground-truth entity annotations with exact offsets
│   ├── dataset_schema.json     # JSON-Schema specification
│   └── validate_dataset.py     # Non-destructive integrity validation script
├── data/results/               # Empirical evaluation artifacts
│   ├── latest_run.json         # Active structured benchmark artifact
│   ├── runs/                   # Timestamped historical experiment runs
│   ├── metrics.json            # Backward-compatible summary metrics
│   └── raw_results.json        # Backward-compatible per-case records
└── tests/                      # Automated test suite (18 unit and integration tests)
```

---

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/SheikhMahmudulHassanSabir/PrivacyGuard.git
cd PrivacyGuard
```

### 2. Set Up Virtual Environment
```bash
# Using Python 3.10+
python -m venv .venv

# Windows (PowerShell):
.venv\Scripts\Activate.ps1

# Linux / macOS:
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables (Optional)
To enable the optional Google Gemini LLM layer:
```bash
cp .env.example .env
```
Inside `.env`:
```ini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash
```
*(Get a key from [Google AI Studio](https://aistudio.google.com/app/apikey). The app operates fully locally without an API key using the default Regex + Contextual tagger).*

---

## 🎯 Usage

### 1. Launch the Streamlit Research Web App
Always run from within the `privacyguard` directory:
```bash
streamlit run app.py
```
*(Or from the parent directory: `streamlit run privacyguard/app.py`)*

### 2. Execute Benchmark Experiments via CLI
Run reproducible benchmark evaluations across the verified dataset:
```bash
# Quick evaluation (50 cases, stratified sampling with seed 42)
python run_experiment.py --sample-size 50 --seed 42

# Full evaluation across all 4,434 cases
python run_experiment.py --full
```

### 3. Validate Dataset Integrity
Run the non-destructive dataset integrity checker:
```bash
python dataset/validate_dataset.py
```

### 4. Run Automated Test Suite
Execute the full pytest suite (18 unit & integration tests):
```bash
pytest tests/ -v
```

---

## 📊 Evaluation Methodology & Metrics

PrivacyGuard implements an honest, multi-dimensional evaluation protocol:

1. **PII Detection Performance**:
   - Evaluated specifically on the detector layer.
   - Measures exact entity-level matching: `text[start:end]` normalized match + entity category match.
   - Computes Precision, Recall, F1-Score, and Support overall and broken down by entity category (`EMAIL`, `PHONE_NUM`, `NAME_STUDENT`, `STREET_ADDRESS`, `USERNAME`, `URL_PERSONAL`).

2. **Residual Privacy Leakage Rate**:
   - Measures the percentage of ground-truth sensitive entities remaining exposed in protected text.
   - Evaluated with word-boundary awareness (`\b{entity}\b`) to eliminate substring false alarms on short names.

3. **Downstream Utility Score**:
   - Multi-metric composite:
     - 60% non-PII token preservation rate.
     - 40% token Jaccard similarity.
     - Monitored length ratio to ensure grammatical integrity.

4. **Contextual Integrity Decision Quality**:
   - Applicable to `PrivacyLens` and `ConfAIde`.
   - Normative decision accuracy (ALLOW/DENY agreement with social privacy norms).
   - Unsafe ALLOW rate (high/critical risk cases incorrectly allowed to untrusted recipients).
   - Unnecessary DENY rate (legitimate context-authorized flows incorrectly blocked).

---

## 🔒 Security & Privacy Practices

- **Zero Secret Exposure**: `.env` is strictly ignored by `.gitignore`. No private keys or secrets are stored in Git.
- **Local-First Execution**: All core detectors and evaluation pipelines run entirely on local CPU with zero external API calls by default.
- **Controlled LLM Transmission**: External API calls occur only when the user explicitly enables the LLM toggle and provides their own Gemini API key.

---

## 📜 License

This project is licensed under the MIT License.
