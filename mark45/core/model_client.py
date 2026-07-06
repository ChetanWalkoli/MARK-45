import httpx
import json
import logging
from typing import AsyncGenerator, List, Dict
from mark45.core.vram import estimate_fits

logger = logging.getLogger("mark45.core.model_client")

class OllamaClient:
    """
    Async client for interacting with a local Ollama server.
    """
    def __init__(self, ollama_url: str, model_name: str):
        self.ollama_url = ollama_url.rstrip("/")
        self.model_name = model_name
        
        # Run VRAM check on initialization
        fits, msg = estimate_fits(self.model_name)
        print(f"\n[VRAM CHECK] {msg}")
        if not fits:
            print("[VRAM WARNING] Loading this model may cause slow CPU offloading or Out-Of-Memory errors on RTX 3050.\n")
        else:
            print("[VRAM OK] Model fits within the 8GB VRAM limit.\n")

    async def check_health(self) -> bool:
        """
        Verifies if Ollama is running and the specified model is pulled.
        Returns:
            bool: True if healthy, False otherwise.
        """
        async with httpx.AsyncClient() as client:
            # 1. Check if Ollama service is reachable
            try:
                response = await client.get(f"{self.ollama_url}/")
                if response.status_code != 200:
                    logger.error(f"Ollama server returned status {response.status_code}")
                    return False
            except Exception as e:
                print("\n[ERROR] Ollama service is not running!")
                print(f"Please start Ollama service. Ensure it is accessible at: {self.ollama_url}\n")
                return False

            # 2. Check if the model is downloaded
            try:
                response = await client.get(f"{self.ollama_url}/api/tags")
                if response.status_code == 200:
                    models_data = response.json()
                    models = [m["name"] for m in models_data.get("models", [])]
                    # Direct check or tag checks (e.g. model:latest vs model)
                    model_found = False
                    for m in models:
                        if m == self.model_name or m.split(":")[0] == self.model_name.split(":")[0]:
                            model_found = True
                            break
                    
                    if not model_found:
                        print(f"\n[ERROR] Model '{self.model_name}' is not pulled in Ollama!")
                        print(f"Please run this command in your terminal:")
                        print(f"  ollama pull {self.model_name}\n")
                        return False
                    return True
                else:
                    logger.error("Failed to query Ollama tags API")
                    return False
            except Exception as e:
                logger.error(f"Error checking model tags: {e}")
                return False

    async def chat(self, messages: List[Dict[str, str]], stream: bool = True) -> AsyncGenerator[str, None]:
        """
        Streams or returns a chat completion response from the model.
        Args:
            messages: List of message dicts with 'role' and 'content' keys.
            stream: Whether to stream tokens or return in one response.
        Yields:
            str: Token chunks from the stream, or the full message content.
        """
        payload = {
            "model": self.model_name,
            "messages": messages,
            "stream": stream,
            "options": {
                "temperature": 0.0,
                "num_predict": 1024
            }
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                async with client.stream("POST", f"{self.ollama_url}/api/chat", json=payload) as response:
                    if response.status_code != 200:
                        err_text = await response.aread()
                        logger.error(f"Ollama returned error: {response.status_code} - {err_text.decode()}")
                        yield f"Error: Ollama server returned status {response.status_code}"
                        return
                    
                    async for line in response.iter_lines():
                        if line:
                            try:
                                chunk = json.loads(line)
                                token = chunk.get("message", {}).get("content", "")
                                if token:
                                    yield token
                            except json.JSONDecodeError:
                                pass
            except Exception as e:
                logger.error(f"Connection to Ollama failed: {e}")
                yield f"Error: Failed to connect to Ollama server ({e})"
