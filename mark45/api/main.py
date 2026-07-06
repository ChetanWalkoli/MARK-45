import os
import json
import logging
from typing import List, Dict, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel

from mark45.config.settings import settings
from mark45.core.model_client import OllamaClient
from mark45.memory.manager import MemoryManager
from mark45.agents.coding_agent import CodingAgent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mark45.api")

app = FastAPI(title=settings.app_name, version="1.0.0")

# Enable CORS for frontend UI interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Ollama Client
ollama_client = OllamaClient(
    ollama_url=settings.ollama_url,
    model_name=settings.model_name
)

# Initialize Memory Manager
memory_manager = MemoryManager()

# Initialize Coding Agent
coding_agent = CodingAgent(ollama_client=ollama_client)

# Request & Response Schemas
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    stream: Optional[bool] = False

class ChatResponse(BaseModel):
    response: str

class AgentRequest(BaseModel):
    goal: str

class AgentResponse(BaseModel):
    final_answer: str
    steps: List[Dict[str, Any]]


def load_system_prompt() -> str:
    """Loads the system prompt from settings.system_prompt_path."""
    if os.path.exists(settings.system_prompt_path):
        try:
            with open(settings.system_prompt_path, "r", encoding="utf-8") as f:
                return f.read().strip()
        except Exception as e:
            logger.error(f"Failed to read system prompt file: {e}")
    return "You are MARK 45, a helpful local AI assistant."

@app.on_event("startup")
async def startup_event():
    """Verify Ollama is reachable and model is pulled on app startup."""
    is_healthy = await ollama_client.check_health()
    if not is_healthy:
        logger.warning("Ollama health check failed. Some API features may not work until resolved.")

@app.get("/api/health")
async def health_check():
    """Verify system health and model client availability."""
    ollama_ok = await ollama_client.check_health()
    return {
        "status": "online" if ollama_ok else "degraded",
        "app": settings.app_name,
        "model": settings.model_name,
        "ollama_connected": ollama_ok
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Non-streaming POST endpoint for chat completions.
    """
    # 1. Get user query (last message content)
    user_query = request.messages[-1].content if request.messages else ""
    
    # 2. Retrieve memories and build context block
    context_block = ""
    if user_query:
        context_block = memory_manager.get_context_block(user_query)

    # 3. Load system prompt and append context block
    system_prompt = load_system_prompt()
    if context_block:
        system_prompt += f"\n{context_block}"
    
    # 4. Prepend system prompt if not present
    input_messages = [{"role": "system", "content": system_prompt}]
    for msg in request.messages:
        input_messages.append({"role": msg.role, "content": msg.content})

    # 5. Request completion from client
    response_content = ""
    try:
        async for chunk in ollama_client.chat(input_messages, stream=False):
            response_content += chunk
            
        # 6. Store user turn and assistant response in memory
        if user_query:
            memory_manager.store_turn("user", user_query)
        if response_content:
            memory_manager.store_turn("assistant", response_content)
            
        return ChatResponse(response=response_content)
    except Exception as e:
        logger.error(f"Chat completion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chat/stream")
async def chat_stream_get(message: str = Query(..., description="User message to send to the assistant")):
    """
    Streaming GET endpoint using Server-Sent Events (SSE).
    """
    context_block = memory_manager.get_context_block(message)
    system_prompt = load_system_prompt()
    if context_block:
        system_prompt += f"\n{context_block}"
        
    input_messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": message}
    ]

    async def event_generator():
        response_content = ""
        try:
            async for token in ollama_client.chat(input_messages, stream=True):
                response_content += token
                # Yield SSE chunk
                data = json.dumps({"text": token})
                yield f"data: {data}\n\n"
                
            # Store turns when complete
            memory_manager.store_turn("user", message)
            if response_content:
                memory_manager.store_turn("assistant", response_content)
                
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"Streaming failed: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/chat/stream")
async def chat_stream_post(request: ChatRequest):
    """
    Streaming POST endpoint using Server-Sent Events (SSE).
    """
    user_query = request.messages[-1].content if request.messages else ""
    context_block = ""
    if user_query:
        context_block = memory_manager.get_context_block(user_query)
        
    system_prompt = load_system_prompt()
    if context_block:
        system_prompt += f"\n{context_block}"
        
    input_messages = [{"role": "system", "content": system_prompt}]
    for msg in request.messages:
        input_messages.append({"role": msg.role, "content": msg.content})

    async def event_generator():
        response_content = ""
        try:
            async for token in ollama_client.chat(input_messages, stream=True):
                response_content += token
                # Yield SSE chunk
                data = json.dumps({"text": token})
                yield f"data: {data}\n\n"
                
            # Store turns when complete
            if user_query:
                memory_manager.store_turn("user", user_query)
            if response_content:
                memory_manager.store_turn("assistant", response_content)
                
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"Streaming failed: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/", response_class=FileResponse)
async def read_index():
    """Serves the UI index.html."""
    return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ui", "index.html")


@app.get("/logo.png", response_class=FileResponse)
async def get_logo():
    """Serves the logo.png from either ui/ or frontend/public/."""
    path_options = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ui", "logo.png"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "public", "logo.png")
    ]
    for p in path_options:
        if os.path.exists(p):
            return p
    raise HTTPException(status_code=404, detail="Logo not found")


@app.post("/api/agent/code", response_model=AgentResponse)
async def run_agent_code(request: AgentRequest):
    """
    Executes a coding task securely using the ReAct loop and allowlisted tools.
    """
    try:
        final_answer, steps = await coding_agent.execute_task(request.goal)
        return AgentResponse(final_answer=final_answer, steps=steps)
    except Exception as e:
        logger.error(f"Agent task execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


