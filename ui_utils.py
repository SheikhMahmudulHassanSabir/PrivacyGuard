import streamlit as st

def inject_custom_css():
    st.markdown("""
    <style>
    /* Main background */
    .stApp {
        background-color: #ffffff;
    }
    
    /* Rounded inputs, text areas, buttons */
    .stTextInput>div>div>input {
        border-radius: 20px;
        border: 1px solid #cccccc;
    }
    .stTextArea>div>div>textarea {
        border-radius: 20px;
        border: 1px solid #cccccc;
    }
    .stButton>button {
        border-radius: 20px;
        border: 1px solid #000000;
        background-color: #ffffff;
        color: #000000;
        transition: all 0.2s ease-in-out;
    }
    .stButton>button:hover {
        background-color: #000000;
        color: #ffffff;
    }
    
    /* Rounded dataframes and metric cards */
    div[data-testid="stMetric"], div[data-testid="metric-container"] {
        border-radius: 20px;
        background-color: #f5f5f5;
        padding: 10px 20px;
    }
    div[data-testid="stDataFrame"] {
        border-radius: 20px;
        overflow: hidden;
    }
    
    /* Side bar */
    section[data-testid="stSidebar"] {
        background-color: #f9f9f9;
        border-right: 1px solid #eaeaea;
    }
    </style>
    """, unsafe_allow_html=True)
