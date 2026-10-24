import pytest
import os
import json
from run_experiment import run_experiment

def test_run_experiment_end_to_end(tmp_path):
    output_dir = str(tmp_path / "results")
    
    # Run experiment on 5 cases with seed 42
    exp_data = run_experiment(
        sample_size=5,
        random_seed=42,
        output_dir=output_dir
    )
    
    assert "run_metadata" in exp_data
    assert "dataset_validation" in exp_data
    assert "detector_benchmark" in exp_data
    assert "method_metrics" in exp_data
    assert "per_record_results" in exp_data
    assert "metric_definitions" in exp_data
    
    meta = exp_data["run_metadata"]
    assert meta["status"] == "COMPLETED"
    assert meta["evaluated_sample_size"] == 5
    assert meta["random_seed"] == 42
    
    # Check that all 5 methods have results
    methods_evaluated = meta["methods_evaluated"]
    assert len(methods_evaluated) == 5
    assert set(methods_evaluated) == {"piivot", "prvl", "pii_bench", "privacylens", "confaide"}
    
    # Check files created in output_dir
    latest_run_file = os.path.join(output_dir, "latest_run.json")
    metrics_file = os.path.join(output_dir, "metrics.json")
    raw_file = os.path.join(output_dir, "raw_results.json")
    assert os.path.exists(latest_run_file)
    assert os.path.exists(metrics_file)
    assert os.path.exists(raw_file)
