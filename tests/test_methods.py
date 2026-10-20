import pytest
from src.core.schemas import PrivacyCase, PIIEntity
from src.core.registry import MethodRegistry
from src.detectors.regex_detector import RegexDetector
from src.detectors.ner_detector import NERDetector
from src.detectors.hybrid_detector import HybridDetector
from src.evaluation.evaluator import calculate_pii_metrics, calculate_leakage, calculate_utility

import src.methods.piivot.pipeline
import src.methods.prvl.pipeline
import src.methods.pii_bench.pipeline
import src.methods.privacylens.pipeline
import src.methods.confaide.pipeline

def test_regex_detector():
    detector = RegexDetector()
    text = "Contact Alice at alice@example.com or call 9876543210. Visit https://example.com/portfolio or @alice_dev."
    entities = detector.detect(text)
    
    types = {e.pii_type for e in entities}
    assert "EMAIL" in types
    assert "PHONE_NUM" in types
    assert "URL_PERSONAL" in types
    assert "USERNAME" in types
    
    # Check slice invariant text[start:end] == ent.text
    for ent in entities:
        assert text[ent.start:ent.end] == ent.text

def test_ner_detector():
    detector = NERDetector()
    text = "My name is Aaliyah Popova and my studio is at 97 Lincoln Street."
    entities = detector.detect(text)
    
    types = {e.pii_type for e in entities}
    assert "NAME_STUDENT" in types or "STREET_ADDRESS" in types
    for ent in entities:
        assert text[ent.start:ent.end] == ent.text

def test_hybrid_detector_fusion():
    detector = HybridDetector(enable_regex=True, enable_ner=True, enable_llm=False)
    text = "My name is Konstantin Becker, email konstantin.becker@gmail.com, live at 826 Webster Street."
    entities = detector.detect(text)
    
    # Ensure entities are sorted and non-overlapping
    assert len(entities) >= 2
    for i in range(len(entities) - 1):
        assert entities[i].end <= entities[i+1].start

def test_piivot_method():
    method = MethodRegistry.get_method("piivot")()
    case = PrivacyCase(
        case_id="case_1",
        context="Rahul Sharma can be reached at rahul.sharma@gmail.com and 9876543210."
    )
    result = method.run(case)
    
    assert result.method_name == "piivot"
    assert "rahul.sharma@gmail.com" not in result.protected_text
    assert "9876543210" not in result.protected_text
    assert len(result.masked_entities) >= 2
    assert "surrogate_map" in result.metadata

def test_prvl_symbolic_method():
    method = MethodRegistry.get_method("prvl")()
    case = PrivacyCase(
        case_id="case_2",
        context="Student John Doe has email john@school.edu and phone 9876543210."
    )
    result = method.run(case)
    
    assert result.method_name == "prvl"
    assert "<EMAIL_1>" in result.protected_text or "<PHONE_1>" in result.protected_text
    assert "symbolic_map" in result.metadata
    assert "logic_proof" in result.metadata

def test_pii_bench_query_aware():
    method = MethodRegistry.get_method("pii_bench")()
    case = PrivacyCase(
        case_id="case_3",
        context="Send inquiry to contact@company.org or telephone 9876543210. Address is 104 Maple Street.",
        query="What is the contact email address?",
        recipient="client",
        purpose="inquiry"
    )
    result = method.run(case)
    
    assert result.method_name == "pii_bench"
    # Task-relevant email should be KEPT in protected text
    assert "contact@company.org" in result.protected_text
    assert any(e.pii_type == "EMAIL" for e in result.kept_entities)
    # Irrelevant phone/address should be masked
    assert "[REDACTED_" in result.protected_text
    assert len(result.masked_entities) > 0

def test_privacylens_ci_evaluation():
    method = MethodRegistry.get_method("privacylens")()
    
    # 1. Trusted medical flow -> ALLOW
    case_allowed = PrivacyCase(
        case_id="ci_1",
        context="Patient has asthma and contact phone is 9876543210.",
        recipient="doctor",
        purpose="treatment"
    )
    res_allowed = method.run(case_allowed)
    assert res_allowed.privacy_decision == "ALLOW"
    
    # 2. Commercial / unauthorized flow -> DENY
    case_denied = PrivacyCase(
        case_id="ci_2",
        context="Patient has asthma and contact phone is 9876543210.",
        recipient="marketing",
        purpose="advertising"
    )
    res_denied = method.run(case_denied)
    assert res_denied.privacy_decision == "DENY"
    assert "[REDACTED_" in res_denied.protected_text

def test_confaide_risk_scoring():
    method = MethodRegistry.get_method("confaide")()
    
    # High risk: Healthcare context with stranger and advertising purpose
    case_high_risk = PrivacyCase(
        case_id="conf_1",
        context="Patient John Doe DOB 1980 has email john@gmail.com and phone 9876543210.",
        recipient="stranger",
        purpose="advertising"
    )
    res_high = method.run(case_high_risk)
    assert res_high.privacy_decision == "DENY"
    assert res_high.metadata["risk_tier"] in ["HIGH", "CRITICAL"]
    assert res_high.metadata["risk_score"] >= 0.50

def test_evaluator_metrics():
    e1 = PIIEntity(entity_id="1", text="test@gmail.com", pii_type="EMAIL", start=0, end=14, label="EMAIL")
    e2 = PIIEntity(entity_id="2", text="9876543210", pii_type="PHONE_NUM", start=15, end=25, label="PHONE_NUM")
    
    true_entities = [e1, e2]
    pred_entities = [e1]
    
    precision, recall, f1 = calculate_pii_metrics(true_entities, pred_entities)
    assert precision == 1.0
    assert recall == 0.5
    assert round(f1, 2) == 0.67
    
    # Leakage check: if test@gmail.com is still in protected text, leakage is 50%
    leakage = calculate_leakage(true_entities, "My email is test@gmail.com but phone is masked.")
    assert leakage == 0.5
    
    # Utility check
    utility = calculate_utility("hello world email test", "hello world protected")
    assert 0.0 < utility < 1.0
