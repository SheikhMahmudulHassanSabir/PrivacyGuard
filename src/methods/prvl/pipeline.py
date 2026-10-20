import time
from typing import Dict, List, Optional
from src.core.pipeline import PrivacyMethod
from src.core.schemas import PrivacyCase, MethodResult, PIIEntity
from src.detectors.hybrid_detector import HybridDetector
from src.core.registry import MethodRegistry

class PRvLMethod(PrivacyMethod):
    """
    PRvL: Privacy-Preserving Reasoning via Logic.
    Extracts sensitive entities and performs deterministic canonical symbolic tokenization
    (<PERSON_1>, <EMAIL_1>), accompanied by first-order logic rule constraint proofs.
    """

    TYPE_PREFIXES = {
        "NAME_STUDENT": "PERSON",
        "EMAIL": "EMAIL",
        "PHONE_NUM": "PHONE",
        "STREET_ADDRESS": "ADDRESS",
        "USERNAME": "USER",
        "URL_PERSONAL": "URL"
    }

    def __init__(self, detector: Optional[HybridDetector] = None):
        self.detector = detector or HybridDetector()

    def run(self, case: PrivacyCase) -> MethodResult:
        start_time = time.time()
        
        # 1. Detect entities using Hybrid Detector
        entities = self.detector.detect(case.context)
        
        # 2. Build deterministic symbolic variables
        symbolic_map: Dict[str, str] = {}
        type_counters: Dict[str, int] = {}
        
        # Sort entities by start character offset
        entities_sorted = sorted(entities, key=lambda e: e.start)
        for ent in entities_sorted:
            if ent.text not in symbolic_map:
                prefix = self.TYPE_PREFIXES.get(ent.pii_type, ent.pii_type)
                type_counters[prefix] = type_counters.get(prefix, 0) + 1
                symbolic_var = f"<{prefix}_{type_counters[prefix]}>"
                symbolic_map[ent.text] = symbolic_var

        # 3. Apply canonical symbolic replacement (in reverse offset order)
        protected_text = case.context
        for ent in sorted(entities, key=lambda e: e.start, reverse=True):
            sym_var = symbolic_map.get(ent.text, f"<{ent.pii_type}>")
            protected_text = protected_text[:ent.start] + sym_var + protected_text[ent.end:]

        # 4. First-Order Logic Verification
        # Check composite identity predicate: HasName ^ (HasContact v HasAddress)
        detected_types = {e.pii_type for e in entities}
        has_name = "NAME_STUDENT" in detected_types
        has_contact = bool(detected_types.intersection({"EMAIL", "PHONE_NUM"}))
        has_address = "STREET_ADDRESS" in detected_types

        logic_predicates = [
            f"HasEntity({t})" for t in detected_types
        ]
        
        if has_name and (has_contact or has_address):
            logic_proof = "PROHIBIT_DISCLOSURE: CompositeIdentityDetected(NAME ^ (CONTACT v ADDRESS)) -> StrictRedactionRequired"
        else:
            logic_proof = f"ALLOW_SYMBOLIC_SUBSTITUTION: IndependentAttributes({len(entities)}) -> CanonicalDeIdentificationApplied"

        latency = (time.time() - start_time) * 1000

        return MethodResult(
            case_id=case.case_id,
            method_name="prvl",
            original_text=case.context,
            protected_text=protected_text,
            detected_entities=entities,
            masked_entities=entities,
            latency_ms=latency,
            reasoning=f"PRvL symbolic transformation applied. Logic Proof: {logic_proof}",
            metadata={
                "symbolic_map": symbolic_map,
                "logic_predicates": logic_predicates,
                "logic_proof": logic_proof,
                "strategy": "symbolic_logic_canonicalization"
            }
        )

MethodRegistry.register("prvl", PRvLMethod)
