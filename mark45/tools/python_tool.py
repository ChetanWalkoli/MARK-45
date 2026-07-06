import os
import sys
import uuid
import logging
import subprocess
from typing import Dict, Any
from mark45.tools.base import BaseTool
from mark45.tools.file_tool import BASE_SANDBOX_DIR

logger = logging.getLogger("mark45.tools.python_tool")

class PythonTool(BaseTool):
    @property
    def name(self) -> str:
        return "run_python"

    @property
    def description(self) -> str:
        return (
            "Executes a Python script in a sandboxed subprocess. "
            "Returns stdout and stderr. Arguments: 'code' (Python source code string)."
        )

    @property
    def json_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "Executable Python source code"}
            },
            "required": ["code"]
        }

    def validate(self, args: Dict[str, Any]) -> bool:
        return "code" in args and isinstance(args["code"], str)

    def run(self, args: Dict[str, Any]) -> Dict[str, Any]:
        if not self.validate(args):
            return {"ok": False, "output": "", "error": "Invalid arguments. Required: 'code'."}

        code = args["code"]
        
        # Write to a temporary file inside sandbox
        temp_filename = f"temp_run_{uuid.uuid4().hex[:8]}.py"
        temp_filepath = os.path.join(BASE_SANDBOX_DIR, temp_filename)
        
        try:
            with open(temp_filepath, "w", encoding="utf-8") as f:
                f.write(code)
            
            # Execute script via subprocess with a strict timeout (10 seconds)
            # Use current sys.executable to ensure we run under active virtual env
            cmd = [sys.executable, temp_filepath]
            
            result = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=10.0,
                cwd=BASE_SANDBOX_DIR
            )
            
            output = result.stdout
            error = result.stderr
            ok = (result.returncode == 0)
            
            if not ok and not error:
                error = f"Process exited with status code {result.returncode}"
                
            return {
                "ok": ok,
                "output": output,
                "error": error
            }
        except subprocess.TimeoutExpired:
            return {
                "ok": False,
                "output": "",
                "error": "Execution Timeout: Python script execution exceeded 10.0 second limit."
            }
        except Exception as e:
            return {
                "ok": False,
                "output": "",
                "error": f"Execution failed: {e}"
            }
        finally:
            # Cleanup temporary file
            if os.path.exists(temp_filepath):
                try:
                    os.remove(temp_filepath)
                except Exception as e:
                    logger.warning(f"Failed to cleanup temp file '{temp_filepath}': {e}")
