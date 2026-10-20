import streamlit as st
import uuid
import os
import sys

# Ensure project root is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.core.schemas import PrivacyCase
from src.core.registry import MethodRegistry
from src.detectors.hybrid_detector import HybridDetector
from src.core.gemini_client import GeminiClient

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

st.set_page_config(page_title="Interactive Test - PrivacyGuard", page_icon="🧪", layout="wide")

st.title("🧪 Interactive Privacy Protection Test")
st.markdown("Test single cases in real-time across **all 5 privacy protection methods** using the **Hybrid (Regex + NER + LLM)** detection pipeline.")

# Sidebar settings for Gemini API Key
with st.sidebar:
    st.header("⚙️ Detector Configuration")
    use_regex = st.checkbox("Enable Regex Detector", value=True, help="Deterministic pattern matcher for Email, Phone, URL, Username")
    use_ner = st.checkbox("Enable NER Detector", value=True, help="Contextual tagger for Names and Addresses")
    use_llm = st.checkbox("Enable LLM (Gemini) Detector", value=False, help="Zero-shot reasoning via Google Gemini API")
    
    gemini_key_input = st.text_input("Gemini API Key (optional, session-only)", value=st.session_state.get("session_gemini_key", ""), type="password")
    if gemini_key_input:
        st.session_state["session_gemini_key"] = gemini_key_input.strip()

    active_key = st.session_state.get("session_gemini_key") or os.getenv("GEMINI_API_KEY", "")
    session_gemini_client = GeminiClient(api_key=active_key or None)

st.subheader("Input Case Specification")
with st.form("interactive_test_form"):
    col1, col2 = st.columns([2, 1])
    
    with col1:
        default_text = "Rahul Sharma is a student. Reach him at rahul.sharma@gmail.com or call (95) 94215-7906. His studio is located at 97 Lincoln Street."
        context = st.text_area("Context / Source Text", value=default_text, height=120)
        query = st.text_input("Query (Optional - used by PII-Bench for task relevance)", value="What is Rahul's email address?")

    with col2:
        recipient = st.text_input("Recipient (Optional - used by PrivacyLens & ConfAIde)", value="doctor")
        purpose = st.text_input("Purpose (Optional - used by PrivacyLens & ConfAIde)", value="treatment")
        method_choice = st.selectbox("Select Method to Run", ["All Methods"] + MethodRegistry.list_methods())

    submitted = st.form_submit_button("🛡️ Run Privacy Protection")

if submitted:
    # Initialize detector based on sidebar selection and session client
    llm_det = LLMDetector(client=session_gemini_client)
    detector = HybridDetector(
        enable_regex=use_regex,
        enable_ner=use_ner,
        enable_llm=use_llm,
        llm_detector=llm_det
    )
    
    case = PrivacyCase(
        case_id=str(uuid.uuid4()),
        context=context,
        query=query,
        recipient=recipient,
        purpose=purpose
    )

    methods_to_run = MethodRegistry.list_methods() if method_choice == "All Methods" else [method_choice]
    
    st.markdown("---")
    st.header("Evaluation Results")

    for m_name in methods_to_run:
        method_cls = MethodRegistry.get_method(m_name)
        method_instance = method_cls()
        # Inject configured detector, client, and use_llm flag
        if hasattr(method_instance, 'detector'):
            method_instance.detector = detector
        if hasattr(method_instance, 'client'):
            method_instance.client = session_gemini_client
        if hasattr(method_instance, 'use_llm'):
            method_instance.use_llm = use_llm

        res = method_instance.run(case)

        with st.expander(f"📌 {m_name.upper()} Pipeline Result", expanded=True):
            col_a, col_b = st.columns([3, 1])
            
            with col_a:
                if res.protected_text:
                    st.markdown("**Protected Output Text:**")
                    st.code(res.protected_text, language="markdown")
                
                if res.privacy_decision:
                    badge_color = "🟢" if res.privacy_decision == "ALLOW" else "🔴"
                    st.markdown(f"**Privacy Decision:** {badge_color} `{res.privacy_decision}`")

                if res.reasoning:
                    st.info(f"**Reasoning:** {res.reasoning}")

            with col_b:
                st.metric("Execution Latency", f"{res.latency_ms:.2f} ms")
                st.metric("Entities Detected", len(res.detected_entities))
                st.metric("Entities Masked", len(res.masked_entities))
                if res.kept_entities:
                    st.metric("Entities Kept", len(res.kept_entities))

            if res.detected_entities:
                st.markdown("**Detected Entity Spans:**")
                entity_rows = [
                    {"Text": e.text, "Type": e.pii_type, "Span": f"[{e.start}:{e.end}]", "Confidence": e.confidence}
                    for e in res.detected_entities
                ]
                st.dataframe(entity_rows, use_container_width=True)
