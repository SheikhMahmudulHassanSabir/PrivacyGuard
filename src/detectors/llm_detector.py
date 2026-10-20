import uuid
import logging
from typing import List
from src.core.schemas import PIIEntity
from src.detectors.base import BaseDetector
from src.core.gemini_client import GeminiClient

logger = logging.getLogger(__name__)

class LLMDetector(BaseDetector):
    """
    LLM-powered contextual PII entity extractor using Google Gemini.
    Performs zero-shot and domain-aware entity identification.
    """
    
    SYSTEM_PROMPT = """You are a specialized Privacy & PII Extraction Engine.
Analyze the provided text and identify all Personally Identifiable Information (PII) spans.
Supported PII categories:
- NAME_STUDENT: Names of students, clients, patients, or individuals
- EMAIL: Email addresses
- PHONE_NUM: Telephone or mobile contact numbers
- STREET_ADDRESS: Physical residential, corporate, or studio street addresses
- USERNAME: Usernames, online handles, or account IDs
- URL_PERSONAL: Personal websites, portfolio URLs, or profile links

Return ONLY a valid JSON list of objects with the exact schema:
[
  {
    "text": "exact substring from input text",
    "pii_type": "one of the supported categories",
    "start": zero-based start character index,
    "end": zero-based end character index,
    "confidence": float between 0.0 and 1.0
  }
]
Important: Ensure text[start:end] exactly equals the "text" field."""

    def __init__(self, client: GeminiClient = None):
        self.client = client or GeminiClient()

    def detect(self, text: str) -> List[PIIEntity]:
        if not self.client.is_available():
            logger.debug("Gemini client is not active; skipping LLM detection pass.")
            return []

        prompt = f"Extract all PII from the following text:\n\n\"\"\"\n{text}\n\"\"\""
        
        result_json = self.client.generate_json(prompt, system_instruction=self.SYSTEM_PROMPT)
        if not result_json or not isinstance(result_json, list):
            return []

        entities: List[PIIEntity] = []
        for item in result_json:
            if not isinstance(item, dict):
                continue
            
            ent_text = item.get("text", "")
            pii_type = item.get("pii_type", "")
            start = item.get("start")
            end = item.get("end")
            confidence = float(item.get("confidence", 0.9))

            if not ent_text or not pii_type:
                continue

            # Check/recompute offsets if LLM offsets drifted slightly
            if isinstance(start, int) and isinstance(end, int) and 0 <= start < end <= len(text):
                if text[start:end] == ent_text:
                    entities.append(PIIEntity(
                        entity_id=str(uuid.uuid4()),
                        text=ent_text,
                        pii_type=pii_type,
                        start=start,
                        end=end,
                        label=pii_type,
                        confidence=confidence
                    ))
                    continue

            # Fallback exact search if indices drifted
            found_idx = text.find(ent_text)
            if found_idx != -1:
                entities.append(PIIEntity(
                    entity_id=str(uuid.uuid4()),
                    text=ent_text,
                    pii_type=pii_type,
                    start=found_idx,
                    end=found_idx + len(ent_text),
                    label=pii_type,
                    confidence=confidence
                ))

        entities.sort(key=lambda e: e.start)
        return entities
