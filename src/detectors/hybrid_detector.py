from typing import List, Optional
from src.core.schemas import PIIEntity
from src.detectors.base import BaseDetector
from src.detectors.regex_detector import RegexDetector
from src.detectors.ner_detector import NERDetector
from src.detectors.llm_detector import LLMDetector

class HybridDetector(BaseDetector):
    """
    Ensemble Hybrid Detector combining:
    1. Deterministic Regular Expressions (RegexDetector)
    2. Contextual Sequence/NER Tagging (NERDetector)
    3. Large Language Model Reasoning (LLMDetector - Google Gemini)
    
    Includes multi-stage span conflict resolution, priority routing, and deduplication.
    """

    STRUCTURED_TYPES = {"EMAIL", "PHONE_NUM", "URL_PERSONAL"}

    def __init__(
        self,
        enable_regex: bool = True,
        enable_ner: bool = True,
        enable_llm: bool = True,
        regex_detector: Optional[RegexDetector] = None,
        ner_detector: Optional[NERDetector] = None,
        llm_detector: Optional[LLMDetector] = None
    ):
        self.enable_regex = enable_regex
        self.enable_ner = enable_ner
        self.enable_llm = enable_llm
        
        self.regex_detector = regex_detector or RegexDetector()
        self.ner_detector = ner_detector or NERDetector()
        self.llm_detector = llm_detector or LLMDetector()

    def detect(self, text: str) -> List[PIIEntity]:
        candidates: List[PIIEntity] = []

        # 1. Gather candidates from active detectors
        if self.enable_regex:
            candidates.extend(self.regex_detector.detect(text))

        if self.enable_ner:
            candidates.extend(self.ner_detector.detect(text))

        if self.enable_llm:
            candidates.extend(self.llm_detector.detect(text))

        if not candidates:
            return []

        # 2. Group by exact character span [start, end)
        exact_spans: dict[tuple[int, int], List[PIIEntity]] = {}
        for ent in candidates:
            span = (ent.start, ent.end)
            exact_spans.setdefault(span, []).append(ent)

        deduped: List[PIIEntity] = []
        for span, span_entities in exact_spans.items():
            if len(span_entities) == 1:
                deduped.append(span_entities[0])
            else:
                # If multiple detectors agreed on the exact span, select the highest confidence and boost
                best = max(span_entities, key=lambda e: e.confidence or 0.0)
                boosted_conf = min(1.0, (best.confidence or 0.8) + 0.15)
                best.confidence = round(boosted_conf, 2)
                deduped.append(best)

        # 3. Resolve overlapping intervals
        # Sort by start ascending, then length descending
        deduped.sort(key=lambda e: (e.start, -(e.end - e.start)))

        resolved: List[PIIEntity] = []
        for current in deduped:
            if not resolved:
                resolved.append(current)
                continue

            prev = resolved[-1]
            
            # Check for overlap: current.start < prev.end
            if current.start < prev.end:
                # Conflict resolution:
                # A: If current is a structured type (EMAIL, PHONE) and prev is not, current replaces prev
                if current.pii_type in self.STRUCTURED_TYPES and prev.pii_type not in self.STRUCTURED_TYPES:
                    resolved[-1] = current
                # B: If prev is structured and current is not, keep prev
                elif prev.pii_type in self.STRUCTURED_TYPES and current.pii_type not in self.STRUCTURED_TYPES:
                    continue
                # C: Otherwise, pick the one with higher confidence, or longer length if equal
                elif (current.confidence or 0.0) > (prev.confidence or 0.0):
                    resolved[-1] = current
                elif (current.confidence or 0.0) == (prev.confidence or 0.0) and (current.end - current.start) > (prev.end - prev.start):
                    resolved[-1] = current
                else:
                    # Keep previous
                    continue
            else:
                resolved.append(current)

        resolved.sort(key=lambda e: e.start)
        return resolved
