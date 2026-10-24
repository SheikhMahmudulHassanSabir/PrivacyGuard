"""
PrivacyGuard: Context-Aware PII Protection & Evaluation Framework
Overview & System Status
"""

import streamlit as st
import os
import sys
import json

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from ui_utils import (
    inject_custom_css,
    render_header,
    render_kpi_card,
    render_dataset_banner,
    render_method_badge
)
from src.core.data_loader import validate_dataset_integrity

st.set_page_config(
    page_title="PrivacyGuard - Overview",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)
inject_custom_css()

render_header(
    "🛡️ PrivacyGuard Framework",
    "Context-Aware Personally Identifiable Information (PII) Protection & Comparative Research Benchmark",
    badge_text="v1.2 Research Edition"
)

# 1. Dataset Status Banner
dataset_dir = os.path.join(current_dir, "dataset")
val_report = validate_dataset_integrity(dataset_dir)
render_dataset_banner(val_report)

# 2. Latest Experiment Run Status
results_dir = os.path.join(current_dir, "data", "results")
latest_run_path = os.path.join(results_dir, "latest_run.json")

latest_run_data = None
if os.path.exists(latest_run_path):
    try:
        with open(latest_run_path, "r", encoding="utf-8") as f:
            latest_run_data = json.load(f)
    except Exception:
        pass

col_run1, col_run2, col_run3, col_run4 = st.columns(4)

with col_run1:
    total_cases = val_report.get("total_csv_records", 0)
    render_kpi_card("Verified Dataset Cases", f"{total_cases:,}", "4,434 annotated cases across 11 domains", "teal")

with col_run2:
    if latest_run_data and "run_metadata" in latest_run_data:
        meta = latest_run_data["run_metadata"]
        render_kpi_card("Latest Benchmark Run", f"{meta['evaluated_sample_size']} Cases", f"Run ID: {meta['run_id'][:18]}...", "blue")
    else:
        render_kpi_card("Latest Benchmark Run", "Not Run Yet", "Execute run_experiment.py", "amber")

with col_run3:
    if latest_run_data and "detector_benchmark" in latest_run_data:
        det_f1 = latest_run_data["detector_benchmark"]["overall"]["f1"]
        det_p = latest_run_data["detector_benchmark"]["overall"]["precision"]
        render_kpi_card("Detector Baseline F1", f"{det_f1:.3f}", f"Precision: {det_p:.3f}", "green")
    else:
        render_kpi_card("Detector Baseline F1", "N/A", "Awaiting benchmark run", "blue")

with col_run4:
    if latest_run_data and "method_metrics" in latest_run_data:
        active_m = len(latest_run_data["method_metrics"])
        render_kpi_card("Evaluated Methods", f"{active_m} Paradigms", "All non-mock implementations", "indigo")
    else:
        render_kpi_card("Active Methods", "5 Paradigms", "Available in Registry", "indigo")

st.markdown("---")

# 3. System Architecture & Research Paradigms
col_left, col_right = st.columns([3, 2])

with col_left:
    st.subheader("🧩 The 5 Privacy Protection Paradigms")
    st.markdown("""
    PrivacyGuard investigates five distinct research-inspired approaches to PII protection and evaluation:
    """)

    st.markdown(f"""
    1. **{render_method_badge('piivot')} Context-Preserving Synthetic Pseudonymization**:
       Replaces detected PII entities with realistic synthetic surrogates (e.g. *Alex Morgan*, *user_104@synthetic-privacy.org*), maintaining grammatical fluency, casing, and semantic structure without leaking sensitive source data.

    2. **{render_method_badge('prvl')} Logic-Driven Symbolic Tokenization**:
       Replaces sensitive entities with deterministic canonical logic tokens (e.g. `<PERSON_1>`, `<EMAIL_1>`) paired with a First-Order Logic constraint proof to verify composite disclosure risk.

    3. **{render_method_badge('pii_bench')} Query & Task-Aware Selective Masking**:
       Inspects downstream task intent to selectively retain query-critical PII (e.g., preserving contact details when answering *"What is their email?"*) while strictly redacting extraneous personal attributes.

    4. **{render_method_badge('privacylens')} Helen Nissenbaum's Contextual Integrity (CI) Audit**:
       Audits information flows across 5 parameters (*Sender, Recipient, Subject, Attribute, Transmission Principle*) to render normative **ALLOW** or **DENY** privacy decisions.

    5. **{render_method_badge('confaide')} Multi-Factor Contextual Privacy Risk Reasoning**:
       Computes quantitative disclosure risk across Domain Sensitivity ($S_d$), Entity Exposure ($S_e$), Recipient Trust ($T_r$), and Purpose Necessity, mapping to standard schema risk tiers.
    """, unsafe_allow_html=True)

with col_right:
    st.subheader("🔍 Multi-Stage Detection Pipeline")
    st.markdown("""
    The detection layer coordinates three specialized components:

    - **Heuristic Regex Layer**: Deterministic pattern matching for structured entities: `EMAIL`, `PHONE_NUM`, `URL_PERSONAL`, `USERNAME`.
    - **Contextual Sequence Tagger**: Heuristic rule-based token sequence matcher for proper names (`NAME_STUDENT`) and street structures (`STREET_ADDRESS`). *(Note: Rule-based heuristics, not a trained neural model).*
    - **Optional LLM Layer**: Zero-shot contextual extractor powered by Google Gemini API.
    - **Span Deduplication & Calibration**: Resolves overlapping spans and orders replacements in reverse offset order to prevent index drift.
    """)

    st.info("💡 **Scientific Integrity Note**: PII detection accuracy is a property of the detector layer. In our evaluation, text transformation methods are evaluated on **Leakage Rate** and **Utility Preservation**, while Contextual Integrity methods are evaluated on **Normative Decision Accuracy**.")

st.markdown("---")

# 4. Navigation Guide
st.subheader("🧭 Application Navigation")
c1, c2, c3, c4 = st.columns(4)

with c1:
    st.markdown("#### 🧪 Interactive Test")
    st.markdown("Test single text inputs live across all 5 methods with granular entity span visualizers.")
    st.page_link("pages/1_Interactive_Test.py", label="Open Interactive Test", icon="🧪")

with c2:
    st.markdown("#### ⚖️ Compare Methods")
    st.markdown("Run all 5 methods side-by-side on the exact same input case with direct output comparisons.")
    st.page_link("pages/2_Compare_Methods.py", label="Open Comparison View", icon="⚖️")

with c3:
    st.markdown("#### 🚀 Run Experiment")
    st.markdown("Execute benchmark runs across configurable sample sizes with live progress tracking.")
    st.page_link("pages/3_Run_Experiment.py", label="Open Experiment Runner", icon="🚀")

with c4:
    st.markdown("#### 📊 Results Dashboard")
    st.markdown("Explore empirical benchmark metrics, leakage rates, utility curves, and the Case Explorer.")
    st.page_link("pages/4_Results_Dashboard.py", label="Open Results Dashboard", icon="📊")
