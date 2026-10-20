import time
from typing import Dict, List, Optional
from src.core.pipeline import PrivacyMethod
from src.core.schemas import PrivacyCase, MethodResult
from src.detectors.hybrid_detector import HybridDetector
from src.core.gemini_client import GeminiClient
from src.core.registry import MethodRegistry

class ConfAIDEMethod(PrivacyMethod):
    """
    ConfAIde: Multi-Factor Contextual Privacy Risk Reasoning.
    Assesses contextual disclosure risk across Domain Sensitivity, Entity Exposure,
    Recipient Trust, and Purpose Necessity, mapping to standard schema risk tiers.
    """

    DOMAIN_WEIGHTS = {
        "healthcare": 0.95,
        "finance": 0.90,
        "legal": 0.85,
        "education": 0.60,
        "corporate_business": 0.55,
        "aviation_transport": 0.45,
        "science": 0.40,
        "technology": 0.35,
        "creative_media": 0.30,
        "services": 0.30,
        "general_professional": 0.35
    }

    TRUSTED_RECIPIENTS = {"doctor", "nurse", "physician", "teacher", "professor", "attorney", "lawyer"}
    HIGH_RISK_RECIPIENTS = {"stranger", "unknown", "public", "advertiser", "marketing", "vendor"}

    def __init__(self, detector: Optional[HybridDetector] = None, gemini_client: Optional[GeminiClient] = None, use_llm: bool = False):
        self.detector = detector or HybridDetector()
        self.client = gemini_client or GeminiClient()
        self.use_llm = use_llm

    def _infer_domain(self, text: str) -> str:
        """Infers the operational domain from keywords in the text."""
        tl = text.lower()
        if any(w in tl for w in ["patient", "doctor", "asthma", "medical", "treatment", "hospital", "clinic"]):
            return "healthcare"
        if any(w in tl for w in ["bank", "account", "credit", "financial", "ssn", "tax", "loan"]):
            return "finance"
        if any(w in tl for w in ["student", "teacher", "school", "grade", "class", "university"]):
            return "education"
        if any(w in tl for w in ["legal", "court", "attorney", "counsel", "lawyer", "lawsuit"]):
            return "legal"
        if any(w in tl for w in ["developer", "code", "software", "portal", "platform", "backend"]):
            return "technology"
        if any(w in tl for w in ["jeweler", "restored", "craft", "studio", "repair", "necklace"]):
            return "services"
        if any(w in tl for w in ["flight", "aviation", "radar", "airport", "planes"]):
            return "aviation_transport"
        return "general_professional"

    def _calculate_risk(self, domain: str, entity_types: set[str], recipient: str, purpose: str) -> tuple[float, str, dict]:
        """Calculates multi-factor risk score according to ConfAIde methodology."""
        # 1. Domain sensitivity (Sd)
        s_d = self.DOMAIN_WEIGHTS.get(domain, 0.40)

        # 2. Entity exposure factor (Se)
        has_name = "NAME_STUDENT" in entity_types
        has_direct_contact = bool(entity_types.intersection({"PHONE_NUM", "EMAIL", "STREET_ADDRESS"}))
        has_weak = bool(entity_types.intersection({"USERNAME", "URL_PERSONAL"}))

        if has_name and has_direct_contact:
            s_e = 0.90 # Composite critical identity disclosure
        elif has_direct_contact:
            s_e = 0.70
        elif has_name:
            s_e = 0.45
        elif has_weak:
            s_e = 0.20
        else:
            s_e = 0.05

        # 3. Recipient trust factor (Tr)
        rec = (recipient or "unknown").lower()
        if any(tr in rec for tr in self.TRUSTED_RECIPIENTS):
            t_r = 0.20
        elif any(hr in rec for hr in self.HIGH_RISK_RECIPIENTS):
            t_r = 0.90
        else:
            t_r = 0.60

        # 4. Purpose necessity factor (Pn)
        pur = (purpose or "unknown").lower()
        if "emergency" in pur or "vital" in pur:
            p_n = 0.10
        elif any(legit in pur for legit in ["treatment", "education", "service", "academic", "repair", "work"]):
            p_n = 0.30
        elif any(susp in pur for susp in ["advertising", "marketing", "curiosity", "unknown"]):
            p_n = 0.85
        else:
            p_n = 0.65

        # Weighted aggregate score
        risk_score = round(0.40 * s_e + 0.30 * s_d + 0.20 * t_r + 0.10 * p_n, 3)
        risk_score = max(0.0, min(1.0, risk_score))

        # Categorical risk tier
        if risk_score >= 0.80:
            risk_tier = "CRITICAL"
        elif risk_score >= 0.60:
            risk_tier = "HIGH"
        elif risk_score >= 0.35:
            risk_tier = "MEDIUM"
        elif risk_score >= 0.15:
            risk_tier = "LOW"
        else:
            risk_tier = "NONE"

        factors = {
            "domain": domain,
            "domain_sensitivity": s_d,
            "entity_exposure": s_e,
            "recipient_trust": t_r,
            "purpose_necessity": p_n,
            "risk_score": risk_score,
            "risk_tier": risk_tier
        }

        return risk_score, risk_tier, factors

    def run(self, case: PrivacyCase) -> MethodResult:
        start_time = time.time()
        
        # 1. Detect entities
        entities = self.detector.detect(case.context)
        entity_types = {e.pii_type for e in entities}

        # 2. Infer domain & compute risk
        domain = self._infer_domain(case.context)
        risk_score, risk_tier, factors = self._calculate_risk(
            domain, entity_types, case.recipient or "unknown", case.purpose or "unknown"
        )

        # 3. Privacy Decision: ALLOW if low/acceptable risk, DENY if high risk
        decision = "DENY" if (risk_score >= 0.50 or risk_tier in ["HIGH", "CRITICAL"]) else "ALLOW"

        # 4. Optional Gemini LLM contextual perception audit (only if use_llm enabled)
        if self.use_llm and self.client.is_available():
            prompt = (
                f"ConfAIde Privacy Risk Perception Audit:\n"
                f"Text: \"{case.context}\"\n"
                f"Recipient: {case.recipient}\n"
                f"Purpose: {case.purpose}\n"
                f"Calculated Risk Score: {risk_score} (Tier: {risk_tier})\n\n"
                f"Does sharing this context violate privacy expectations? "
                f"Respond with JSON: {{\"decision\": \"ALLOW\" | \"DENY\", \"risk_tier\": \"LOW\"|\"MEDIUM\"|\"HIGH\"|\"CRITICAL\", \"reasoning\": \"short explanation\"}}"
            )
            llm_res = self.client.generate_json(prompt)
            if llm_res and isinstance(llm_res, dict):
                llm_decision = str(llm_res.get("decision") or "").strip().upper()
                llm_tier = str(llm_res.get("risk_tier") or "").strip().upper()
                if llm_decision in {"ALLOW", "DENY"} and not (decision == "DENY" and llm_decision == "ALLOW"):
                    decision = llm_decision
                if llm_tier in {"NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"}:
                    risk_tier = llm_tier
                factors["llm_audit"] = str(llm_res.get("reasoning") or "")

        # 5. Redact high-risk entities if DENY
        protected_text = case.context
        masked_entities = []
        if decision == "DENY":
            for ent in sorted(entities, key=lambda x: x.start, reverse=True):
                replacement = f"[{ent.pii_type}]"
                protected_text = protected_text[:ent.start] + replacement + protected_text[ent.end:]
                masked_entities.append(ent)

        latency = (time.time() - start_time) * 1000

        reasoning = (
            f"ConfAIde Risk Assessment: Score={risk_score:.2f} ({risk_tier} Risk). "
            f"Domain '{domain}', Recipient '{case.recipient or 'unspecified'}', Purpose '{case.purpose or 'unspecified'}'. "
            f"Privacy Decision: {decision}."
        )

        return MethodResult(
            case_id=case.case_id,
            method_name="confaide",
            original_text=case.context,
            protected_text=protected_text,
            detected_entities=entities,
            masked_entities=masked_entities,
            privacy_decision=decision,
            reasoning=reasoning,
            latency_ms=latency,
            metadata={
                "risk_score": risk_score,
                "risk_tier": risk_tier,
                "factors": factors,
                "strategy": "multi_factor_risk_reasoning"
            }
        )

MethodRegistry.register("confaide", ConfAIDEMethod)
