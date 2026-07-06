import os
import subprocess
import logging
from typing import Dict, Any
from mark45.tools.base import BaseTool
from mark45.tools.file_tool import BASE_SANDBOX_DIR

logger = logging.getLogger("mark45.tools.terminal_tool")

class TerminalTool(BaseTool):
    # Allowlisted commands and prefixes
    ALLOWED_COMMANDS = [
        "git status",
        "git diff",
        "pwd",
        "python --version"
    ]
    
    ALLOWED_PREFIXES = [
        "dir",
        "ls",
        "cat",
        "type",
        "echo"
    ]

    @property
    def name(self) -> str:
        return "run_command"

    @property
    def description(self) -> str:
        return (
            "Executes basic allowlisted terminal commands (dir, ls, cat, type, echo, git status/diff, pwd) "
            "inside the sandbox. Timeout is enforced. Arguments: 'command' (command string)."
        )

    @property
    def json_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "Terminal command to run"}
            },
            "required": ["command"]
        }

    def validate(self, args: Dict[str, Any]) -> bool:
        if "command" not in args or not isinstance(args["command"], str):
            return False
            
        cmd = args["command"].strip()
        
        # Check direct matches
        if cmd in self.ALLOWED_COMMANDS:
            return True
            
        # Check prefix matches (with space separator or exact matches)
        for prefix in self.ALLOWED_PREFIXES:
            if cmd == prefix or cmd.startswith(prefix + " "):
                # Enforce no chaining or redirect characters like ;, &&, ||, |, >, <
                forbidden_chars = [";", "&&", "||", "|", ">", "<", "`", "$"]
                if any(char in cmd for char in forbidden_chars):
                    logger.warning(f"Terminal Command validation rejected due to forbidden characters: '{cmd}'")
                    return False
                return True
                
        return False

    def run(self, args: Dict[str, Any]) -> Dict[str, Any]:
        if not self.validate(args):
            return {
                "ok": False,
                "output": "",
                "error": "Access Denied: Command is not in the allowlist or contains unauthorized operators."
            }

        command = args["command"].strip()
        try:
            # Execute with shell=True to support builtins like 'dir' or 'echo' on Windows
            # Run within BASE_SANDBOX_DIR to isolate operations
            result = subprocess.run(
                command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=5.0,
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
                "error": "Execution Timeout: Command execution exceeded 5.0 second limit."
            }
        except Exception as e:
            return {
                "ok": False,
                "output": "",
                "error": f"Failed to execute command: {e}"
            }
