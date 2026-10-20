import os
import sys
import json
import csv
import argparse
import logging
from typing import List, Dict, Any

from src.core.schemas import PrivacyCase, PIIEntity
from src.core.registry import MethodRegistry
from src.evaluation.evaluator import evaluate_method

# Register all 5 methods
import src.methods.piivot.pipeline
import src.methods.prvl.pipeline
import src.methods.pii_bench.pipeline
import src.methods.privacylens.pipeline
import src.methods.confaide.pipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def load_dataset_cases(base_dir: str, sample_size: int = 50) -> List[PrivacyCase]:
    """
    Loads real benchmark cases from evaluation_cases.csv joined with ground-truth
    annotations from annotated_cases.json. Performs stratified sampling across risk levels.
    """
    dataset_dir = os.path.join(base_dir, "dataset")
    csv_path = os.path.join(dataset_dir, "evaluation_cases.csv")
    json_path = os.path.join(dataset_dir, "annotated_cases.json")

    if not os.path.exists(csv_path) or not os.path.exists(json_path):
        raise FileNotFoundError(f"Dataset files not found in {dataset_dir}")

    # Load ground-truth entity annotations
    logger.info("Loading ground-truth entity annotations...")
    with open(json_path, "r", encoding="utf-8") as f:
        annot_records = json.load(f)

    entities_by_case: Dict[str, List[PIIEntity]] = {}
    for rec in annot_records:
        cid = rec["case_id"]
        entity_list = []
        for idx, ent in enumerate(rec.get("entities", [])):
            entity_list.append(PIIEntity(
                entity_id=f"{cid}_{idx}",
                text=ent["text"],
                pii_type=ent["label"],
                start=ent["start"],
                end=ent["end"],
                label=ent["label"],
                confidence=1.0
            ))
        entities_by_case[cid] = entity_list

    # Load evaluation CSV cases
    logger.info("Reading evaluation CSV cases...")
    rows_by_risk: Dict[str, List[Dict[str, Any]]] = {}
    with open(csv_path, mode="r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            risk = row.get("risk_level", "NONE")
            rows_by_risk.setdefault(risk, []).append(row)

    # Perform stratified sampling across risk tiers
    selected_rows: List[Dict[str, Any]] = []
    if sample_size <= 0:
        # Full evaluation
        for r_list in rows_by_risk.values():
            selected_rows.extend(r_list)
    else:
        # Stratified distribution
        risk_tiers = list(rows_by_risk.keys())
        per_tier = max(1, sample_size // len(risk_tiers))
        for risk, r_list in rows_by_risk.items():
            selected_rows.extend(r_list[:per_tier])
        # Trim to exact sample size
        selected_rows = selected_rows[:sample_size]

    logger.info(f"Selected {len(selected_rows)} cases for evaluation.")

    # Contextual query / recipient / purpose templates based on domain
    domain_contexts = {
        "healthcare": ("What is the patient's condition?", "doctor", "treatment", "ALLOW"),
        "finance": ("Who owns this account?", "stranger", "advertising", "DENY"),
        "education": ("What is the student's status?", "teacher", "academic_evaluation", "ALLOW"),
        "services": ("How can I contact this professional?", "customer", "contact_inquiry", "ALLOW"),
        "technology": ("What is the developer's work experience?", "public", "general_view", "DENY"),
        "corporate_business": ("Send report to the contact.", "advertiser", "marketing", "DENY"),
        "aviation_transport": ("What is the controller's background?", "vendor", "commercial", "DENY"),
    }

    cases: List[PrivacyCase] = []
    for row in selected_rows:
        cid = row["case_id"]
        domain = row.get("domain", "general_professional")
        risk = row.get("risk_level", "MEDIUM")
        
        template = domain_contexts.get(domain, ("What is the context?", "unknown", "unknown", "DENY"))
        query, recipient, purpose, expected = template
        
        # If high risk or critical with non-trusted flow, expected decision is DENY
        if risk in ["HIGH", "CRITICAL"] and recipient in ["stranger", "advertiser", "unknown", "vendor", "public"]:
            expected = "DENY"

        cases.append(PrivacyCase(
            case_id=cid,
            context=row["text"],
            query=query,
            recipient=recipient,
            purpose=purpose,
            expected_decision=expected,
            entities=entities_by_case.get(cid, [])
        ))

    return cases

def run_experiment(sample_size: int = 50, output_dir: str = None):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    if output_dir is None:
        output_dir = os.path.join(base_dir, "data", "results")
    os.makedirs(output_dir, exist_ok=True)

    cases = load_dataset_cases(base_dir, sample_size=sample_size)

    available_methods = MethodRegistry.list_methods()
    logger.info(f"Evaluating {len(available_methods)} methods: {available_methods}")

    all_metrics = []
    raw_results = {}

    for method_name in available_methods:
        logger.info(f"--> Executing method '{method_name}' across {len(cases)} cases...")
        method_cls = MethodRegistry.get_method(method_name)
        method = method_cls()

        method_results = []
        for case in cases:
            res = method.run(case)
            method_results.append(res)

        # Calculate authentic evaluation metrics using evaluator.py
        eval_metrics = evaluate_method(cases, method_results)
        
        raw_ca = eval_metrics.get("Context Awareness")
        context_aware_val = round(float(raw_ca), 3) if raw_ca is not None else None

        metric_record = {
            "Method": method_name,
            "F1 Score": round(float(eval_metrics.get("F1 Score", 0.0)), 3),
            "Leakage Rate": round(float(eval_metrics.get("Leakage Rate", 0.0)), 3),
            "Utility Score": round(float(eval_metrics.get("Utility Score", 0.0)), 3),
            "Context Awareness": context_aware_val,
            "Latency (ms)": round(float(eval_metrics.get("Latency (ms)", 0.0)), 2)
        }
        all_metrics.append(metric_record)

        # Store raw output summaries
        raw_results[method_name] = [
            {
                "case_id": r.case_id,
                "decision": r.privacy_decision,
                "latency_ms": round(r.latency_ms, 2),
                "num_detected": len(r.detected_entities),
                "num_masked": len(r.masked_entities),
                "reasoning": r.reasoning
            }
            for r in method_results
        ]

    # Save metrics.json
    metrics_path = os.path.join(output_dir, "metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(all_metrics, f, indent=2)

    # Save raw_results.json
    raw_path = os.path.join(output_dir, "raw_results.json")
    with open(raw_path, "w", encoding="utf-8") as f:
        json.dump(raw_results, f, indent=2)

    logger.info(f"Results successfully saved to {output_dir}")

    # Display console summary table
    print("\n" + "="*75)
    print("PRIVACYGUARD QUANTITATIVE EVALUATION BENCHMARK RESULTS")
    print("="*75)
    print(f"{'Method':<15} | {'F1 Score':<10} | {'Leakage':<10} | {'Utility':<10} | {'Awareness':<10} | {'Latency (ms)':<12}")
    print("-" * 75)
    for m in all_metrics:
        ca_display = f"{m['Context Awareness']:<10.3f}" if m['Context Awareness'] is not None else f"{'N/A':<10}"
        print(f"{m['Method']:<15} | {m['F1 Score']:<10.3f} | {m['Leakage Rate']:<10.3f} | {m['Utility Score']:<10.3f} | {ca_display} | {m['Latency (ms)']:<12.2f}")
    print("="*75 + "\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PrivacyGuard Benchmark Evaluation Runner")
    parser.add_argument("--sample-size", type=int, default=50, help="Number of benchmark cases to evaluate (default: 50)")
    parser.add_argument("--full", action="store_true", help="Evaluate across entire 4,434 dataset cases")
    parser.add_argument("--output-dir", type=str, default=None, help="Directory to save metrics.json and raw_results.json")
    args = parser.parse_args()

    sample = 0 if args.full else args.sample_size
    run_experiment(sample_size=sample, output_dir=args.output_dir)
