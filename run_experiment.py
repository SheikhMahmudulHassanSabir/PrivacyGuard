#!/usr/bin/env python3
"""
PrivacyGuard Benchmark Experiment Runner

Executes reproducible, isolated evaluations across all five privacy protection methods
and the multi-stage Hybrid Detector using real dataset records.

Persists comprehensive structured run artifacts for the Research Dashboard.
"""

import os
import sys
import json
import uuid
import datetime
import argparse
import logging
from typing import List, Dict, Any, Optional

from src.core.schemas import PrivacyCase, MethodResult
from src.core.registry import MethodRegistry
from src.core.data_loader import (
    load_dataset_cases,
    validate_dataset_integrity,
    get_dataset_fingerprint
)
from src.detectors.hybrid_detector import HybridDetector
from src.evaluation.evaluator import (
    evaluate_detector_on_dataset,
    evaluate_privacy_method,
    calculate_leakage_detailed,
    calculate_utility_detailed
)

# Register all 5 methods
import src.methods.piivot.pipeline
import src.methods.prvl.pipeline
import src.methods.pii_bench.pipeline
import src.methods.privacylens.pipeline
import src.methods.confaide.pipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

METRIC_DEFINITIONS = {
    "detection_precision": "True detected entities / Total detected entities. Measures false-alarm rate.",
    "detection_recall": "True detected entities / Total ground-truth entities. Measures coverage of sensitive entities.",
    "detection_f1": "Harmonic mean of detection precision and recall.",
    "leakage_rate": "Percentage of ground-truth PII entities that remain detectable in the protected output.",
    "cases_with_leakage_pct": "Percentage of evaluated cases where at least one sensitive entity leaked into output.",
    "utility_score": "Composite metric combining non-PII token preservation rate (60%) and token Jaccard similarity (40%).",
    "context_accuracy": "Percentage of privacy decisions (ALLOW/DENY) that align with contextual integrity norms.",
    "unsafe_allow_rate": "Percentage of high/critical risk transmissions that were incorrectly allowed to untrusted recipients.",
    "unnecessary_deny_rate": "Percentage of legitimate context-authorized transmissions that were unnecessarily denied."
}

APPLICABILITY_MATRIX = {
    "piivot": {
        "category": "PII Redaction & Pseudonymization",
        "detection_f1": "Inherited from Detector",
        "leakage_rate": "Applicable (Target: 0.0%)",
        "utility_score": "Applicable (Target: 1.0)",
        "context_accuracy": "N/A (Transforms text unconditionally)",
        "latency_ms": "Applicable"
    },
    "prvl": {
        "category": "PII Redaction & Pseudonymization",
        "detection_f1": "Inherited from Detector",
        "leakage_rate": "Applicable (Target: 0.0%)",
        "utility_score": "Applicable (Target: 1.0)",
        "context_accuracy": "N/A (Transforms text with logic constraints)",
        "latency_ms": "Applicable"
    },
    "pii_bench": {
        "category": "PII Redaction & Pseudonymization",
        "detection_f1": "Inherited from Detector",
        "leakage_rate": "Applicable (Query-filtered)",
        "utility_score": "Applicable (Query-prioritized)",
        "context_accuracy": "N/A (Selective task masking)",
        "latency_ms": "Applicable"
    },
    "privacylens": {
        "category": "Contextual Privacy Decision & Risk",
        "detection_f1": "Inherited from Detector",
        "leakage_rate": "N/A (Normative Audit Engine)",
        "utility_score": "N/A (Normative Audit Engine)",
        "context_accuracy": "Applicable (Target: 1.0)",
        "latency_ms": "Applicable"
    },
    "confaide": {
        "category": "Contextual Privacy Decision & Risk",
        "detection_f1": "Inherited from Detector",
        "leakage_rate": "N/A (Risk Scoring Engine)",
        "utility_score": "N/A (Risk Scoring Engine)",
        "context_accuracy": "Applicable (Target: 1.0)",
        "latency_ms": "Applicable"
    }
}

