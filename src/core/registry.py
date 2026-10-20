from typing import Dict, Type
from src.core.pipeline import PrivacyMethod

class MethodRegistry:
    """Registry for managing available privacy methods."""
    
    _methods: Dict[str, Type[PrivacyMethod]] = {}
    
    @classmethod
    def register(cls, name: str, method_cls: Type[PrivacyMethod]):
        cls._methods[name] = method_cls
        
    @classmethod
    def get_method(cls, name: str) -> Type[PrivacyMethod]:
        if name not in cls._methods:
            raise ValueError(f"Method '{name}' is not registered.")
        return cls._methods[name]
        
    @classmethod
    def list_methods(cls) -> list[str]:
        return list(cls._methods.keys())
