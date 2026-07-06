import logging
from typing import Dict, List, Any, Optional
from mark45.tools.base import BaseTool

logger = logging.getLogger("mark45.tools.registry")

class ToolRegistry:
    """
    Registry for managing and listing tools available to MARK 45 agents.
    """
    def __init__(self):
        self.tools: Dict[str, BaseTool] = {}

    def register(self, tool: BaseTool):
        """Registers a tool."""
        logger.info(f"Registering tool: {tool.name}")
        self.tools[tool.name] = tool

    def get_tool(self, name: str) -> Optional[BaseTool]:
        """Retrieves a tool by name."""
        return self.tools.get(name)

    def list_tools(self) -> List[BaseTool]:
        """Lists all registered tools."""
        return list(self.tools.values())

    def list_schemas(self) -> List[Dict[str, Any]]:
        """Lists json schemas for all registered tools."""
        return [
            {
                "name": t.name,
                "description": t.description,
                "parameters": t.json_schema
            }
            for t in self.tools.values()
        ]
