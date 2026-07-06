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

# Request & Response Schemas
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    stream: Optional[bool] = False

class ChatResponse(BaseModel):
    response: str

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
    # 1. Load system prompt
    system_prompt = load_system_prompt()
    
    # 2. Prepend system prompt if not present
    input_messages = [{"role": "system", "content": system_prompt}]
    for msg in request.messages:
        input_messages.append({"role": msg.role, "content": msg.content})

    # 3. Request completion from client
    response_content = ""
    try:
        async for chunk in ollama_client.chat(input_messages, stream=False):
            response_content += chunk
        return ChatResponse(response=response_content)
    except Exception as e:
        logger.error(f"Chat completion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chat/stream")
async def chat_stream_get(message: str = Query(..., description="User message to send to the assistant")):
    """
    Streaming GET endpoint using Server-Sent Events (SSE).
    """
    system_prompt = load_system_prompt()
    input_messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": message}
    ]

    async def event_generator():
        try:
            async for token in ollama_client.chat(input_messages, stream=True):
                # Yield SSE chunk
                data = json.dumps({"text": token})
                yield f"data: {data}\n\n"
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
    system_prompt = load_system_prompt()
    input_messages = [{"role": "system", "content": system_prompt}]
    for msg in request.messages:
        input_messages.append({"role": msg.role, "content": msg.content})

    async def event_generator():
        try:
            async for token in ollama_client.chat(input_messages, stream=True):
                # Yield SSE chunk
                data = json.dumps({"text": token})
                yield f"data: {data}\n\n"
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

