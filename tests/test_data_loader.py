import pytest
import os
from src.core.data_loader import (
    validate_dataset_integrity,
    load_dataset_cases,
    get_dataset_fingerprint,
    compute_file_hash
)

def test_dataset_integrity():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dataset_dir = os.path.join(base_dir, "dataset")
    
    report = validate_dataset_integrity(dataset_dir)
    assert report["valid"] is True
    assert report["total_csv_records"] == 4434
    assert report["total_json_records"] == 4434
    assert report["total_entities"] > 20000
    assert len(report["errors"]) == 0
    assert "fingerprint" in report

def test_reproducible_stratified_sampling():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dataset_dir = os.path.join(base_dir, "dataset")
    
    # Run 1 with seed 42
    cases_1, meta_1 = load_dataset_cases(dataset_dir, sample_size=20, random_seed=42, stratify=True)
    # Run 2 with seed 42
    cases_2, meta_2 = load_dataset_cases(dataset_dir, sample_size=20, random_seed=42, stratify=True)
    # Run 3 with seed 999
    cases_3, meta_3 = load_dataset_cases(dataset_dir, sample_size=20, random_seed=999, stratify=True)
    
    assert len(cases_1) == 20
    assert len(cases_2) == 20
    
    # Exact case IDs must match between seed 42 runs
    ids_1 = [c.case_id for c in cases_1]
    ids_2 = [c.case_id for c in cases_2]
    ids_3 = [c.case_id for c in cases_3]
    assert ids_1 == ids_2
    assert ids_1 != ids_3

def test_case_invariants_and_entity_spans():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dataset_dir = os.path.join(base_dir, "dataset")
    
    cases, _ = load_dataset_cases(dataset_dir, sample_size=15, random_seed=123)
    
    for c in cases:
        assert c.case_id
        assert len(c.context) > 0
        assert c.recipient in ["doctor", "teacher", "stranger", "customer", "public", "advertiser", "vendor", "attorney", "researcher", "unknown"]
        assert c.purpose is not None
        assert c.expected_decision in ["ALLOW", "DENY"]
        
        # Check that entity offsets match context slices exactly
        for ent in c.entities:
            assert c.context[ent.start:ent.end] == ent.text
