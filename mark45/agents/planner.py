import json
import re
import logging
from typing import List, Dict, Any, Tuple
from mark45.core.model_client import OllamaClient

logger = logging.getLogger("mark45.agents.planner")

class PlannerAgent:
    """
    Decomposes high-level user goals into structured subtask plans using the LLM.
    """
    def __init__(self, ollama_client: OllamaClient):
        self.client = ollama_client
        self.max_tasks = 6

    def _get_system_instructions(self) -> str:
        return f"""You are the MARK 45 Planner Agent.
Your job is to break down a complex goal into a sequence of simple, sequential subtasks.
You can use up to {self.max_tasks} tasks. Keep them focused and sequential (where the output of one can feed into the next).

For each task, assign one of these specialist agents:
1. "coding_agent": For writing scripts, executing Python code, debugging, or running terminal operations.
2. "rag_research": For searching vector memory, documents, or context about the workspace.

You must output ONLY a valid JSON object matching the following structure:
{{
  "thought": "Your reasoning behind this plan structure.",
  "tasks": [
    {{
      "id": 1,
      "description": "Specific action to perform (e.g. Write a script to calculate primes)",
      "specialist": "coding_agent"
    }},
    {{
      "id": 2,
      "description": "Verify the prime calculator script is correct by running it.",
      "specialist": "coding_agent"
    }}
  ]
}}
Do not write anything else outside the JSON block. Do not wrap in markdown unless it's a json block.
"""

    def _parse_plan(self, text: str) -> Dict[str, Any]:
        cleaned = text.strip()
        code_block_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', cleaned, re.DOTALL)
        if code_block_match:
            cleaned = code_block_match.group(1)
            
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            brace_match = re.search(r'(\{.*\})', cleaned, re.DOTALL)
            if brace_match:
                try:
                    return json.loads(brace_match.group(1))
                except json.JSONDecodeError:
                    pass
            raise ValueError(f"Failed to parse plan as JSON: {text}")

    async def generate_plan(self, goal: str) -> List[Dict[str, Any]]:
        """
        Generates a list of tasks to solve the goal.
        """
        system_prompt = self._get_system_instructions()
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Create an ordered subtask plan for the goal: '{goal}'"}
        ]
        
        logger.info(f"Generating plan for: '{goal}'")
        raw_response = ""
        try:
            async for chunk in self.client.chat(messages, stream=False):
                raw_response += chunk
            
            plan_data = self._parse_plan(raw_response)
            tasks = plan_data.get("tasks", [])
            
            # Enforce maximum task boundary
            if len(tasks) > self.max_tasks:
                logger.warning(f"Planner returned {len(tasks)} tasks. Truncating to {self.max_tasks}.")
                tasks = tasks[:self.max_tasks]
                
            return tasks
        except Exception as e:
            logger.error(f"Planner failed to generate plan: {e}")
            # Return fallback plan
            return [{
                "id": 1,
                "description": f"Perform the goal directly: {goal}",
                "specialist": "coding_agent"
            }]
