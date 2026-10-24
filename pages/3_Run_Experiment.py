"""
PrivacyGuard Benchmark Experiment Runner UI
Allows launching and monitoring reproducible benchmark runs across the verified dataset.
"""

import streamlit as st
import os
import sys
import json
import glob

current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from ui_utils import (
    inject_custom_css,
    render_header,
    render_kpi_card,
    render_dataset_banner,
    render_method_badge
)
from src.core.data_loader import validate_dataset_integrity
from run_experiment import run_experiment

st.set_page_config(page_title="Run Experiment - PrivacyGuard", page_icon="🚀", layout="wide")
inject_custom_css()

render_header(
    "🚀 Benchmark Experiment Runner",
    "Configure and execute reproducible comparative evaluations across all 5 privacy methods using verified dataset cases.",
    badge_text="Experimental Pipeline"
)

dataset_dir = os.path.join(project_root, "dataset")
val_report = validate_dataset_integrity(dataset_dir)
render_dataset_banner(val_report)

col_cfg, col_hist = st.columns([3, 2])

with col_cfg:
    st.subheader("⚙️ Experiment Configuration")

    with st.form("run_experiment_form"):
        col1, col2 = st.columns(2)

        with col1:
            sample_size = st.select_slider(
                "Evaluation Sample Size",
                options=[10, 25, 50, 100, 250, 500, "Full (4,434)"],
                value=50,
                help="Number of cases to sample across the dataset. 50 cases offers ideal balance of statistical significance and speed (<2s)."
            )
            random_seed = st.number_input(
                "Random Seed (Reproducibility)",
                min_value=0,
                max_value=999999,
                value=42,
                help="Fixed seed guarantees exact same cases and order across repeated runs."
            )

        with col2:
            stratify = st.checkbox(
                "Stratified Risk Sampling",
                value=True,
                help="Ensures balanced representation across CRITICAL, HIGH, MEDIUM, LOW, and NONE risk tiers."
            )
            st.markdown("**Methods to Evaluate:**")
            m_piivot = st.checkbox("PIIvot (Pseudonymization)", value=True)
            m_prvl = st.checkbox("PRvL (Logic Canonicalization)", value=True)
            m_pii_bench = st.checkbox("PII-Bench (Task Selective)", value=True)
            m_privacylens = st.checkbox("PrivacyLens (CI Audit)", value=True)
            m_confaide = st.checkbox("ConfAIde (Risk Scoring)", value=True)

        selected_methods = []
        if m_piivot: selected_methods.append("piivot")
        if m_prvl: selected_methods.append("prvl")
        if m_pii_bench: selected_methods.append("pii_bench")
        if m_privacylens: selected_methods.append("privacylens")
        if m_confaide: selected_methods.append("confaide")

        submit_btn = st.form_submit_button("🚀 Start Benchmark Experiment", type="primary")

    if submit_btn:
        if not selected_methods:
            st.error("Please select at least one method to evaluate.")
        else:
            actual_sample = 0 if sample_size == "Full (4,434)" else int(sample_size)

            progress_bar = st.progress(0.0)
            status_text = st.empty()

            def update_progress(val, msg):
                progress_bar.progress(val)
                status_text.info(msg)

            with st.spinner("Executing benchmark across selected methods..."):
                try:
                    exp_data = run_experiment(
                        sample_size=actual_sample,
                        random_seed=int(random_seed),
                        stratify=stratify,
                        selected_methods=selected_methods,
                        progress_callback=update_progress
                    )
                    status_text.success("✅ Benchmark experiment completed successfully!")
                    st.session_state["latest_experiment_run"] = exp_data

                    # Quick Summary Card
                    meta = exp_data["run_metadata"]
                    st.markdown("---")
                    st.subheader("🎉 Benchmark Run Summary")
                    k1, k2, k3, k4 = st.columns(4)
                    with k1:
                        render_kpi_card("Run ID", meta["run_id"][-12:], f"Full: {meta['run_id']}", "blue")
                    with k2:
                        render_kpi_card("Cases Evaluated", meta["evaluated_sample_size"], f"Seed: {meta['random_seed']}", "teal")
                    with k3:
                        render_kpi_card("Runtime Duration", f"{meta['duration_seconds']}s", "Fast vectorized execution", "green")
                    with k4:
                        render_kpi_card("Failed Executions", meta["failed_executions_count"], "Zero crash tolerance", "indigo")

                    st.page_link("pages/4_Results_Dashboard.py", label="👉 Open Comprehensive Results Dashboard", icon="📊")

                except Exception as e:
                    status_text.error(f"Experiment execution failed: {e}")
                    st.exception(e)

with col_hist:
    st.subheader("📜 Prior Experiment Runs")
    runs_dir = os.path.join(project_root, "data", "results", "runs")
    run_files = sorted(glob.glob(os.path.join(runs_dir, "*.json")), reverse=True)

    if not run_files:
        st.info("No saved experiment runs found. Launch your first run on the left.")
    else:
        st.caption(f"Found {len(run_files)} persisted benchmark runs in `data/results/runs/`:")
        for r_file in run_files[:8]:
            try:
                with open(r_file, "r", encoding="utf-8") as f:
                    r_data = json.load(f)
                r_meta = r_data.get("run_metadata", {})
                r_id = r_meta.get("run_id", os.path.basename(r_file))
                r_sample = r_meta.get("evaluated_sample_size", "?")
                r_time = r_meta.get("completion_time", "")[:19].replace("T", " ")
                r_methods = len(r_meta.get("methods_evaluated", []))

                with st.expander(f"📁 {r_id} ({r_time})"):
                    st.markdown(f"""
                    - **Sample Size**: {r_sample} cases
                    - **Methods**: {r_methods} evaluated
                    - **Random Seed**: {r_meta.get('random_seed', 'N/A')}
                    - **Duration**: {r_meta.get('duration_seconds', 'N/A')}s
                    """)
                    if st.button("Set as Active Dashboard Run", key=f"btn_{r_id}"):
                        # Copy to latest_run.json
                        latest_path = os.path.join(project_root, "data", "results", "latest_run.json")
                        with open(latest_path, "w", encoding="utf-8") as lf:
                            json.dump(r_data, lf, indent=2)
                        st.success(f"Run {r_id} loaded as active!")
                        st.rerun()
            except Exception:
                continue
