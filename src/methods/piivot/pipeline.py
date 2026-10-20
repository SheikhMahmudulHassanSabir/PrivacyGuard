import time
import hashlib
from typing import Dict, List, Optional
from src.core.pipeline import PrivacyMethod
from src.core.schemas import PrivacyCase, MethodResult, PIIEntity
from src.detectors.hybrid_detector import HybridDetector
from src.core.registry import MethodRegistry

class PIIvotMethod(PrivacyMethod):
    """
    PIIvot: Context-Preserving Synthetic Pseudonymization.
    Replaces sensitive PII entities with realistic synthetic surrogates
    preserving grammatical categories, semantic fluidity, and casing.
    """

    SYNTHETIC_NAMES = [
        "Alex Morgan", "Jordan Taylor", "Casey Rivera", "Taylor Brooks",
        "Morgan Bailey", "Riley Campbell", "Avery Reed", "Reese Parker",
        "Cameron Hayes", "Dakota Ellis", "Kendall Ward", "Skyler Bennett"
    ]

    SYNTHETIC_STREETS = [
        "104 Maple Street", "742 Evergreen Terrace", "350 Fifth Avenue",
        "820 Pine Boulevard", "214 Oak Lane", "567 Willow Way"
    ]

    def __init__(self, detector: Optional[HybridDetector] = None):
        self.detector = detector or HybridDetector()

    def _generate_surrogate(self, entity: PIIEntity, surrogate_map: Dict[str, str]) -> str:
        """Deterministically generates a realistic synthetic surrogate for the entity."""
        raw_text = entity.text.strip()
        if raw_text in surrogate_map:
            return surrogate_map[raw_text]

        # Use hash of entity text for consistent pseudonymization across the document
        h = int(hashlib.md5(raw_text.encode('utf-8')).hexdigest(), 16)

        if entity.pii_type == "NAME_STUDENT":
            surrogate = self.SYNTHETIC_NAMES[h % len(self.SYNTHETIC_NAMES)]
        elif entity.pii_type == "EMAIL":
            user_part = f"user_{h % 1000}"
            surrogate = f"{user_part}@synthetic-privacy.org"
        elif entity.pii_type == "PHONE_NUM":
            area_code = 555
            part1 = 100 + (h % 900)
            part2 = 1000 + ((h // 1000) % 9000)
            surrogate = f"({area_code}) {part1}-{part2}"
        elif entity.pii_type == "STREET_ADDRESS":
            surrogate = self.SYNTHETIC_STREETS[h % len(self.SYNTHETIC_STREETS)]
        elif entity.pii_type == "USERNAME":
            surrogate = f"@user_{h % 9999}"
        elif entity.pii_type == "URL_PERSONAL":
            surrogate = f"https://profile.synthetic.org/{h % 1000}"
        else:
            surrogate = f"[{entity.pii_type}]"

        surrogate_map[raw_text] = surrogate
        return surrogate

    def run(self, case: PrivacyCase) -> MethodResult:
        start_time = time.time()
        
        # 1. Detect entities using Hybrid Detector
        entities = self.detector.detect(case.context)
        
        # 2. Context-preserving surrogate substitution
        # Sort reverse to avoid invalidating offsets during replacement
        sorted_entities = sorted(entities, key=lambda x: x.start, reverse=True)
        surrogate_map: Dict[str, str] = {}
        protected_text = case.context
        masked_entities: List[PIIEntity] = []

        for ent in sorted_entities:
            surrogate = self._generate_surrogate(ent, surrogate_map)
            protected_text = protected_text[:ent.start] + surrogate + protected_text[ent.end:]
            masked_entities.append(ent)

        latency = (time.time() - start_time) * 1000

        return MethodResult(
            case_id=case.case_id,
            method_name="piivot",
            original_text=case.context,
            protected_text=protected_text,
            detected_entities=entities,
            masked_entities=masked_entities,
            latency_ms=latency,
            reasoning=f"PIIvot context-preserving pseudonymization applied to {len(masked_entities)} entities.",
            metadata={
                "surrogate_map": surrogate_map,
                "strategy": "context_preserving_pseudonymization"
            }
        )

MethodRegistry.register("piivot", PIIvotMethod)
