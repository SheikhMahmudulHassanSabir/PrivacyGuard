import time
from typing import Dict, List, Optional
from src.core.pipeline import PrivacyMethod
from src.core.schemas import PrivacyCase, MethodResult
from src.detectors.hybrid_detector import HybridDetector
from src.core.gemini_client import GeminiClient
from src.core.registry import MethodRegistry

class PrivacyLensMethod(PrivacyMethod):
    """
    PrivacyLens: Helen Nissenbaum's Contextual Integrity (CI) Framework.
    Evaluates whether an information transmission complies with social privacy norms
    across 5 parameters: Sender, Recipient, Subject, Attribute, and Transmission Principle.
    """

    TRUSTED_ROLES = {
        "doctor": {"treatment", "emergency", "medical", "diagnosis", "care"},
        "nurse": {"treatment", "emergency", "care"},
        "teacher": {"education", "academic", "emergency", "grading", "school"},
        "professor": {"academic", "research", "education"},
        "attorney": {"legal", "defense", "representation", "compliance"},
        "lawyer": {"legal", "compliance"},
        "employer": {"payroll", "work", "employment", "benefits"}
    }

    UNTRUSTED_RECIPIENTS = {"stranger", "unknown", "public", "advertiser", "marketing", "third_party", "vendor"}
    SUSPICIOUS_PURPOSES = {"advertising", "marketing", "curiosity", "commercial", "monetization", "tracking", "unknown"}

    def __init__(self, detector: Optional[HybridDetector] = None, gemini_client: Optional[GeminiClient] = None, use_llm: bool = False):
        self.detector = detector or HybridDetector()
        self.client = gemini_client or GeminiClient()
        self.use_llm = use_llm

    def _evaluate_ci_norms(self, recipient: str, purpose: str, info_types: set[str], text: str) -> tuple[str, str]:
        """Evaluates CI parameters against the normative rule matrix."""
        rec = (recipient or "unknown").lower().strip()
        pur = (purpose or "unknown").lower().strip()

        # 1. Untrusted recipient check
        if rec in self.UNTRUSTED_RECIPIENTS or any(u in rec for u in self.UNTRUSTED_RECIPIENTS):
            if info_types.intersection({"NAME_STUDENT", "PHONE_NUM", "EMAIL", "STREET_ADDRESS"}):
                return "DENY", f"Norm Violation: Recipient '{rec}' has no legitimate entitlement to sensitive attributes ({list(info_types)})."

        # 2. Suspicious / commercial exploitation purpose check
        if pur in self.SUSPICIOUS_PURPOSES or any(p in pur for p in self.SUSPICIOUS_PURPOSES):
            if info_types:
                return "DENY", f"Norm Violation: Transmission principle '{pur}' violates contextual privacy expectations for private personal data."

        # 3. Trusted domain role matching
        for trusted_rec, legitimate_purposes in self.TRUSTED_ROLES.items():
            if trusted_rec in rec:
                if any(lp in pur for lp in legitimate_purposes) or pur == "emergency":
                    return "ALLOW", f"Norm Compliant: Recipient '{rec}' is authorized to access attributes for appropriate contextual purpose '{pur}'."
                else:
                    return "DENY", f"Norm Violation: Inappropriate transmission principle '{pur}' for professional role '{rec}'."

        # 4. If no PII present, allow
        if not info_types:
            return "ALLOW", "Norm Compliant: No sensitive personal identifiers detected in transmission."

        # 5. Default posture for non-critical attributes
        if info_types.issubset({"USERNAME", "URL_PERSONAL"}):
            return "ALLOW", f"Norm Compliant: Low-sensitivity public identifiers ({list(info_types)}) permissible for general service context."

        # Strict fallback when recipient is unverified
        return "DENY", f"Norm Violation: Transmission of sensitive attributes ({list(info_types)}) to unverified recipient '{rec}' without explicit valid purpose."

    def run(self, case: PrivacyCase) -> MethodResult:
        start_time = time.time()
        
        # 1. Detect entities
        entities = self.detector.detect(case.context)
        info_types = {e.pii_type for e in entities}

        # 2. Evaluate Contextual Integrity norms
        decision, reasoning = self._evaluate_ci_norms(
            case.recipient or "unknown",
            case.purpose or "unknown",
            info_types,
            case.context
        )

        # 3. Optional LLM contextual refinement only if caller explicitly enables LLM
        if self.use_llm and self.client.is_available():
            prompt = (
                f"Contextual Integrity Evaluation:\n"
                f"Text: \"{case.context}\"\n"
                f"Recipient: {case.recipient}\n"
                f"Purpose: {case.purpose}\n"
                f"Detected Attributes: {list(info_types)}\n"
                f"Preliminary Decision: {decision}\n\n"
                f"Evaluate if this transmission respects social privacy norms according to Contextual Integrity. "
                f"Respond with a single JSON object: {{\"decision\": \"ALLOW\" | \"DENY\", \"ci_reasoning\": \"short 1-2 sentence explanation\"}}"
            )
            llm_res = self.client.generate_json(prompt)
            if llm_res and isinstance(llm_res, dict):
                llm_decision = str(llm_res.get("decision") or "").strip().upper()
                if llm_decision in {"ALLOW", "DENY"} and not (decision == "DENY" and llm_decision == "ALLOW"):
                    decision = llm_decision
                    reasoning = str(llm_res.get("ci_reasoning") or reasoning)

        # 4. Generate protected text: if DENY, redact offending entities
        protected_text = case.context
        masked_entities = []
        if decision == "DENY":
            for ent in sorted(entities, key=lambda x: x.start, reverse=True):
                replacement = f"[REDACTED_{ent.pii_type}]"
                protected_text = protected_text[:ent.start] + replacement + protected_text[ent.end:]
                masked_entities.append(ent)

        latency = (time.time() - start_time) * 1000

        return MethodResult(
            case_id=case.case_id,
            method_name="privacylens",
            original_text=case.context,
            protected_text=protected_text,
            detected_entities=entities,
            masked_entities=masked_entities,
            privacy_decision=decision,
            reasoning=reasoning,
            latency_ms=latency,
            metadata={
                "ci_parameters": {
                    "recipient": case.recipient,
                    "purpose": case.purpose,
                    "info_types": list(info_types)
                },
                "strategy": "contextual_integrity_norm_evaluation"
            }
        )

MethodRegistry.register("privacylens", PrivacyLensMethod)
