import logging
from typing import Dict, Any, Tuple, List
from mark45.agents.coding_agent import CodingAgent
from mark45.memory.manager import MemoryManager

logger = logging.getLogger("mark45.agents.router")

class TaskRouter:
    """
    Dispatches tasks to specialist agents: coding_agent or rag_research.
    """
    def __init__(self, coding_agent: CodingAgent, memory_manager: MemoryManager):
        self.coding_agent = coding_agent
        self.memory = memory_manager

    async def execute_task(self, specialist: str, description: str, context: str) -> Tuple[bool, str, List[Dict[str, Any]]]:
        """
        Routes the task to the specified specialist.
        Args:
            specialist: Name of the specialist ('coding_agent', 'rag_research')
            description: Task directive
            context: Context accumulated from prior steps
        Returns:
            Tuple[bool, str, List[Dict[str, Any]]]: (success, output, logs)
        """
        logger.info(f"Routing task '{description}' to '{specialist}'")
        
        # Build prompt with accumulated context
        prompt = f"Task: {description}\n"
        if context:
            prompt += f"\nContext from previous steps:\n{context}\n"

        if specialist == "coding_agent":
            try:
                final_answer, steps = await self.coding_agent.execute_task(prompt)
                # Check if agent exited due to safety step limits
                success = "exceeded maximum safety steps" not in final_answer.lower()
                return success, final_answer, steps
            except Exception as e:
                logger.error(f"Coding specialist execution failed: {e}")
                return False, f"Error: Coding specialist failed: {e}", []

        elif specialist == "rag_research":
            try:
                # Query Vector DB
                memories = self.memory.retrieve_context(description, k=4)
                if not memories:
                    return True, "No matching database context found.", []
                
                output = "Retrieved memories:\n"
                for m in memories[:3]:
                    output += f"- [{m.get('type', 'doc')}] {m['content']}\n"
                return True, output, []
            except Exception as e:
                logger.error(f"RAG research execution failed: {e}")
                return False, f"Error: RAG research failed: {e}", []

        else:
            err_msg = f"Unknown specialist: '{specialist}'"
            logger.error(err_msg)
            return False, err_msg, []
