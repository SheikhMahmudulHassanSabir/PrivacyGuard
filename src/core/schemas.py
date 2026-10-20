from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class PIIEntity(BaseModel):
    entity_id: str
    text: str
    pii_type: str
    start: int
    end: int
    label: str
    confidence: Optional[float] = None

class PrivacyCase(BaseModel):
    case_id: str
    query: Optional[str] = None
    context: str
    response: Optional[str] = None
    entities: List[PIIEntity] = Field(default_factory=list)
    recipient: Optional[str] = None
    purpose: Optional[str] = None
    expected_decision: Optional[str] = None

class MethodResult(BaseModel):
    case_id: str
    method_name: str
    original_text: str
    protected_text: Optional[str] = None
    detected_entities: List[PIIEntity] = Field(default_factory=list)
    masked_entities: List[PIIEntity] = Field(default_factory=list)
    kept_entities: List[PIIEntity] = Field(default_factory=list)
    privacy_decision: Optional[str] = None
    reasoning: Optional[str] = None
    latency_ms: float
    token_usage: Optional[int] = None
    estimated_cost: Optional[float] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
