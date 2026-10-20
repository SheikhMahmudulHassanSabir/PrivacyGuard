from abc import ABC, abstractmethod
from typing import List
from src.core.schemas import PIIEntity

class BaseDetector(ABC):
    @abstractmethod
    def detect(self, text: str) -> List[PIIEntity]:
        pass
