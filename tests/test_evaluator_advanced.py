import pytest
from src.core.schemas import PrivacyCase, PIIEntity, MethodResult
from src.evaluation.evaluator import (
    calculate_pii_metrics,
    calculate_leakage_detailed,
    calculate_leakage,
    calculate_utility_detailed,
    calculate_utility,
    evaluate_privacy_method,
    clean_entity_text
)

def test_entity_clean_normalization():
    assert clean_entity_text("  John Doe, ") == "john doe"
    assert clean_entity_text("<user@domain.com>.") == "user@domain.com"
    assert clean_entity_text("") == ""

def test_leakage_boundary_matching():
    # If entity is "Al" (short name), "Also" should NOT be flagged as leaking!
    e_short = PIIEntity(entity_id="1", text="Al", pii_type="NAME_STUDENT", start=0, end=2, label="NAME_STUDENT")
    
    rate, leaked = calculate_leakage_detailed([e_short], "Also we noticed the student was absent.")
    assert rate == 0.0
    assert len(leaked) == 0
    
    # But if "Al" appears as a standalone word, it is a leak
    rate2, leaked2 = calculate_leakage_detailed([e_short], "The student Al was present.")
    assert rate2 == 1.0
    assert len(leaked2) == 1

def test_utility_multi_metrics():
    orig = "Patient John Doe has severe asthma symptoms."
    prot = "Patient <PERSON_1> has severe asthma symptoms."
    e_name = PIIEntity(entity_id="1", text="John Doe", pii_type="NAME_STUDENT", start=8, end=16, label="NAME_STUDENT")
    
    details = calculate_utility_detailed(orig, prot, ground_truth_entities=[e_name])
    assert 0.7 <= details["utility_score"] <= 1.0
    assert details["token_jaccard"] > 0.6
    assert details["length_ratio"] > 0.8
    assert details["non_pii_retention"] == 1.0

def test_applicability_matrix_separation():
    e1 = PIIEntity(entity_id="1", text="alice@domain.org", pii_type="EMAIL", start=0, end=16, label="EMAIL")
    case = PrivacyCase(
        case_id="c1",
        context="Email alice@domain.org for info.",
        expected_decision="DENY",
        recipient="stranger",
        purpose="advertising",
        entities=[e1]
    )
    
    # 1. Transformation result (piivot)
    res_trans = MethodResult(
        case_id="c1",
        method_name="piivot",
        original_text=case.context,
        protected_text="Email user_101@synthetic.org for info.",
        detected_entities=[e1],
        masked_entities=[e1],
        latency_ms=1.5
    )
    rec_trans = evaluate_privacy_method([case], [res_trans], "piivot")
    assert rec_trans["category"] == "PII Redaction & Pseudonymization"
    assert rec_trans["leakage_rate"] == 0.0
    assert rec_trans["utility_score"] > 0.5
    assert rec_trans["context_accuracy"] is None  # Applicability: N/A for text transformation

    # 2. Decision result (privacylens)
    res_dec = MethodResult(
        case_id="c1",
        method_name="privacylens",
        original_text=case.context,
        privacy_decision="DENY",
        latency_ms=1.2,
        reasoning="Norm violation"
    )
    rec_dec = evaluate_privacy_method([case], [res_dec], "privacylens")
    assert rec_dec["category"] == "Contextual Privacy Decision & Risk"
    assert rec_dec["context_accuracy"] == 1.0     # 100% agreement with DENY
    assert rec_dec["leakage_rate"] is None        # Applicability: N/A for audit engine
    assert rec_dec["utility_score"] is None       # Applicability: N/A for audit engine
