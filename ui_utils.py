"""
PrivacyGuard Modern UI/UX Design System & Component Library

Implements a clean, research-grade SaaS aesthetic for Streamlit:
- Palette: Deep Navy (#0F172A / #1E293B), Tech Blue (#2563EB), Teal Accent (#0D9488)
- Surfaces: Crisp white cards (#FFFFFF) with subtle border (#E2E8F0) and elevation
- Typography: High-legibility modern sans-serif
- Components: KPI cards, status badges, diff view, and dataset banners.
"""

import streamlit as st
import html
import re
from typing import List, Dict, Any, Optional

def inject_custom_css():
    """Injects cohesive, modern design styles into Streamlit."""
    st.markdown("""
    <style>
    /* Google Fonts Import */
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    html, body, [class*="css"] {
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #1E293B;
    }

    /* Main background */
    .stApp {
        background-color: #F8FAFC;
    }

    /* Main Container Padding */
    .block-container {
        padding-top: 2rem;
        padding-bottom: 3rem;
        max-width: 1200px;
    }

    /* Headings */
    h1, h2, h3, h4 {
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-weight: 700;
        color: #0F172A;
        letter-spacing: -0.02em;
    }

    /* Header Accent */
    .pg-header-container {
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #E2E8F0;
    }
    .pg-title {
        font-size: 1.85rem;
        font-weight: 800;
        color: #0F172A;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.6rem;
    }
    .pg-subtitle {
        font-size: 0.95rem;
        color: #64748B;
        margin-top: 0.35rem;
        margin-bottom: 0;
    }

    /* KPI Cards */
    .pg-kpi-card {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 1.15rem 1.25rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        margin-bottom: 0.75rem;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .pg-kpi-card:hover {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
    }
    .pg-kpi-label {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #64748B;
        margin-bottom: 0.25rem;
    }
    .pg-kpi-value {
        font-size: 1.75rem;
        font-weight: 700;
        color: #0F172A;
        line-height: 1.2;
    }
    .pg-kpi-sub {
        font-size: 0.78rem;
        color: #64748B;
        margin-top: 0.3rem;
    }

    /* Color variations for KPI cards */
    .pg-kpi-blue { border-left: 4px solid #2563EB; }
    .pg-kpi-green { border-left: 4px solid #10B981; }
    .pg-kpi-amber { border-left: 4px solid #F59E0B; }
    .pg-kpi-teal { border-left: 4px solid #0D9488; }
    .pg-kpi-indigo { border-left: 4px solid #6366F1; }
    .pg-kpi-rose { border-left: 4px solid #F43F5E; }

    /* Badges */
    .pg-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.2rem 0.55rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        line-height: 1;
    }
    .pg-badge-green { background-color: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
    .pg-badge-red { background-color: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; }
    .pg-badge-blue { background-color: #EFF6FF; color: #1E40AF; border: 1px solid #BFDBFE; }
    .pg-badge-amber { background-color: #FFFBEB; color: #92400E; border: 1px solid #FDE68A; }
    .pg-badge-purple { background-color: #FAF5FF; color: #6B21A8; border: 1px solid #E9D5FF; }
    .pg-badge-gray { background-color: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; }

    /* Streamlit UI elements refinements */
    div[data-testid="stMetric"] {
        background-color: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 0.85rem 1.15rem;
        box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }

    div[data-testid="stDataFrame"] {
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        overflow: hidden;
        background-color: #FFFFFF;
    }

    /* Sidebar Styling */
    section[data-testid="stSidebar"] {
        background-color: #FFFFFF;
        border-right: 1px solid #E2E8F0;
    }
    section[data-testid="stSidebar"] h1, 
    section[data-testid="stSidebar"] h2, 
    section[data-testid="stSidebar"] h3 {
        color: #0F172A;
    }

    /* Tab styling */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
        background-color: transparent;
        border-bottom: 1px solid #E2E8F0;
        padding-bottom: 2px;
    }
    .stTabs [data-baseweb="tab"] {
        border-radius: 8px 8px 0 0;
        padding: 8px 16px;
        font-weight: 600;
        font-size: 0.9rem;
        color: #64748B;
        background-color: transparent;
        border: none;
    }
    .stTabs [aria-selected="true"] {
        color: #2563EB !important;
        border-bottom: 2px solid #2563EB !important;
        background-color: transparent !important;
    }

    /* Buttons */
    .stButton>button {
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.88rem;
        padding: 0.45rem 1.1rem;
        transition: all 0.2s ease;
    }
    .stButton>button[kind="primary"] {
        background-color: #2563EB;
        color: #FFFFFF;
        border: 1px solid #2563EB;
    }
    .stButton>button[kind="primary"]:hover {
        background-color: #1D4ED8;
        border-color: #1D4ED8;
    }

    /* Text comparison box */
    .pg-diff-box {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        padding: 1rem;
        font-size: 0.88rem;
        line-height: 1.6;
        color: #334155;
    }
    .pg-highlight-red {
        background-color: #FEE2E2;
        color: #991B1B;
        padding: 0.15rem 0.35rem;
        border-radius: 4px;
        font-weight: 600;
        border-bottom: 1px solid #F87171;
    }
    .pg-highlight-green {
        background-color: #D1FAE5;
        color: #065F46;
        padding: 0.15rem 0.35rem;
        border-radius: 4px;
        font-weight: 600;
        border-bottom: 1px solid #34D399;
    }
    .pg-highlight-blue {
        background-color: #DBEAFE;
        color: #1E40AF;
        padding: 0.15rem 0.35rem;
        border-radius: 4px;
        font-weight: 600;
        border-bottom: 1px solid #60A5FA;
    }
    </style>
    """, unsafe_allow_html=True)

