from typing import List, Dict, Any
import numpy as np

# We'll use simple metrics for the prototype. In a full implementation, you'd use exact span overlap.
def calculate_pii_metrics(true_entities, pred_entities):
    # Normalized evaluation: strip outer punctuation and whitespace
    true_texts = {e.text.lower().strip(" \t\n\r.,;:!?)\"'") for e in true_entities if e.text.strip(" \t\n\r.,;:!?)\"'")}
    pred_texts = {e.text.lower().strip(" \t\n\r.,;:!?)\"'") for e in pred_entities if e.text.strip(" \t\n\r.,;:!?)\"'")}
    
    if not true_texts and not pred_texts:
        return 1.0, 1.0, 1.0

    tp = len(true_texts.intersection(pred_texts))
    fp = len(pred_texts - true_texts)
    fn = len(true_texts - pred_texts)
    
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    
    return precision, recall, f1

def calculate_leakage(true_entities, protected_text):
    if not protected_text or not true_entities:
        return 0.0
    # Leakage is the % of true entities that still appear in the protected text
    leaked = 0
    protected_lower = protected_text.lower()
    for ent in true_entities:
        ent_clean = ent.text.lower().strip(" \t\n\r.,;:!?)\"'")
        if ent_clean and ent_clean in protected_lower:
            leaked += 1
    return leaked / len(true_entities)

def calculate_utility(original_text, protected_text):
    if not protected_text or not original_text:
        return 0.0
    # Jaccard similarity of words as a simple utility proxy
    orig_words = set(original_text.lower().split())
    prot_words = set(protected_text.lower().split())
    if not orig_words:
        return 1.0
    intersection = len(orig_words.intersection(prot_words))
    union = len(orig_words.union(prot_words))
    return intersection / union if union > 0 else 0.0

def evaluate_method(cases: List[Any], results: List[Any]) -> Dict[str, float]:
    """
    Evaluates a set of results for a specific method.
    """
    metrics = {
        "precision": [],
        "recall": [],
        "f1": [],
        "leakage": [],
        "utility": [],
        "context_awareness": [],
        "latency": [],
        "cost": []
    }
    
    for case, res in zip(cases, results):
        # 1. PII Detection (Precision, Recall, F1)
        p, r, f = calculate_pii_metrics(case.entities, res.detected_entities)
        metrics["precision"].append(p)
        metrics["recall"].append(r)
        metrics["f1"].append(f)
        
        # 2. Leakage Rate
        leakage = calculate_leakage(case.entities, res.protected_text)
        metrics["leakage"].append(leakage)
        
        # 3. Utility
        utility = calculate_utility(case.original_text if hasattr(case, 'original_text') else case.context, res.protected_text)
        metrics["utility"].append(utility)
        
        # 4. Context Awareness (Accuracy of privacy decision)
        if case.expected_decision and res.privacy_decision:
            awareness = 1.0 if case.expected_decision.upper() == res.privacy_decision.upper() else 0.0
            metrics["context_awareness"].append(awareness)
            
        # 5. Latency & Cost
        metrics["latency"].append(res.latency_ms)
        if res.estimated_cost is not None:
            metrics["cost"].append(res.estimated_cost)
            
    # Aggregate
    aggregated = {
        "Precision": np.mean(metrics["precision"]) if metrics["precision"] else 0.0,
        "Recall": np.mean(metrics["recall"]) if metrics["recall"] else 0.0,
        "F1 Score": np.mean(metrics["f1"]) if metrics["f1"] else 0.0,
        "Leakage Rate": np.mean(metrics["leakage"]) if metrics["leakage"] else 0.0,
        "Utility Score": float(np.mean(metrics["utility"])) if metrics["utility"] else 0.0,
        "Context Awareness": float(np.mean(metrics["context_awareness"])) if metrics["context_awareness"] else None,
        "Latency (ms)": float(np.mean(metrics["latency"])) if metrics["latency"] else 0.0,
        "Cost ($)": float(np.sum(metrics["cost"])) if metrics["cost"] else 0.0,
    }
    
    return aggregated
