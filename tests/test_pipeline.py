import pytest
from src.core.schemas import PrivacyCase
from src.core.registry import MethodRegistry
import src.methods.piivot.pipeline

def test_piivot_pipeline():
    method_cls = MethodRegistry.get_method("piivot")
    method = method_cls()
    
    case = PrivacyCase(
        case_id="1",
        context="My email is test@gmail.com and phone is 9876543210."
    )
    
    res = method.run(case)
    # PIIvot replaces email and phone with synthetic surrogates
    assert "test@gmail.com" not in res.protected_text
    assert "9876543210" not in res.protected_text
    assert len(res.masked_entities) >= 2
