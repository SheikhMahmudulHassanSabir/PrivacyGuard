import time
from typing import List, Set, Optional
from src.core.pipeline import PrivacyMethod
from src.core.schemas import PrivacyCase, MethodResult, PIIEntity
from src.detectors.hybrid_detector import HybridDetector
from src.core.registry import MethodRegistry

class PIIBenchMethod(PrivacyMethod):
    """
    PII-Bench: Query-Aware & Task-Relevant PII Protection.
    Selectively preserves task-critical PII needed to fulfill the downstream query,
    while strictly redacting extraneous, non-relevant PII to prevent unintended leakage.
    """

    INTENT_KEYWORDS = {
        "EMAIL": {"email", "e-mail", "mail", "inbox"},
        "PHONE_NUM": {"phone", "telephone", "mobile", "cell", "dial", "call", "hotline"},
        "NAME_STUDENT": {"who", "name", "author", "creator", "doctor", "developer", "jeweler", "individual"},
        "STREET_ADDRESS": {"where", "street", "avenue", "boulevard", "studio", "office", "residence", "physical address", "postal"},
        "URL_PERSONAL": {"website", "url", "link", "portfolio", "homepage"},
        "USERNAME": {"username", "handle", "login", "account"}
    }

    def __init__(self, detector: Optional[HybridDetector] = None):
        self.detector = detector or HybridDetector()

    def _is_entity_relevant(self, entity: PIIEntity, query_str: str, purpose_str: str) -> bool:
        """Determines whether a PII entity is directly relevant to answering the query."""
        ql = query_str.lower()
        pl = purpose_str.lower()
        
        # Disambiguate common phrases:
        # "email address" refers to EMAIL, not physical STREET_ADDRESS
        has_email_phrase = "email address" in ql or "e-mail address" in ql
        if entity.pii_type == "STREET_ADDRESS" and has_email_phrase and not any(k in ql for k in ["street", "live", "where", "studio", "physical"]):
            return False

        # Check intent keywords
        keywords = self.INTENT_KEYWORDS.get(entity.pii_type, set())
        for kw in keywords:
            if kw in ql:
                return True

        # Check if entity text itself was specifically mentioned in query
        if len(entity.text) > 3 and entity.text.lower() in ql:
            return True

        return False

    def run(self, case: PrivacyCase) -> MethodResult:
        start_time = time.time()
        
        # 1. Detect all entities using Hybrid Detector
        entities = self.detector.detect(case.context)
        
        # 2. Extract task context tokens
        query_text = (case.query or "").lower()
        purpose_text = (case.purpose or "").lower()
        query_tokens = set(query_text.replace("?", " ").replace("'", " ").split())
        purpose_tokens = set(purpose_text.replace("?", " ").replace("'", " ").split())
        
        has_task_context = bool(query_tokens or purpose_tokens)

        kept_entities: List[PIIEntity] = []
        masked_entities: List[PIIEntity] = []

        # 3. Classify each entity as relevant (keep) or extraneous (mask)
        for ent in entities:
            if has_task_context and self._is_entity_relevant(ent, query_text, purpose_text):
                kept_entities.append(ent)
            else:
                masked_entities.append(ent)

        # 4. Generate protected text redacting only masked entities
        protected_text = case.context
        for ent in sorted(masked_entities, key=lambda x: x.start, reverse=True):
            replacement = f"[REDACTED_{ent.pii_type}]"
            protected_text = protected_text[:ent.start] + replacement + protected_text[ent.end:]

        latency = (time.time() - start_time) * 1000

        reasoning = (
            f"PII-Bench task-aware filtering: Retained {len(kept_entities)} task-relevant entities "
            f"({[e.pii_type for e in kept_entities]}); "
            f"Redacted {len(masked_entities)} non-relevant entities to minimize leakage."
        )

        return MethodResult(
            case_id=case.case_id,
            method_name="pii_bench",
            original_text=case.context,
            protected_text=protected_text,
            detected_entities=entities,
            masked_entities=masked_entities,
            kept_entities=kept_entities,
            latency_ms=latency,
            reasoning=reasoning,
            metadata={
                "kept_types": [e.pii_type for e in kept_entities],
                "masked_types": [e.pii_type for e in masked_entities],
                "has_query_context": has_task_context,
                "strategy": "query_aware_selective_retention"
            }
        )

MethodRegistry.register("pii_bench", PIIBenchMethod)
