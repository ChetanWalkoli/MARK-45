import re
import json
import logging
from typing import List, Dict, Any, Tuple
from mark45.core.model_client import OllamaClient
from mark45.tools.registry import ToolRegistry
from mark45.tools.file_tool import ReadFileTool, WriteFileTool
from mark45.tools.python_tool import PythonTool
from mark45.tools.terminal_tool import TerminalTool

logger = logging.getLogger("mark45.agents.coding_agent")

class CodingAgent:
    """
    ReAct-style coding agent that executes tasks step-by-step
    using allowlisted tools, enforcing timeouts and loop limits.
    """
    def __init__(self, ollama_client: OllamaClient):
        self.client = ollama_client
        self.registry = ToolRegistry()
        
        # Register all Phase 3 tools
        self.registry.register(ReadFileTool())
        self.registry.register(WriteFileTool())
        self.registry.register(PythonTool())
        self.registry.register(TerminalTool())
        
        self.max_steps = 8

    def _get_system_instructions(self) -> str:
        """Constructs the agent's system prompt containing tool schemas and rules."""
        tools_list = self.registry.list_schemas()
        tools_description = ""
        for t in tools_list:
            tools_description += f"- Name: {t['name']}\n  Description: {t['description']}\n  Parameters: {json.dumps(t['parameters'])}\n\n"

        return f"""You are the MARK 45 ReAct Coding Agent.
Your task is to solve coding challenges, write scripts, execute Python code, and perform file operations safely inside the sandbox.

You have access to the following tools:
{tools_description}
At each step of the reasoning loop, you MUST output a single, valid JSON block. Do not output any other text or explanation.

For tool calls, output exactly this structure:
{{
  "thought": "Describe your step-by-step thinking and next action.",
  "action": "tool_name",
  "args": {{ "arg_name": "arg_value" }}
}}

When you have completely resolved the task and verified the output, output exactly this structure:
{{
  "thought": "I have fully completed the task and verified the results.",
  "final_answer": "Provide a summary of the outcome and the final code or answer."
}}

Strict Rules:
1. ONLY write output as a single, valid JSON block.
2. If you write Python code, make sure it is valid, contains prints, and prints output.
3. Paths must be relative paths inside the sandbox (e.g. 'script.py', 'src/math_helper.py').
4. Enforce allowlisted command checks for terminal runs.
5. Solve the task in as few steps as possible. Verify your work using run_python before outputting final_answer.
"""

    def _parse_model_response(self, text: str) -> Dict[str, Any]:
        """
        Parses and extracts JSON object from the model output, handling common markdown issues.
        """
        cleaned = text.strip()
        
        # 1. Strip markdown JSON code blocks if present
        code_block_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', cleaned, re.DOTALL)
        if code_block_match:
            cleaned = code_block_match.group(1)
            
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # 2. Try to find the first '{' and last '}' to extract raw JSON block
            brace_match = re.search(r'(\{.*\})', cleaned, re.DOTALL)
            if brace_match:
                try:
                    return json.loads(brace_match.group(1))
                except json.JSONDecodeError:
                    pass
            raise ValueError(f"Failed to parse model response as JSON. Output was: {text}")

    async def execute_task(self, goal: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Executes the ReAct loop to solve the user's goal.
        Returns:
            Tuple[str, List[Dict[str, Any]]]: (final_answer, execution_steps_log)
        """
        system_prompt = self._get_system_instructions()
        conversation_history = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Your goal is: {goal}\nStart now. Remember to output ONLY a valid JSON block."}
        ]
        
        execution_log = []
        step = 0
        final_answer = ""
        
        logger.info(f"Starting ReAct Agent loop for goal: '{goal}'")
        
        while step < self.max_steps:
            step += 1
            logger.info(f"Agent Loop Step {step}/{self.max_steps}")
            
            # 1. Ask model for next action
            model_raw_response = ""
            try:
                async for chunk in self.client.chat(conversation_history, stream=False):
                    model_raw_response += chunk
            except Exception as e:
                logger.error(f"Failed to communicate with Ollama: {e}")
                execution_log.append({
                    "step": step,
                    "thought": "Failed to query model client.",
                    "error": str(e)
                })
                final_answer = f"Agent failed due to connection error: {e}"
                break

            # 2. Parse model response
            try:
                action_data = self._parse_model_response(model_raw_response)
            except Exception as e:
                logger.warning(f"JSON parsing failed on step {step}: {e}")
                err_msg = f"Output format error: You must output ONLY a valid JSON block matching the schema. Error: {e}"
                conversation_history.append({"role": "assistant", "content": model_raw_response})
                conversation_history.append({"role": "user", "content": err_msg})
                execution_log.append({
                    "step": step,
                    "raw_output": model_raw_response,
                    "error": err_msg
                })
                continue

            thought = action_data.get("thought", "")
            action = action_data.get("action")
            args = action_data.get("args", {})
            
            # Record thought in logs
            log_entry = {
                "step": step,
                "thought": thought,
                "action": action,
                "args": args
            }
            
            # Check if model declared final answer
            if "final_answer" in action_data:
                final_answer = action_data["final_answer"]
                log_entry["final_answer"] = final_answer
                execution_log.append(log_entry)
                logger.info(f"Agent completed goal. Final Answer: {final_answer}")
                break
                
            if not action:
                err_msg = "Error: JSON must contain 'action' and 'args' to call a tool, or 'final_answer' to finish."
                conversation_history.append({"role": "assistant", "content": model_raw_response})
                conversation_history.append({"role": "user", "content": err_msg})
                log_entry["error"] = err_msg
                execution_log.append(log_entry)
                continue

            # 3. Retrieve and execute tool
            tool = self.registry.get_tool(action)
            if not tool:
                observation = f"Error: Tool '{action}' is not registered."
            else:
                logger.info(f"Executing tool '{action}' with args {args}")
                try:
                    tool_result = tool.run(args)
                    if tool_result["ok"]:
                        observation = tool_result["output"]
                    else:
                        observation = f"Error: {tool_result['error']}"
                except Exception as e:
                    observation = f"Error: Exception occurred during tool execution: {e}"

            logger.info(f"Observation: {observation[:80]}...")
            
            # 4. Update logs and history
            log_entry["observation"] = observation
            execution_log.append(log_entry)
            
            # Feed back observation to the model
            conversation_history.append({"role": "assistant", "content": model_raw_response})
            conversation_history.append({
                "role": "user",
                "content": f"Observation: {observation}"
            })
            
        if step >= self.max_steps and not final_answer:
            final_answer = "Agent halted: Loop count exceeded maximum safety steps (8 steps) without reaching a final answer."
            logger.warning("Agent execution exceeded step limit.")
            
        return final_answer, execution_log