def render_header(title: str, subtitle: str, badge_text: Optional[str] = None):
    """Renders a standardized header with subtitle and optional badge."""
    badge_html = f'<span class="pg-badge pg-badge-blue">{html.escape(badge_text)}</span>' if badge_text else ''
    st.markdown(f"""
    <div class="pg-header-container">
        <h1 class="pg-title">{title} {badge_html}</h1>
        <p class="pg-subtitle">{html.escape(subtitle)}</p>
    </div>
    """, unsafe_allow_html=True)

def render_kpi_card(
    label: str,
    value: Any,
    sub: Optional[str] = None,
    color: str = "blue",
    help_text: Optional[str] = None
):
    """Renders a styled KPI card."""
    sub_html = f'<div class="pg-kpi-sub">{html.escape(sub)}</div>' if sub else ''
    help_attr = f'title="{html.escape(help_text)}"' if help_text else ''
    st.markdown(f"""
    <div class="pg-kpi-card pg-kpi-color pg-kpi-{color}" {help_attr}>
        <div class="pg-kpi-label">{html.escape(label)}</div>
        <div class="pg-kpi-value">{html.escape(str(value))}</div>
        {sub_html}
    </div>
    """, unsafe_allow_html=True)

def render_method_badge(method_name: str) -> str:
    """Returns styled HTML for method names."""
    color_map = {
        "piivot": ("pg-badge-purple", "PIIvot (Pseudonymization)"),
        "prvl": ("pg-badge-blue", "PRvL (Logic Canonicalization)"),
        "pii_bench": ("pg-badge-amber", "PII-Bench (Task-Selective)"),
        "privacylens": ("pg-badge-teal", "PrivacyLens (CI Audit)"),
        "confaide": ("pg-badge-rose", "ConfAIde (Risk Scoring)")
    }
    badge_class, display = color_map.get(method_name.lower(), ("pg-badge-gray", method_name.upper()))
    return f'<span class="pg-badge {badge_class}">{html.escape(display)}</span>'

def render_decision_badge(decision: Optional[str]) -> str:
    """Returns styled badge for ALLOW / DENY decisions."""
    dec = (decision or "N/A").upper()
    if dec == "ALLOW":
        return '<span class="pg-badge pg-badge-green">✓ ALLOW</span>'
    elif dec == "DENY":
        return '<span class="pg-badge pg-badge-red">✗ DENY</span>'
    elif dec == "ERROR":
        return '<span class="pg-badge pg-badge-red">⚠ ERROR</span>'
    return f'<span class="pg-badge pg-badge-gray">{html.escape(dec)}</span>'

def render_risk_badge(risk_level: Optional[str]) -> str:
    """Returns styled badge for risk levels."""
    rl = (risk_level or "NONE").upper()
    if rl == "CRITICAL":
        return '<span class="pg-badge pg-badge-red">CRITICAL RISK</span>'
    elif rl == "HIGH":
        return '<span class="pg-badge pg-badge-amber">HIGH RISK</span>'
    elif rl == "MEDIUM":
        return '<span class="pg-badge pg-badge-blue">MEDIUM RISK</span>'
    elif rl == "LOW":
        return '<span class="pg-badge pg-badge-teal">LOW RISK</span>'
    return '<span class="pg-badge pg-badge-gray">NO PII</span>'

def render_dataset_banner(val_report: Dict[str, Any]):
    """Renders a compact dataset integrity summary banner."""
    if val_report.get("valid"):
        total_rec = val_report.get("total_csv_records", 0)
        total_ent = val_report.get("total_entities", 0)
        fingerprint = val_report.get("fingerprint", "unknown")
        st.markdown(f"""
        <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 0.65rem 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
                <span style="font-size: 1.1rem;">✅</span>
                <span style="font-size: 0.85rem; color: #166534; font-weight: 600;">
                    Dataset Verified: {total_rec:,} cases & {total_ent:,} annotated ground-truth entities
                </span>
            </div>
            <span style="font-size: 0.75rem; color: #4B5563; font-family: monospace; background: #DCFCE7; padding: 2px 6px; border-radius: 4px;">
                Fingerprint: {fingerprint}
            </span>
        </div>
        """, unsafe_allow_html=True)
    else:
        errors = val_report.get("errors", ["Dataset check failed."])
        st.markdown(f"""
        <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 0.65rem 1rem; margin-bottom: 1.25rem;">
            <div style="color: #991B1B; font-weight: 600; font-size: 0.88rem;">⚠️ Dataset Integrity Notice:</div>
            <div style="color: #7F1D1D; font-size: 0.82rem; margin-top: 0.2rem;">{html.escape(errors[0])}</div>
        </div>
        """, unsafe_allow_html=True)
