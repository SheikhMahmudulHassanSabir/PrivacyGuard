import re
import uuid
from typing import List
from src.core.schemas import PIIEntity
from src.detectors.base import BaseDetector

class RegexDetector(BaseDetector):
    """
    High-precision deterministic pattern detector covering all 6 schema categories:
    EMAIL, PHONE_NUM, URL_PERSONAL, USERNAME, STREET_ADDRESS, and NAME_STUDENT.
    """
    
    def __init__(self):
        # Deterministic regular expressions for structured identifiers
        self.email_pattern = re.compile(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'
        )
        
        self.phone_pattern = re.compile(
            r'(?:\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,6}\b|\b\d{10}\b)'
        )
        
        self.url_pattern = re.compile(
            r'\b(?:https?://[^\s<>"]+|www\.[^\s<>"]+|[A-Za-z0-9.-]+\.(?:com|org|net|edu|gov|io|ai|co|info|me)\b(?:/[^\s<>"]*)?)'
        )
        
        self.username_pattern = re.compile(
            r'(?<=[\s(])@[A-Za-z0-9_]{3,25}\b|\busername:\s*([A-Za-z0-9_-]{3,20})\b',
            re.IGNORECASE
        )
        
        self.address_pattern = re.compile(
            r'\b\d{1,5}\s+(?:[A-Z][a-z]+\s+){1,3}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Terrace|Ter|Road|Rd|Way|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Square|Sq|Highway|Hwy)(?:\s+(?:North|South|East|West|NE|NW|SE|SW))?\b',
            re.IGNORECASE
        )
        
        self.intro_name_pattern = re.compile(
            r'\b(?:My name is|I am|As)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b'
        )

    def detect(self, text: str) -> List[PIIEntity]:
        entities: List[PIIEntity] = []
        occupied_spans = set()
        
        def add_entity(pii_type: str, start: int, end: int, matched_text: str, confidence: float = 1.0):
            # Trim trailing punctuation (dot, comma, semicolon) from boundary if it is not part of the token
            while end > start and matched_text and matched_text[-1] in ".,;:!?)":
                matched_text = matched_text[:-1]
                end -= 1
            while start < end and matched_text and matched_text[0] in "([<":
                matched_text = matched_text[1:]
                start += 1
                
            if start >= end or not matched_text:
                return
                
            # Verify slice invariant
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

        # 1. EMAIL
        for match in self.email_pattern.finditer(text):
            add_entity("EMAIL", match.start(), match.end(), match.group(), 1.0)
            
        # 2. PHONE_NUM
        for match in self.phone_pattern.finditer(text):
            # Filter out obvious false positives like dates or pure 4-digit years
            matched_str = match.group()
            digits_only = re.sub(r'\D', '', matched_str)
            if 7 <= len(digits_only) <= 15:
                add_entity("PHONE_NUM", match.start(), match.end(), matched_str, 0.95)
                
        # 3. URL_PERSONAL
        for match in self.url_pattern.finditer(text):
            url_str = match.group()
            # If not an email
            if "@" not in url_str:
                add_entity("URL_PERSONAL", match.start(), match.end(), url_str, 0.90)
                
        # 4. USERNAME
        for match in self.username_pattern.finditer(text):
            add_entity("USERNAME", match.start(), match.end(), match.group(), 0.85)
            
        # 5. STREET_ADDRESS
        for match in self.address_pattern.finditer(text):
            add_entity("STREET_ADDRESS", match.start(), match.end(), match.group(), 0.90)
            
        # 6. NAME_STUDENT via clear syntactical anchors
        for match in self.intro_name_pattern.finditer(text):
            if match.lastindex and match.lastindex >= 1:
                name_start = match.start(1)
                name_end = match.end(1)
                name_str = match.group(1)
                add_entity("NAME_STUDENT", name_start, name_end, name_str, 0.85)

        # Sort entities by start character offset
        entities.sort(key=lambda e: e.start)
        return entities
