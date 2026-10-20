import streamlit as st
import uuid
import os
import sys
import pandas as pd

# Ensure project root is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.core.schemas import PrivacyCase
from src.core.registry import MethodRegistry
from src.detectors.hybrid_detector import HybridDetector

# Register methods
import src.methods.piivot.pipeline
import src.methods.prvl.pipeline
import src.methods.pii_bench.pipeline
import src.methods.privacylens.pipeline
import src.methods.confaide.pipeline

try:
    from ui_utils import inject_custom_css
    inject_custom_css()
except Exception:
    pass

st.set_page_config(page_title="Compare Methods - PrivacyGuard", page_icon="⚖️", layout="wide")

st.title("⚖️ Side-by-Side Method Comparison")
st.markdown("Compare how **all 5 privacy protection methods** respond to the exact same input case.")

# Input Form
with st.form("compare_methods_form"):
    context = st.text_area(
        "Source Text",
        "Patient Aaliyah Popova has a history of respiratory illness. Contact at aaliyah.popova@aol.edu or (95) 94215-7906. Studio is at 97 Lincoln Street.",
        height=100
    )
    col1, col2 = st.columns(2)
    with col1:
        query = st.text_input("Query (e.g. 'What is the email address?')", value="What is Aaliyah's email?")
        recipient = st.selectbox("Recipient", ["doctor", "teacher", "employer", "marketing", "stranger", "unknown"])
    with col2:
        purpose = st.selectbox("Purpose", ["treatment", "academic_evaluation", "emergency", "advertising", "curiosity", "unknown"])
        detector_mode = st.radio("Detector Mode", ["Hybrid (Regex + NER)", "Regex Only", "NER Only"], horizontal=True)

    run_btn = st.form_submit_button("⚖️ Compare All 5 Methods")

if run_btn:
    enable_regex = "Regex" in detector_mode or "Hybrid" in detector_mode
    enable_ner = "NER" in detector_mode or "Hybrid" in detector_mode
    detector = HybridDetector(enable_regex=enable_regex, enable_ner=enable_ner, enable_llm=False)

    case = PrivacyCase(
        case_id=str(uuid.uuid4()),
        context=context,
        query=query,
        recipient=recipient,
        purpose=purpose
    )

    results_data = []

    for method_name in MethodRegistry.list_methods():
        method_cls = MethodRegistry.get_method(method_name)
        method_instance = method_cls()
        if hasattr(method_instance, 'detector'):
            method_instance.detector = detector
        if hasattr(method_instance, 'use_llm'):
            method_instance.use_llm = False

        res = method_instance.run(case)

        # Output representation
        if res.protected_text and res.privacy_decision:
            output_summary = f"Decision: {res.privacy_decision}\nText: {res.protected_text}"
        elif res.protected_text:
            output_summary = res.protected_text
        elif res.privacy_decision:
            output_summary = f"Decision: {res.privacy_decision}"
        else:
            output_summary = "N/A"

        results_data.append({
            "Method": method_name.upper(),
            "Privacy Decision": res.privacy_decision or "N/A",
            "Detected PII": len(res.detected_entities),
            "Masked PII": len(res.masked_entities),
            "Kept PII": len(res.kept_entities),
            "Protected Output": output_summary,
            "Latency (ms)": round(res.latency_ms, 2),
            "Reasoning": res.reasoning
        })

    df_compare = pd.DataFrame(results_data)

    st.subheader("Comparison Summary Table")
    st.dataframe(df_compare[["Method", "Privacy Decision", "Detected PII", "Masked PII", "Kept PII", "Latency (ms)"]], use_container_width=True)

    st.subheader("Detailed Method Outputs & Trade-offs")
    for r in results_data:
        with st.expander(f"🔹 {r['Method']} Breakdown"):
            st.markdown(f"**Protected Text / Decision:**")
            st.code(r["Protected Output"], language="markdown")
            st.markdown(f"**Reasoning:** {r['Reasoning']}")
            st.caption(f"Latency: {r['Latency (ms)']} ms | Detected: {r['Detected PII']} | Masked: {r['Masked PII']} | Kept: {r['Kept PII']}")
