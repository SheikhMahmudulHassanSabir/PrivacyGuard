"""
PrivacyGuard Results Dashboard & Research Analytics

Displays authentic empirical evaluation results across:
1. Executive Summary & Fair Applicability Comparison
2. PII Detection Performance (Overall & Per-Category)
3. Privacy & Leakage Analysis (Inspectable Leaks)
4. Utility & Trade-off Analysis (Scatter Plot & Multi-Metric Fidelity)
5. Contextual Integrity & Risk Analysis (ALLOW/DENY, Unsafe ALLOW & Unnecessary DENY)
6. Interactive Case Explorer (Granular Before/After Inspection)
7. Experiment Metadata & CSV/JSON Data Export
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import json
import os
import sys
import glob

current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from ui_utils import (
    inject_custom_css,
    render_header,
    render_kpi_card,
    render_method_badge,
    render_decision_badge,
    render_risk_badge,
    render_dataset_banner
)

st.set_page_config(page_title="Results Dashboard - PrivacyGuard", page_icon="📊", layout="wide")
inject_custom_css()

results_dir = os.path.join(project_root, "data", "results")
runs_dir = os.path.join(results_dir, "runs")
latest_run_path = os.path.join(results_dir, "latest_run.json")

# 1. Load Experiment Data
@st.cache_data
def load_experiment_data(file_path: str, mtime: float):
    if not os.path.exists(file_path):
        return None
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        st.error(f"Failed to read experiment artifact: {e}")
        return None

# Check for available runs to allow switching
available_run_files = sorted(glob.glob(os.path.join(runs_dir, "*.json")), reverse=True)
run_choices = {}
if os.path.exists(latest_run_path):
    run_choices["Latest Benchmark Run (latest_run.json)"] = latest_run_path
for rf in available_run_files:
    fname = os.path.basename(rf)
    run_choices[f"Run: {fname}"] = rf

# Header with run selector and navigation
with st.sidebar:
    st.header("🎯 Experiment Run Selector")
    if run_choices:
        selected_run_label = st.selectbox("Active Benchmark Run", list(run_choices.keys()))
        active_file_path = run_choices[selected_run_label]
    else:
        active_file_path = latest_run_path

    if st.button("🔄 Refresh Data", use_container_width=True):
        st.cache_data.clear()
        st.rerun()

    st.markdown("---")
    st.page_link("pages/3_Run_Experiment.py", label="🚀 Launch New Experiment", icon="🚀")
    st.page_link("pages/1_Interactive_Test.py", label="🧪 Test Single Case", icon="🧪")

# Load active run
file_mtime = os.path.getmtime(active_file_path) if os.path.exists(active_file_path) else 0.0
exp_data = load_experiment_data(active_file_path, file_mtime)

if not exp_data or "run_metadata" not in exp_data:
    render_header("📊 Research Results Dashboard", "Comprehensive empirical benchmark analytics")
    st.warning("⚠️ No benchmark experiment results found. Please execute an experiment first.")
    col_a, col_b = st.columns(2)
    with col_a:
        st.info("You can run a benchmark directly from the UI:")
        st.page_link("pages/3_Run_Experiment.py", label="👉 Open Experiment Runner", icon="🚀")
    with col_b:
        st.info("Or run via terminal CLI:")
        st.code("python run_experiment.py --sample-size 50", language="bash")
    st.stop()

# Extract run components
meta = exp_data.get("run_metadata", {})
val_rep = exp_data.get("dataset_validation", {})
det_bench = exp_data.get("detector_benchmark", {})
method_metrics = exp_data.get("method_metrics", [])
records = exp_data.get("per_record_results", [])
app_matrix = exp_data.get("applicability_matrix", {})
metric_defs = exp_data.get("metric_definitions", {})

# Render Dashboard Header
render_header(
    f"📊 Results Dashboard: {meta.get('run_id', 'Active Run')}",
    f"Evaluated on {meta.get('evaluated_sample_size', 0)} verified cases | Fingerprint: {meta.get('dataset_fingerprint', 'N/A')} | Completed: {meta.get('completion_time', '')[:19].replace('T', ' ')}",
    badge_text=f"Status: {meta.get('status', 'COMPLETED')}"
)

# 2. Executive Overview KPI Row
k1, k2, k3, k4, k5, k6 = st.columns(6)

with k1:
    render_kpi_card("Verified Cases", meta.get("evaluated_sample_size", 0), f"Seed: {meta.get('random_seed', 'N/A')}", "blue")

with k2:
    det_f1 = det_bench.get("overall", {}).get("f1", 0.0)
    render_kpi_card("Detector Baseline F1", f"{det_f1:.3f}", f"P: {det_bench.get('overall', {}).get('precision', 0):.2f} | R: {det_bench.get('overall', {}).get('recall', 0):.2f}", "green", "Detector-level accuracy across all cases")

with k3:
    # Lowest leakage among transformation methods
    trans_metrics = [m for m in method_metrics if m.get("leakage_rate") is not None]
    min_leak = min([m["leakage_rate"] for m in trans_metrics]) if trans_metrics else 0.0
    render_kpi_card("Min Residual Leakage", f"{min_leak*100:.1f}%", "Lower is better (Target: 0%)", "teal", "Best leakage resistance among redaction methods")

with k4:
    # Max utility among transformation methods
    max_util = max([m["utility_score"] for m in trans_metrics]) if trans_metrics else 0.0
    render_kpi_card("Max Utility Score", f"{max_util:.3f}", "Higher is better (Target: 1.0)", "indigo", "Textual and structural preservation")

with k5:
    # Best CI decision accuracy
    ci_metrics = [m for m in method_metrics if m.get("context_accuracy") is not None]
    max_ci = max([m["context_accuracy"] for m in ci_metrics]) if ci_metrics else 0.0
    render_kpi_card("Best CI Decision Acc", f"{max_ci*100:.1f}%", "Normative compliance rate", "amber", "Agreement with expected contextual integrity decisions")

with k6:
    mean_lat = np.mean([m.get("mean_latency_ms", 0.0) for m in method_metrics]) if method_metrics else 0.0
    render_kpi_card("Mean Latency", f"{mean_lat:.2f} ms", f"{len(method_metrics)} methods timed", "rose")

# 3. Main Dashboard Analytical Tabs
tab_summary, tab_detection, tab_leakage, tab_utility, tab_contextual, tab_explorer, tab_export = st.tabs([
    "📈 Executive Summary & Comparison",
    "🎯 PII Detection Performance",
    "🔒 Privacy & Leakage Analysis",
    "⚡ Utility & Trade-off Analysis",
    "🛡️ Contextual Privacy & Risk",
    "🔍 Interactive Case Explorer",
    "📋 Experiment Metadata & Export"
])

# -------------------------------------------------------------
# TAB 1: EXECUTIVE SUMMARY & COMPARISON
# -------------------------------------------------------------
with tab_summary:
    st.subheader("⚖️ Fair Multi-Method Comparison Table")
    st.markdown("""
    This table presents authentic, non-fabricated metrics adhering strictly to the **Metrics Applicability Matrix**. 
    *Notice: Leakage and Utility apply to Text Transformation methods, while Context Accuracy applies to Normative Auditing methods.*
    """)

    table_rows = []
    name_display = {
        "piivot": "PIIvot (Pseudonymization)",
        "prvl": "PRvL (Logic Tokenization)",
        "pii_bench": "PII-Bench (Task Selective)",
        "privacylens": "PrivacyLens (CI Audit)",
        "confaide": "ConfAIde (Risk Scoring)"
    }

    for m in method_metrics:
        table_rows.append({
            "Method": name_display.get(m["method_name"].lower(), m["method_name"].upper()),
            "Category": m.get("category", "N/A"),
            "Detector F1": f"{m.get('detector_f1', det_f1):.3f}",
            "Leakage Rate": f"{m['leakage_rate']:.3f}" if m.get("leakage_rate") is not None else "N/A (Decision)",
            "Cases with Leak (%)": f"{m['cases_with_leakage_pct']:.1f}%" if m.get("cases_with_leakage_pct") is not None else "N/A",
            "Utility Score": f"{m['utility_score']:.3f}" if m.get("utility_score") is not None else "N/A (Decision)",
            "Context Decision Acc": f"{m['context_accuracy']:.3f}" if m.get("context_accuracy") is not None else "N/A (Transforms text)",
            "Median Latency (ms)": f"{m.get('median_latency_ms', 0.0):.2f}",
            "Success Rate": f"{(1.0 - m.get('failure_rate', 0.0))*100:.1f}%"
        })

    df_summary = pd.DataFrame(table_rows)
    st.dataframe(df_summary, use_container_width=True, hide_index=True)

    st.markdown("#### 📖 Scientific Interpretation Guide:")
    col_i1, col_i2 = st.columns(2)
    with col_i1:
        st.markdown("""
        - **PIIvot & PRvL (Redaction/Pseudonymization)**:
          Achieve high utility scores (>0.98) by maintaining sentence structure. Their residual leakage corresponds directly to detector false negatives (un-detected entities).
        - **PII-Bench (Query-Aware Masking)**:
          Retains query-relevant PII deliberately to fulfill downstream questions (e.g., keeping email for email inquiries).
        """)
    with col_i2:
        st.markdown("""
        - **PrivacyLens & ConfAIde (Contextual Integrity Auditing)**:
          Do not alter text; they audit whether the information transmission should be **ALLOWED** or **DENIED** based on social norms, recipient trust, and purpose legitimacy.
        - **Fair Evaluation Guarantee**: We do not falsely penalize decision methods for not redacting text.
        """)

# -------------------------------------------------------------
# TAB 2: PII DETECTION PERFORMANCE
# -------------------------------------------------------------
with tab_detection:
    st.subheader("🎯 Detector Baseline Evaluation")
    st.markdown("""
    Evaluates the **Multi-Stage Hybrid Detector** (Regex + Contextual Sequence Tagger) against verified ground-truth annotations across all sample records.
    """)

    ov = det_bench.get("overall", {})
    cd1, cd2, cd3, cd4 = st.columns(4)
    with cd1:
        st.metric("Overall Precision", f"{ov.get('precision', 0):.3f}", help="True Positives / (TP + FP)")
    with cd2:
        st.metric("Overall Recall", f"{ov.get('recall', 0):.3f}", help="True Positives / (TP + FN)")
    with cd3:
        st.metric("Overall F1-Score", f"{ov.get('f1', 0):.3f}", help="Harmonic mean of precision and recall")
    with cd4:
        st.metric("Total GT Entities", ov.get("total_ground_truth_entities", 0), help="Total ground truth entities evaluated")

    st.markdown("---")
    st.subheader("Performance Breakdown by PII Category")
    
    by_cat = det_bench.get("by_category", {})
    if by_cat:
        cat_rows = []
        for cat, scores in by_cat.items():
            cat_rows.append({
                "PII Category": cat,
                "Precision": scores.get("precision", 0.0),
                "Recall": scores.get("recall", 0.0),
                "F1 Score": scores.get("f1", 0.0),
                "True Positives (TP)": scores.get("tp", 0),
                "False Positives (FP)": scores.get("fp", 0),
                "False Negatives (FN)": scores.get("fn", 0),
                "Support Count": scores.get("support", 0)
            })
        df_cat = pd.DataFrame(cat_rows)
        
        col_c1, col_c2 = st.columns([3, 2])
        with col_c1:
            fig_cat = px.bar(
                df_cat,
                x="PII Category",
                y=["Precision", "Recall", "F1 Score"],
                barmode="group",
                title="Detector Performance across PII Categories",
                color_discrete_sequence=["#3B82F6", "#10B981", "#6366F1"],
                template="plotly_white"
            )
            fig_cat.update_layout(yaxis=dict(range=[0, 1.05]))
            st.plotly_chart(fig_cat, use_container_width=True)
            
        with col_c2:
            st.dataframe(df_cat, use_container_width=True, hide_index=True)
            st.caption("ℹ️ Structured patterns (EMAIL) achieve near-perfect recall (1.00), while contextual proper names (NAME_STUDENT) exhibit lower recall without LLM/neural assistance.")

# -------------------------------------------------------------
# TAB 3: PRIVACY & LEAKAGE ANALYSIS
# -------------------------------------------------------------
with tab_leakage:
    st.subheader("🔒 Residual Privacy Leakage Analysis")
    st.markdown("""
    Measures whether ground-truth PII entities remain exposed in the protected outputs of transformation methods.
    Evaluated with word-boundary awareness to avoid substring false alarms.
    """)

    trans_methods = [m for m in method_metrics if m.get("leakage_rate") is not None]
    if trans_methods:
        df_leak = pd.DataFrame([
            {
                "Method": name_display.get(m["method_name"].lower(), m["method_name"].upper()),
                "Leakage Rate": m["leakage_rate"],
                "Cases with Leak (%)": m["cases_with_leakage_pct"],
                "Total Leaked Entities": m["total_leaked_entities"]
            }
            for m in trans_methods
        ])

        cl1, cl2 = st.columns(2)
        with cl1:
            fig_leak = px.bar(
                df_leak,
                x="Method",
                y="Leakage Rate",
                color="Method",
                title="Residual Leakage Rate (Lower is Better)",
                color_discrete_sequence=["#8B5CF6", "#3B82F6", "#F59E0B"],
                template="plotly_white"
            )
            fig_leak.update_layout(yaxis=dict(range=[0, 1.0]))
            st.plotly_chart(fig_leak, use_container_width=True)

        with cl2:
            fig_cases = px.bar(
                df_leak,
                x="Method",
                y="Cases with Leak (%)",
                color="Method",
                title="Percentage of Cases with >=1 Leaked Entity",
                color_discrete_sequence=["#8B5CF6", "#3B82F6", "#F59E0B"],
                template="plotly_white"
            )
            fig_cases.update_layout(yaxis=dict(range=[0, 100]))
            st.plotly_chart(fig_cases, use_container_width=True)

        st.subheader("🔍 Inspectable Leaked Entity Registry")
        st.caption("Records where entities leaked into protected text due to detector misses or task-preservation:")
        
        leaked_records = []
        for r in records:
            for m_name in ["piivot", "prvl", "pii_bench"]:
                m_res = r["methods"].get(m_name, {})
                leaks = m_res.get("leaked_entities", [])
                for l in leaks:
                    leaked_records.append({
                        "Case ID": r["case_id"][:12] + "...",
                        "Method": m_name.upper(),
                        "Leaked Text": l.get("text"),
                        "PII Type": l.get("type"),
                        "Detection Reason": "Detector False Negative" if m_name != "pii_bench" else "Query Relevance or Detector Miss"
                    })
        if leaked_records:
            st.dataframe(pd.DataFrame(leaked_records[:25]), use_container_width=True, hide_index=True)
            st.caption(f"Showing sample of {min(25, len(leaked_records))} leaked instances out of {len(leaked_records)} total.")
        else:
            st.success("🎉 Zero leakage detected across evaluated records!")

# -------------------------------------------------------------
# TAB 4: UTILITY & PERFORMANCE
# -------------------------------------------------------------
with tab_utility:
    st.subheader("⚡ Privacy–Utility Trade-Off Analysis")
    st.markdown("""
    Analyzes the balance between **Privacy Preservation** (1.0 - Leakage Rate) and **Downstream Utility** (Semantic & Structural Text Retention).
    *Ideal models lie in the Top-Left quadrant (High Utility, Low Leakage).*
    """)

    if trans_methods:
        df_tradeoff = pd.DataFrame([
            {
                "Method": name_display.get(m["method_name"].lower(), m["method_name"].upper()),
                "Leakage Rate": m["leakage_rate"],
                "Utility Score": m["utility_score"],
                "Median Latency (ms)": m["median_latency_ms"]
            }
            for m in trans_methods
        ])

        cu1, cu2 = st.columns([3, 2])
        with cu1:
            fig_scatter = px.scatter(
                df_tradeoff,
                x="Leakage Rate",
                y="Utility Score",
                color="Method",
                size="Median Latency (ms)",
                text="Method",
                title="Privacy–Utility Scatter (Ideal = Top-Left)",
                template="plotly_white",
                color_discrete_sequence=["#8B5CF6", "#3B82F6", "#F59E0B"]
            )
            fig_scatter.update_traces(textposition="top center")
            fig_scatter.update_xaxes(autorange="reversed", range=[1.0, 0.0], title="Residual Leakage Rate (Reversed: Left is Better)")
            fig_scatter.update_yaxes(range=[0.8, 1.02], title="Downstream Utility Score (Higher is Better)")
            st.plotly_chart(fig_scatter, use_container_width=True)

        with cu2:
            st.markdown("#### Latency Comparison (ms per case)")
            lat_rows = [
                {"Method": name_display.get(m["method_name"].lower(), m["method_name"].upper()), "Latency (ms)": m["mean_latency_ms"]}
                for m in method_metrics
            ]
            fig_lat = px.bar(
                pd.DataFrame(lat_rows),
                x="Method",
                y="Latency (ms)",
                color="Method",
                template="plotly_white"
            )
            st.plotly_chart(fig_lat, use_container_width=True)

# -------------------------------------------------------------
# TAB 5: CONTEXTUAL PRIVACY & RISK
# -------------------------------------------------------------
with tab_contextual:
    st.subheader("🛡️ Contextual Integrity & Risk Evaluation")
    st.markdown("""
    Evaluates **PrivacyLens** (normative audit) and **ConfAIde** (multi-factor risk scoring) against social contextual norms and ground-truth decisions.
    """)

    ci_list = [m for m in method_metrics if m.get("context_accuracy") is not None]
    if ci_list:
        cp1, cp2, cp3 = st.columns(3)
        with cp1:
            best_ci = ci_list[0]
            st.metric("PrivacyLens Decision Accuracy", f"{best_ci.get('context_accuracy', 0)*100:.1f}%")
        with cp2:
            st.metric("Unsafe ALLOW Rate", f"{best_ci.get('unsafe_allow_rate', 0)*100:.1f}%", help="High risk cases wrongly allowed to untrusted recipients (Target: 0%)")
        with cp3:
            st.metric("Unnecessary DENY Rate", f"{best_ci.get('unnecessary_deny_rate', 0)*100:.1f}%", help="Legitimate flows wrongly blocked")

        st.markdown("---")
        # Decision Distribution
        col_d1, col_d2 = st.columns(2)
        with col_d1:
            st.subheader("Decision Breakdown (ALLOW vs DENY)")
            dec_dist = best_ci.get("decision_distribution", {})
            if dec_dist:
                fig_pie = px.pie(
                    names=list(dec_dist.keys()),
                    values=list(dec_dist.values()),
                    title="PrivacyLens Decision Distribution",
                    color=list(dec_dist.keys()),
                    color_discrete_map={"ALLOW": "#10B981", "DENY": "#EF4444"},
                    template="plotly_white"
                )
                st.plotly_chart(fig_pie, use_container_width=True)

        with col_d2:
            st.subheader("ConfAIde Risk Scoring Model")
            st.markdown("""
            ConfAIde quantifies risk across four explicit parameters:
            - **Domain Sensitivity ($S_d$)**: Healthcare (0.95), Finance (0.90), Education (0.60), Tech (0.35).
            - **Entity Exposure ($S_e$)**: Composite identity disclosure (0.90), direct contact (0.70).
            - **Recipient Trust ($T_r$)**: Doctor/Attorney (0.20), Stranger/Advertiser (0.90).
            - **Purpose Necessity ($P_n$)**: Treatment/Emergency (0.20), Advertising/Commercial (0.90).
            
            Risk Score Formula:
            $$\\text{Risk} = 0.35 S_d + 0.35 S_e + 0.15 T_r + 0.15 P_n$$
            """)

# -------------------------------------------------------------
# TAB 6: INTERACTIVE CASE EXPLORER
# -------------------------------------------------------------
with tab_explorer:
    st.subheader("🔍 Interactive Case Explorer")
    st.markdown("Select any real benchmark case to compare inputs, ground-truth labels, and protected outputs across all 5 methods.")

    if records:
        case_options = {
            f"Case {idx+1}: [{r.get('expected_decision', 'N/A')}] {r['context'][:65]}... (ID: {r['case_id'][:8]})": idx
            for idx, r in enumerate(records)
        }
        selected_label = st.selectbox("Select Case to Inspect", list(case_options.keys()))
        selected_idx = case_options[selected_label]
        c_record = records[selected_idx]

        st.markdown("---")
        # Case Context Cards
        cc1, cc2, cc3, cc4 = st.columns(4)
        with cc1:
            st.markdown(f"**Expected Decision:** {render_decision_badge(c_record.get('expected_decision'))}", unsafe_allow_html=True)
        with cc2:
            st.markdown(f"**Recipient:** `{c_record.get('recipient', 'N/A')}`")
        with cc3:
            st.markdown(f"**Purpose:** `{c_record.get('purpose', 'N/A')}`")
        with cc4:
            st.markdown(f"**Ground-Truth Entities:** `{len(c_record.get('ground_truth_entities', []))}`")

        st.markdown("**Original Source Context:**")
        st.info(c_record["context"])

        if c_record.get("query"):
            st.markdown(f"**Downstream Query:** *\"{c_record['query']}\"*")

        if c_record.get("ground_truth_entities"):
            st.markdown("**Ground-Truth PII Entities:**")
            gt_df = pd.DataFrame(c_record["ground_truth_entities"])
            st.dataframe(gt_df, use_container_width=True, hide_index=True)

        st.markdown("#### Method-by-Method Transformation Comparison:")
        m_tabs = st.tabs(["PIIvot", "PRvL", "PII-Bench", "PrivacyLens", "ConfAIde"])

        for m_name, m_tab in zip(["piivot", "prvl", "pii_bench", "privacylens", "confaide"], m_tabs):
            with m_tab:
                m_data = c_record["methods"].get(m_name, {})
                if not m_data:
                    st.info(f"No execution data for {m_name}")
                else:
                    mc1, mc2 = st.columns([3, 1])
                    with mc1:
                        if m_data.get("protected_text"):
                            st.markdown("**Protected Output:**")
                            st.code(m_data["protected_text"], language="markdown")
                        if m_data.get("privacy_decision"):
                            st.markdown(f"**Decision:** {render_decision_badge(m_data['privacy_decision'])}", unsafe_allow_html=True)
                        if m_data.get("reasoning"):
                            st.markdown(f"**Reasoning Proof:** *{m_data['reasoning']}*")

                    with mc2:
                        st.metric("Latency", f"{m_data.get('latency_ms', 0):.2f} ms")
                        if m_data.get("leakage_rate") is not None:
                            st.metric("Leakage Rate", f"{m_data['leakage_rate']*100:.1f}%")
                        if m_data.get("utility_score") is not None:
                            st.metric("Utility Score", f"{m_data['utility_score']:.3f}")

                    if m_data.get("leaked_entities"):
                        st.error(f"⚠️ Leaked Entities Detected: {[l['text'] for l in m_data['leaked_entities']]}")

# -------------------------------------------------------------
# TAB 7: EXPERIMENT METADATA & DATA EXPORT
# -------------------------------------------------------------
with tab_export:
    st.subheader("📋 Experiment Metadata & Data Export")
    
    col_e1, col_e2 = st.columns(2)
    with col_e1:
        st.markdown("#### Run Metadata")
        st.json(meta)

    with col_e2:
        st.markdown("#### Download Results")
        st.markdown("Export structured artifacts for academic reports or downstream analysis:")
        
        # 1. Download CSV of Method Comparison
        csv_data = df_summary.to_csv(index=False).encode('utf-8')
        st.download_button(
            label="📥 Download Comparison Metrics (CSV)",
            data=csv_data,
            file_name=f"privacyguard_metrics_{meta.get('run_id', 'run')}.csv",
            mime="text/csv",
            use_container_width=True
        )

        # 2. Download Full Experiment JSON
        json_str = json.dumps(exp_data, indent=2).encode('utf-8')
        st.download_button(
            label="📥 Download Full Experiment Artifacts (JSON)",
            data=json_str,
            file_name=f"privacyguard_full_run_{meta.get('run_id', 'run')}.json",
            mime="application/json",
            use_container_width=True
        )

        st.markdown("#### Dataset Validation Snapshot")
        st.json(val_rep)
