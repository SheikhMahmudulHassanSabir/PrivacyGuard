import os
import json
import logging
from typing import Optional, Dict, Any, Union
import requests
from dotenv import load_dotenv

# Load .env if present
load_dotenv()

logger = logging.getLogger(__name__)

class GeminiClient:
    """
    Lightweight REST client for Google Gemini API.
    Does not require heavy SDKs and works reliably across platforms.
    """
    
    DEFAULT_MODEL = "gemini-1.5-flash"
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "").strip()
        self.model = model or os.getenv("GEMINI_MODEL", self.DEFAULT_MODEL).strip()
        
    def is_available(self) -> bool:
        """Returns True if a non-empty API key is configured."""
        return bool(self.api_key and not self.api_key.startswith("your_"))
        
    def generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        json_mode: bool = False,
        temperature: float = 0.1,
        max_output_tokens: int = 2048
    ) -> Optional[str]:
        """
        Calls the Gemini generateContent REST endpoint.
        """
        if not self.is_available():
            logger.debug("Gemini API key is not configured.")
            return None
            
        endpoint = f"{self.BASE_URL}/{self.model}:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key
        }
        
        payload: Dict[str, Any] = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_output_tokens,
            }
        }
        
        if json_mode:
            payload["generationConfig"]["responseMimeType"] = "application/json"
            
        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }
            
        try:
            resp = requests.post(endpoint, headers=headers, json=payload, timeout=25)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "")
                return None
            else:
                logger.warning(f"Gemini API returned status {resp.status_code}: {resp.text[:200]}")
                return None
        except Exception as e:
            logger.warning(f"Gemini API request failed: {e}")
            return None
            
    def generate_json(
        self,
        prompt: str,
        system_instruction: Optional[str] = None
    ) -> Optional[Union[Dict[str, Any], list]]:
        """
        Generates content and parses as JSON.
        """
        raw = self.generate_content(prompt, system_instruction=system_instruction, json_mode=True)
        if not raw:
            return None
        try:
            # Clean possible markdown fence if present
            cleaned = raw.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            return json.loads(cleaned.strip())
        except Exception as e:
            logger.warning(f"Failed to parse Gemini JSON output: {e}\nRaw output: {raw[:300]}")
            return None
