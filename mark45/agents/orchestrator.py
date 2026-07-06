import time
import logging
from typing import AsyncGenerator, Dict, Any, List
from mark45.agents.planner import PlannerAgent
from mark45.agents.router import TaskRouter
from mark45.memory.manager import MemoryManager

logger = logging.getLogger("mark45.agents.orchestrator")

class Orchestrator:
    """
    Manages multi-agent task execution, tracking global budgets and step limits.
    Yields execution trace events for real-time SSE streaming.
    """
    def __init__(self, planner: PlannerAgent, router: TaskRouter, memory: MemoryManager):
        self.planner = planner
        self.router = router
        self.memory = memory
        self.max_total_steps = 20
        self.global_timeout_seconds = 180.0

    async def execute_goal(self, goal: str) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Executes a goal by planning, routing, and executing subtasks.
        Yields status updates as structured trace events.
        """
        start_time = time.time()
        total_steps = 0
        
        yield {
            "type": "status",
            "message": "Initializing plan protocol..."
        }
        
        # 1. Generate plan (counts as 1 step)
        total_steps += 1
        tasks = await self.planner.generate_plan(goal)
        
        yield {
            "type": "plan",
            "tasks": tasks
        }
        
        accumulated_context = ""
        failed_tasks: Dict[int, int] = {} # task_id -> retry_count
        
        for task in tasks:
            task_id = task["id"]
            description = task["description"]
            specialist = task["specialist"]
            
            yield {
                "type": "task_start",
                "task_id": task_id,
                "description": description,
                "specialist": specialist
            }
            
            success = False
            attempts = 0
            
            while not success and attempts < 2:
                attempts += 1
                
                # Check global budgets
                if total_steps >= self.max_total_steps:
                    yield {
                        "type": "failed",
                        "reason": f"Global step limit exceeded ({self.max_total_steps} steps)."
                    }
                    return
                    
                if (time.time() - start_time) > self.global_timeout_seconds:
                    yield {
                        "type": "failed",
                        "reason": f"Global execution timeout exceeded ({self.global_timeout_seconds}s)."
                    }
                    return
                
                yield {
                    "type": "status",
                    "message": f"Executing subtask {task_id} (Attempt {attempts}/2)..."
                }
                
                # Execute task via router
                task_success, output, logs = await self.router.execute_task(
                    specialist=specialist,
                    description=description,
                    context=accumulated_context
                )
                
                # Increment total steps by the number of steps the sub-agent took
                sub_agent_steps = len(logs) if logs else 1
                total_steps += sub_agent_steps
                
                # Stream intermediate sub-agent steps if available
                if logs:
                    for step_log in logs:
                        yield {
                            "type": "sub_step",
                            "task_id": task_id,
                            "thought": step_log.get("thought", ""),
                            "action": step_log.get("action", ""),
                            "observation": step_log.get("observation", "")
                        }
                
                if task_success:
                    success = True
                    accumulated_context += f"\n--- Output of Task {task_id} ({description}) ---\n{output}\n"
                    
                    # Store subtask success in MemoryManager
                    self.memory.store_turn(
                        role="system",
                        content=f"Subtask completed: '{description}'. Result: {output[:300]}...",
                        importance=4
                    )
                    
                    yield {
                        "type": "task_complete",
                        "task_id": task_id,
                        "output": output
                    }
                else:
                    logger.warning(f"Task {task_id} failed on attempt {attempts}: {output}")
                    if attempts >= 2:
                        yield {
                            "type": "task_failed",
                            "task_id": task_id,
                            "error": output,
                            "message": "Subtask failed twice. Halting execution pipeline for safety."
                        }
                        yield {
                            "type": "failed",
                            "reason": f"Subtask {task_id} failed twice. User intervention required."
                        }
                        return
                    
                    # Pause before retrying
                    time.sleep(1.0)
            
        # Final answer formulation
        elapsed_time = time.time() - start_time
        yield {
            "type": "complete",
            "final_context": accumulated_context,
            "steps_used": total_steps,
            "duration_seconds": elapsed_time
        }
