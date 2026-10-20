import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from ui_utils import inject_custom_css
except ImportError:
    pass

st.set_page_config(page_title="Results Dashboard", page_icon="📊", layout="wide")
try:
    inject_custom_css()
except NameError:
    pass
st.title("Analysis & Results Dashboard")
st.markdown("Visualizations for Phase 4 evaluation metrics comparing all five privacy protection methodologies.")

import json

METRICS_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "results", "metrics.json")

@st.cache_data
def load_metrics(_mtime: float):
    if os.path.exists(METRICS_PATH):
        with open(METRICS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        df_loaded = pd.DataFrame(data)
        # Normalize method names for display
        name_map = {
            "piivot": "PIIvot",
            "prvl": "PRvL",
            "pii_bench": "PII-Bench",
            "privacylens": "PrivacyLens",
            "confaide": "ConfAIde"
        }
        df_loaded["Method"] = df_loaded["Method"].apply(lambda m: name_map.get(str(m).lower(), str(m).upper()))
        return df_loaded
    else:
        st.warning("Metrics file not found. Run `python run_experiment.py` first.")
        st.stop()

mtime = os.path.getmtime(METRICS_PATH) if os.path.exists(METRICS_PATH) else 0.0
df = load_metrics(mtime)

# 1. Summary Table
st.subheader("Quantitative Evaluation (Table)")
st.dataframe(df.style.highlight_max(subset=['F1 Score', 'Utility Score'], color='lightgreen')
                     .highlight_min(subset=['Leakage Rate', 'Latency (ms)'], color='lightgreen'))

col1, col2 = st.columns(2)

# 2. Bar Charts
with col1:
    st.subheader("F1 Score by Method (Higher is Better)")
    fig_f1 = px.bar(df, x='Method', y='F1 Score', color='Method', template='plotly_white')
    st.plotly_chart(fig_f1, use_container_width=True)

with col2:
    st.subheader("Leakage Rate by Method (Lower is Better)")
    fig_leak = px.bar(df, x='Method', y='Leakage Rate', color='Method', template='plotly_white')
    st.plotly_chart(fig_leak, use_container_width=True)

# 3. Privacy-Utility Trade-off
st.subheader("Privacy–Utility Trade-off (Scatter)")
fig_scatter = px.scatter(
    df, x='Leakage Rate', y='Utility Score', color='Method', size='F1 Score',
    hover_data=['Context Awareness'], template='plotly_white',
    title="Ideal models are in the Top-Left (High Utility, Low Leakage)"
)
fig_scatter.update_xaxes(autorange="reversed") # Reverse X so left is better (lower leakage)
st.plotly_chart(fig_scatter, use_container_width=True)

# 4. Radar / Comparison Visualization
st.subheader("Multi-Dimensional Radar Chart")
radar_df = df.copy()
# Fill NaN for radar calculation
radar_df['Context Awareness Plot'] = radar_df['Context Awareness'].fillna(0.0)

categories = ['F1 Score', 'Utility Score', 'Context Awareness']
fig_radar = go.Figure()

for i, row in radar_df.iterrows():
    fig_radar.add_trace(go.Scatterpolar(
        r=[row['F1 Score'], row['Utility Score'], row['Context Awareness Plot']],
        theta=categories,
        fill='toself',
        name=row['Method']
    ))

fig_radar.update_layout(
    polar=dict(radialaxis=dict(visible=True, range=[0, 1])),
    showlegend=True,
    template='plotly_white'
)
st.plotly_chart(fig_radar, use_container_width=True)

# 5. Error Analysis & Dynamic Observations
st.subheader("Dynamic Benchmark Insights")
try:
    top_util_idx = df['Utility Score'].idxmax()
    top_util_method = df.loc[top_util_idx, 'Method']
    top_util_score = df.loc[top_util_idx, 'Utility Score']

    ca_df = df.dropna(subset=['Context Awareness'])
    if not ca_df.empty:
        top_ca_idx = ca_df['Context Awareness'].idxmax()
        top_ca_method = ca_df.loc[top_ca_idx, 'Method']
        top_ca_score = ca_df.loc[top_ca_idx, 'Context Awareness']
        ca_note = f"- **{top_ca_method}** achieved the highest Context Awareness ({top_ca_score:.3f}), reflecting accurate ALLOW/DENY decisions matching social privacy norms."
    else:
        ca_note = "- Context Awareness is computed for decision-making methods (PrivacyLens and ConfAIde)."

    st.markdown(f"""
**Key Findings from Current Benchmark:**
- **{top_util_method}** achieved the highest utility score ({top_util_score:.3f}), maximizing textual fidelity and readability.
{ca_note}
- **Deterministic Latency**: Across all methods, execution time averaged {df['Latency (ms)'].mean():.2f} ms per case.
""")
except Exception as e:
    st.info("Benchmark observations will appear after running `python run_experiment.py`.")
