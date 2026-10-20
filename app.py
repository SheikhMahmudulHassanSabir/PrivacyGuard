import streamlit as st
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from ui_utils import inject_custom_css
except ImportError:
    pass

st.set_page_config(page_title="PrivacyGuard", page_icon="🛡️")
try:
    inject_custom_css()
except NameError:
    pass
st.title("🛡️ PrivacyGuard")
st.subheader("Context-Aware PII Protection and Privacy Evaluation Framework")

st.markdown("""
Welcome to **PrivacyGuard**, an advanced research framework for evaluating context-aware Personally Identifiable Information (PII) protection across five distinct paradigms:

### 🧩 The 5 Privacy Protection Methods:
1. **PIIvot**: Context-preserving synthetic pseudonymization (replaces entities with grammatical synthetic surrogates, preserving sentence utility and eliminating leakage).
2. **PRvL**: Deterministic symbolic logic variable canonicalization (`<PERSON_1>`, `<EMAIL_1>`) with first-order constraint verification.
3. **PII-Bench**: Query & task-aware selective masking (retains task-critical PII needed to answer queries while redacting irrelevant PII).
4. **PrivacyLens**: Helen Nissenbaum's Contextual Integrity (CI) 5-parameter normative audit (Sender, Recipient, Subject, Attribute, Transmission Principle).
5. **ConfAIde**: Multi-factor contextual privacy risk reasoning across domain sensitivity, entity exposure, recipient trust, and purpose necessity.

---

### 🚀 Detection Pipeline: Hybrid (Regex + NER + LLM)
- **Regex Layer**: Deterministic pattern matching for `EMAIL`, `PHONE_NUM`, `URL_PERSONAL`, `USERNAME`.
- **NER Layer**: Contextual sequence tagger for `NAME_STUDENT` and `STREET_ADDRESS`.
- **LLM Layer**: Google Gemini API for contextual/zero-shot entity extraction and normative reasoning.
- **Fusion Engine**: Resolves overlapping spans and attributes confidence scores.

---

### 🧭 Navigation:
- **1. Interactive Test**: Test individual texts, queries, recipients, and purposes with granular breakdowns.
- **2. Compare Methods**: Run all five methods side-by-side on the exact same input case.
- **5. Results Dashboard**: Quantitative benchmarks, F1 vs Leakage, Privacy-Utility trade-off curves, and radar charts.
""")

st.info("To enable the optional LLM layer in the Hybrid detector, set your `GEMINI_API_KEY` in `privacyguard/.env` or in the sidebar of the Interactive Test page.")
