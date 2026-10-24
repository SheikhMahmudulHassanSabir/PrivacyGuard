# PrivacyGuard: Context-Aware Privacy-Preserving LLM Framework

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.28+-FF4B4B.svg)](https://streamlit.io/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-API%20Enabled-4285F4.svg)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**PrivacyGuard** is an advanced, context-aware privacy preservation framework designed for Large Language Model (LLM) pipelines. It integrates a multi-layered **Hybrid Detector** (Regex + NER + Google Gemini LLM) with five state-of-the-art privacy-preserving transformation and audit methods.

---

## 🚀 Key Features

### 1. Multi-Stage Hybrid PII Detector
- **RegexDetector**: Deterministic patterns for structured entities (`EMAIL`, `PHONE_NUM`, `URL_PERSONAL`, `USERNAME`, `STREET_ADDRESS`, `NAME_STUDENT`).
- **NERDetector**: Contextual sequence tagger targeting proper names and addresses.
- **LLMDetector**: Zero-shot and few-shot contextual entity extractor powered by Google Gemini API.
- **Hybrid Coordination**: Multi-stage span deduplication, priority conflict resolution, and confidence calibration.

### 2. Five Privacy-Preserving Methods (Non-Mock)
1. **PIIvot**: Context-preserving synthetic pseudonymization with consistent session surrogate mapping.
2. **PRvL**: Deterministic symbolic canonical logic variables (e.g., `<PERSON_1>`, `<EMAIL_1>`) with first-order constraint verification.
3. **PII-Bench**: Query & task-aware selective masking (preserves query-relevant PII for downstream utility while masking non-essential sensitive attributes).
4. **PrivacyLens**: Helen Nissenbaum's Contextual Integrity 5-parameter normative audit (*Sender, Recipient, Subject, Attribute, Transmission Principle*).
5. **ConfAIde**: Multi-factor contextual privacy risk reasoning across domain sensitivity, entity exposure, recipient trust, and purpose necessity.

### 3. Interactive Web UI & Dashboard
- **Interactive Test**: Test text in real time across Hybrid, Regex, NER, and LLM modes with visual entity span inspectors.
- **Comparative Analysis**: Compare all five privacy protection methods side-by-side on identical input prompts.
- **Results Dashboard**: Interactive visualization of empirical benchmarks (Precision, Recall, F1, Leakage Rate, Privacy-Utility trade-off scatter, and Radar diagrams).

---

## 📂 Project Structure

```text
privacyguard/
├── app.py                      # Main Streamlit web application
├── ui_utils.py                 # Streamlit UI helpers and styling
├── run_experiment.py           # Benchmark evaluation CLI
├── pytest.ini                  # Pytest configuration
├── requirements.txt            # Python dependencies
├── IMPLEMENTATION_STATUS.md    # Detailed feature implementation checklist
├── RESEARCH_NOTES.md           # Research and architectural rationale
├── src/
│   ├── core/                   # Schemas, config, and Gemini API client
│   ├── detectors/              # Regex, NER, LLM, and Hybrid detectors
│   ├── methods/                # PIIvot, PRvL, PII-Bench, PrivacyLens, ConfAIde
│   └── evaluation/             # Evaluator metrics and scoring engine
├── pages/
│   ├── 1_Interactive_Test.py   # Live PII detection & masking tester
│   ├── 2_Compare_Methods.py    # Side-by-side 5-method comparison
│   └── 5_Results_Dashboard.py  # Benchmark metrics & charts
├── dataset/                    # Evaluation datasets & test cases
├── data/                       # Empirical evaluation results & caches
└── tests/                      # Automated pytest unit test suite
```

---

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/SheikhMahmudulHassanSabir/PrivacyGuard.git
cd PrivacyGuard
```

### 2. Create and Activate Virtual Environment
```bash
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

### 4. Configure Environment Variables
Copy `.env.example` to `.env` and add your Google Gemini API key:
```bash
cp .env.example .env
```
Inside `.env`:
```ini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash
```
*(Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey))*

---

## 🎯 Usage

### Run the Streamlit Web Application
```bash
streamlit run app.py
```

### Run Benchmark Experiments
```bash
python run_experiment.py --sample-size 50
```

### Run Automated Tests
```bash
pytest tests/ -v
```

---

## 📊 Evaluation Metrics

PrivacyGuard evaluates methods on empirical test cases using:
- **PII Precision, Recall, and F1-Score**: Detection accuracy against ground truth annotations.
- **Leakage Rate**: Percentage of sensitive entities left unprotected.
- **Downstream Utility Score**: Preservation of semantic meaning and grammatical coherence.
- **Context-Aware Risk Tiering**: Risk classification under contextual integrity principles.

---

## 📜 License

This project is licensed under the MIT License.
