import os
import logging
from typing import Dict, Any
from mark45.tools.base import BaseTool

logger = logging.getLogger("mark45.tools.file_tool")

# Define our absolute sandbox path
BASE_SANDBOX_DIR = os.path.abspath(
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sandbox")
)

# Ensure sandbox directory exists
os.makedirs(BASE_SANDBOX_DIR, exist_ok=True)

def resolve_safe_path(user_path: str) -> str:
    """
    Resolves user path against sandbox directory and checks for path traversal.
    Returns:
        str: Absolute safe path or raises ValueError if unsafe.
    """
    # Remove leading slashes/drives to prevent escaping
    clean_path = os.path.normpath(user_path).lstrip(os.path.sep).lstrip("/")
    
    # Resolve absolute path
    resolved_path = os.path.abspath(os.path.join(BASE_SANDBOX_DIR, clean_path))
    
    # Check if resolved path is inside sandbox directory
    if not resolved_path.startswith(BASE_SANDBOX_DIR):
        raise ValueError(f"Access Denied: Path '{user_path}' escapes the sandbox directory.")
        
    return resolved_path

class ReadFileTool(BaseTool):
    @property
    def name(self) -> str:
        return "read_file"

    @property
    def description(self) -> str:
        return "Reads the content of a file inside the sandbox. Arguments: 'path' (relative file path)."

    @property
    def json_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Relative path to the file inside sandbox"}
            },
            "required": ["path"]
        }

    def validate(self, args: Dict[str, Any]) -> bool:
        return "path" in args and isinstance(args["path"], str)

    def run(self, args: Dict[str, Any]) -> Dict[str, Any]:
        if not self.validate(args):
            return {"ok": False, "output": "", "error": "Invalid arguments. Required: 'path'."}

        user_path = args["path"]
        try:
            safe_path = resolve_safe_path(user_path)
            
            if not os.path.exists(safe_path):
                return {"ok": False, "output": "", "error": f"File '{user_path}' does not exist."}
                
            if os.path.isdir(safe_path):
                return {"ok": False, "output": "", "error": f"Path '{user_path}' is a directory. Use list_dir tool."}

            with open(safe_path, "r", encoding="utf-8") as f:
                content = f.read()
            return {"ok": True, "output": content, "error": ""}
        except ValueError as ve:
            return {"ok": False, "output": "", "error": str(ve)}
        except Exception as e:
            return {"ok": False, "output": "", "error": f"Failed to read file: {e}"}

class WriteFileTool(BaseTool):
    @property
    def name(self) -> str:
        return "write_file"

    @property
    def description(self) -> str:
        return "Writes content to a file inside the sandbox, creating directories if needed. Arguments: 'path' (relative path), 'content' (file content)."

    @property
    def json_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Relative path to the file inside sandbox"},
                "content": {"type": "string", "description": "Text content to write to the file"}
            },
            "required": ["path", "content"]
        }

    def validate(self, args: Dict[str, Any]) -> bool:
        return "path" in args and "content" in args and isinstance(args["path"], str) and isinstance(args["content"], str)

    def run(self, args: Dict[str, Any]) -> Dict[str, Any]:
        if not self.validate(args):
            return {"ok": False, "output": "", "error": "Invalid arguments. Required: 'path' and 'content'."}

        user_path = args["path"]
        content = args["content"]
        try:
            safe_path = resolve_safe_path(user_path)
            
            # Create parent directories if they don't exist
            os.makedirs(os.path.dirname(safe_path), exist_ok=True)
            
            with open(safe_path, "w", encoding="utf-8") as f:
                f.write(content)
            return {"ok": True, "output": f"Successfully wrote to file '{user_path}'.", "error": ""}
        except ValueError as ve:
            return {"ok": False, "output": "", "error": str(ve)}
        except Exception as e:
            return {"ok": False, "output": "", "error": f"Failed to write file: {e}"}
