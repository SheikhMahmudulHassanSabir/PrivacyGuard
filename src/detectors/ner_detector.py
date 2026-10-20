import re
import uuid
from typing import List
from src.core.schemas import PIIEntity
from src.detectors.base import BaseDetector

class NERDetector(BaseDetector):
    """
    Contextual Named Entity Recognizer (NER) focusing on proper names (NAME_STUDENT)
    and location/address structures (STREET_ADDRESS).
    """

    HONORIFICS = {
        "mr", "mrs", "ms", "miss", "dr", "prof", "professor", "manager",
        "director", "engineer", "developer", "jeweler", "attorney", "counsel",
        "patient", "client", "student", "officer", "coordinator", "nurse"
    }

    ADDRESS_KEYWORDS = {
        "street", "st", "avenue", "ave", "boulevard", "blvd", "terrace", "ter",
        "road", "rd", "way", "lane", "ln", "drive", "dr", "court", "ct", "place",
        "pl", "square", "sq", "highway", "hwy", "suite", "apt", "apartment", "building"
    }

    def __init__(self):
        # Capitalized multi-word name candidates (2 to 3 capitalized words)
        self.name_candidate_pattern = re.compile(
            r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b'
        )
        
        # Address patterns with digits followed by street name
        self.address_context_pattern = re.compile(
            r'\b(\d{1,5}\s+(?:[A-Z0-9][a-zA-Z0-9.-]+\s+){1,4}(?:' + '|'.join(self.ADDRESS_KEYWORDS) + r')(?:\s+(?:North|South|East|West|NE|NW|SE|SW))?)\b',
            re.IGNORECASE
        )

    def detect(self, text: str) -> List[PIIEntity]:
        entities: List[PIIEntity] = []
        occupied_spans = set()

        def add_entity(pii_type: str, start: int, end: int, matched_text: str, confidence: float):
            while end > start and matched_text and matched_text[-1] in ".,;:!?)":
                matched_text = matched_text[:-1]
                end -= 1
            while start < end and matched_text and matched_text[0] in "([<":
                matched_text = matched_text[1:]
                start += 1

            if start >= end or not matched_text:
                return

            if text[start:end] != matched_text:
                return

            span_key = (start, end)
            if span_key in occupied_spans:
                return
            occupied_spans.add(span_key)

            entities.append(PIIEntity(
                entity_id=str(uuid.uuid4()),
                text=matched_text,
                pii_type=pii_type,
                start=start,
                end=end,
                label=pii_type,
                confidence=confidence
            ))

        # 1. Detect Contextual Street Addresses
        for match in self.address_context_pattern.finditer(text):
            add_entity("STREET_ADDRESS", match.start(1), match.end(1), match.group(1), 0.88)

        # 2. Contextual Name Recognition with syntactic and surrounding context scoring
        for match in self.name_candidate_pattern.finditer(text):
            candidate = match.group(1)
            start = match.start(1)
            end = match.end(1)

            # Check context before the name (honorific, intro, role)
            before_start = max(0, start - 30)
            prefix = text[before_start:start].lower().strip()
            tokens_before = prefix.split()
            last_word_before = tokens_before[-1] if tokens_before else ""

            confidence = 0.65 # Base candidate confidence

            # Boost if preceded by title, role or introductory phrase
            prefix_tokens = {t.strip(".,;:()") for t in tokens_before[-3:]}
            if prefix_tokens & self.HONORIFICS:
                confidence += 0.25
            elif re.search(r'\b(?:my name is|i am|name is|regarding|contact|about)\s*$', prefix):
                confidence += 0.25
            elif start == 0:
                # Starting document with a name
                confidence += 0.15

            # Deduct confidence if candidate words are common non-name words (e.g., "The New", "Last Year")
            words = candidate.split()
            common_words = {"The", "Last", "Next", "First", "Second", "Once", "When", "If", "However", "Because", "Using"}
            if any(w in common_words for w in words):
                confidence -= 0.35

            if confidence >= 0.70:
                add_entity("NAME_STUDENT", start, end, candidate, min(1.0, round(confidence, 2)))

        entities.sort(key=lambda e: e.start)
        return entities