def run_experiment(
    sample_size: int = 50,
    random_seed: int = 42,
    stratify: bool = True,
    selected_methods: Optional[List[str]] = None,
    output_dir: Optional[str] = None,
    progress_callback: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Executes a benchmark experiment and returns the full structured result artifact.
    """
    start_time = datetime.datetime.now()
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_dir = os.path.join(base_dir, "dataset")
    if output_dir is None:
        output_dir = os.path.join(base_dir, "data", "results")
    runs_dir = os.path.join(output_dir, "runs")
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(runs_dir, exist_ok=True)

    run_id = f"pg_exp_{start_time.strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:6]}"
    logger.info(f"Initiating PrivacyGuard experiment: {run_id}")

    # 1. Dataset Integrity Validation
    val_report = validate_dataset_integrity(dataset_dir)
    logger.info(f"Dataset integrity status: {'VALID' if val_report['valid'] else 'INVALID'}")

    # 2. Reproducible Stratified Case Loading
    cases, sampling_meta = load_dataset_cases(
        dataset_dir=dataset_dir,
        sample_size=sample_size,
        random_seed=random_seed,
        stratify=stratify
    )
    logger.info(f"Loaded {len(cases)} cases across risk distribution: {sampling_meta['stratified_distribution']}")

    # 3. Benchmark the Hybrid Detector
    logger.info("Evaluating baseline Hybrid Detector...")
    detector = HybridDetector(enable_regex=True, enable_ner=True, enable_llm=False)
    detector_metrics = evaluate_detector_on_dataset(cases, detector)
    logger.info(f"Detector Overall F1: {detector_metrics['overall']['f1']} (P: {detector_metrics['overall']['precision']}, R: {detector_metrics['overall']['recall']})")

    # 4. Method Execution & Metrics
    all_methods = MethodRegistry.list_methods()
    methods_to_run = [m for m in (selected_methods or all_methods) if m in all_methods]

    method_eval_records = []
    per_record_dict: Dict[str, Dict[str, Any]] = {}
    errors_log: List[Dict[str, Any]] = []

    # Initialize per-record structures
    for case in cases:
        per_record_dict[case.case_id] = {
            "case_id": case.case_id,
            "context": case.context,
            "query": case.query,
            "recipient": case.recipient,
            "purpose": case.purpose,
            "expected_decision": case.expected_decision,
            "ground_truth_entities": [
                {"text": e.text, "type": e.pii_type, "start": e.start, "end": e.end}
                for e in case.entities
            ],
            "methods": {}
        }

    total_steps = len(methods_to_run)
    for step_idx, method_name in enumerate(methods_to_run, start=1):
        if progress_callback:
            progress_callback(step_idx / (total_steps + 1), f"Running method '{method_name}'...")

        logger.info(f"[{step_idx}/{total_steps}] Executing '{method_name}' across {len(cases)} cases...")
        method_cls = MethodRegistry.get_method(method_name)
        method_instance = method_cls()

        if hasattr(method_instance, 'detector'):
            method_instance.detector = detector
        if hasattr(method_instance, 'use_llm'):
            method_instance.use_llm = False

        results: List[MethodResult] = []
        for case in cases:
            try:
                res = method_instance.run(case)
                results.append(res)

                # Compute per-record leakage and utility details for Case Explorer
                leak_rate, leaked_entities = calculate_leakage_detailed(case.entities, res.protected_text or "")
                u_details = calculate_utility_detailed(case.context, res.protected_text or "", case.entities)

                per_record_dict[case.case_id]["methods"][method_name] = {
                    "protected_text": res.protected_text,
                    "privacy_decision": res.privacy_decision,
                    "latency_ms": round(res.latency_ms, 2),
                    "leakage_rate": round(leak_rate, 3),
                    "leaked_entities": leaked_entities,
                    "utility_score": round(u_details["utility_score"], 3),
                    "num_detected": len(res.detected_entities),
                    "num_masked": len(res.masked_entities),
                    "reasoning": res.reasoning,
                    "metadata": res.metadata
                }
            except Exception as e:
                logger.error(f"Error executing {method_name} on case {case.case_id}: {e}")
                err_entry = {
                    "run_id": run_id,
                    "case_id": case.case_id,
                    "method": method_name,
                    "error": str(e)
                }
                errors_log.append(err_entry)
                # Fallback failure result
                fallback_res = MethodResult(
                    case_id=case.case_id,
                    method_name=method_name,
                    original_text=case.context,
                    protected_text=case.context,
                    latency_ms=0.0,
                    reasoning=f"Execution failed: {e}",
                    metadata={"error": str(e)}
                )
                results.append(fallback_res)
                per_record_dict[case.case_id]["methods"][method_name] = {
                    "protected_text": case.context,
                    "privacy_decision": "ERROR",
                    "latency_ms": 0.0,
                    "leakage_rate": 1.0,
                    "leaked_entities": [],
                    "utility_score": 1.0,
                    "num_detected": 0,
                    "num_masked": 0,
                    "reasoning": f"Execution failed: {e}",
                    "error": str(e)
                }

        # Evaluate method rigorously with applicability matrix
        rec = evaluate_privacy_method(cases, results, method_name)
        # Add inherited detector F1 for clarity
        rec["detector_f1"] = detector_metrics["overall"]["f1"]
        method_eval_records.append(rec)

    end_time = datetime.datetime.now()
    duration_sec = round((end_time - start_time).total_seconds(), 2)

    # 5. Assemble Master Experiment Artifact
    experiment_data: Dict[str, Any] = {
        "run_metadata": {
            "run_id": run_id,
            "status": "COMPLETED",
            "start_time": start_time.isoformat(),
            "completion_time": end_time.isoformat(),
            "duration_seconds": duration_sec,
            "requested_sample_size": sample_size,
            "evaluated_sample_size": len(cases),
            "random_seed": random_seed,
            "stratified": stratify,
            "stratified_distribution": sampling_meta["stratified_distribution"],
            "dataset_fingerprint": sampling_meta["dataset_fingerprint"],
            "methods_evaluated": methods_to_run,
            "failed_executions_count": len(errors_log),
            "detector_config": {
                "enable_regex": True,
                "enable_ner": True,
                "enable_llm": False
            }
        },
        "dataset_validation": val_report,
        "applicability_matrix": APPLICABILITY_MATRIX,
        "detector_benchmark": detector_metrics,
        "method_metrics": method_eval_records,
        "per_record_results": list(per_record_dict.values()),
        "errors": errors_log,
        "metric_definitions": METRIC_DEFINITIONS
    }

    # 6. Save Artifacts
    # Save timestamped run file
    run_file_path = os.path.join(runs_dir, f"{run_id}.json")
    with open(run_file_path, "w", encoding="utf-8") as f:
        json.dump(experiment_data, f, indent=2)

    # Save latest_run.json
    latest_file_path = os.path.join(output_dir, "latest_run.json")
    with open(latest_file_path, "w", encoding="utf-8") as f:
        json.dump(experiment_data, f, indent=2)

    # Save legacy metrics.json for backward compatibility
    legacy_metrics = []
    name_map = {"piivot": "PIIvot", "prvl": "PRvL", "pii_bench": "PII-Bench", "privacylens": "PrivacyLens", "confaide": "ConfAIde"}
    for m in method_eval_records:
        legacy_metrics.append({
            "Method": name_map.get(m["method_name"].lower(), m["method_name"].upper()),
            "F1 Score": detector_metrics["overall"]["f1"],
            "Leakage Rate": m.get("leakage_rate") if m.get("leakage_rate") is not None else 0.0,
            "Utility Score": m.get("utility_score") if m.get("utility_score") is not None else 0.0,
            "Context Awareness": m.get("context_accuracy"),
            "Latency (ms)": m.get("mean_latency_ms", 0.0)
        })
    metrics_path = os.path.join(output_dir, "metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(legacy_metrics, f, indent=2)

    # Save legacy raw_results.json
    raw_results_legacy = {}
    for m in methods_to_run:
        raw_results_legacy[m] = [
            {
                "case_id": rec["case_id"],
                "decision": rec["methods"].get(m, {}).get("privacy_decision"),
                "latency_ms": rec["methods"].get(m, {}).get("latency_ms", 0.0),
                "num_detected": rec["methods"].get(m, {}).get("num_detected", 0),
                "num_masked": rec["methods"].get(m, {}).get("num_masked", 0),
                "reasoning": rec["methods"].get(m, {}).get("reasoning", "")
            }
            for rec in per_record_dict.values()
        ]
    raw_path = os.path.join(output_dir, "raw_results.json")
    with open(raw_path, "w", encoding="utf-8") as f:
        json.dump(raw_results_legacy, f, indent=2)

    logger.info(f"Run completed successfully in {duration_sec}s. Artifacts saved to {output_dir}")

    # Print summary to console
    print("\n" + "="*85)
    print(f"PRIVACYGUARD BENCHMARK RESULTS | Run ID: {run_id}")
    print("="*85)
    print(f"{'Method':<14} | {'Category':<32} | {'Leakage':<10} | {'Utility':<10} | {'Context Acc':<12}")
    print("-" * 85)
    for m in method_eval_records:
        leak_str = f"{m['leakage_rate']:.3f}" if m['leakage_rate'] is not None else "N/A"
        util_str = f"{m['utility_score']:.3f}" if m['utility_score'] is not None else "N/A"
        ca_str = f"{m['context_accuracy']:.3f}" if m['context_accuracy'] is not None else "N/A"
        print(f"{m['method_name']:<14} | {m['category']:<32} | {leak_str:<10} | {util_str:<10} | {ca_str:<12}")
    print("="*85 + "\n")

    if progress_callback:
        progress_callback(1.0, "Benchmark experiment completed!")

    return experiment_data

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PrivacyGuard Benchmark Evaluation Runner")
    parser.add_argument("--sample-size", type=int, default=50, help="Number of benchmark cases to evaluate (default: 50)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducible sampling (default: 42)")
    parser.add_argument("--full", action="store_true", help="Evaluate across entire dataset")
    parser.add_argument("--output-dir", type=str, default=None, help="Directory to save experiment artifacts")
    args = parser.parse_args()

    sample = 0 if args.full else args.sample_size
    run_experiment(sample_size=sample, random_seed=args.seed, output_dir=args.output_dir)
