from abc import ABC, abstractmethod
from src.core.schemas import PrivacyCase, MethodResult

class PrivacyMethod(ABC):
    """
    Base class for all privacy protection methods.
    """
    
    @abstractmethod
    def run(self, case: PrivacyCase) -> MethodResult:
        """
        Execute the privacy protection method on a single case.
        
        Args:
            case (PrivacyCase): The input privacy case.
            
        Returns:
            MethodResult: The standard result object.
        """
        pass
