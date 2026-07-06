from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseTool(ABC):
    """
    Abstract base class for all MARK 45 Tools.
    """
    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the tool."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Detailed description of what the tool does."""
        pass

    @property
    @abstractmethod
    def json_schema(self) -> Dict[str, Any]:
        """JSON Schema of the tool's expected arguments."""
        pass

    @abstractmethod
    def validate(self, args: Dict[str, Any]) -> bool:
        """Validates input arguments against the schema constraints."""
        pass

    @abstractmethod
    def run(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes the tool logic.
        Returns:
            Dict: {'ok': bool, 'output': str, 'error': str}
        """
        pass
