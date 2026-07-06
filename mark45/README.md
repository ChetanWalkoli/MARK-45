# 🤖 MARK 45 — Phase 1 MVP (RTX 3050 Optimized)

MARK 45 is a local-first, private personal AI assistant system running locally on your hardware. This Phase 1 MVP establishes the streaming chat completion pipeline optimized for low VRAM targets (like the RTX 3050 8GB).

---

## ⚙️ Project Structure (Phase 1)
```text
mark45/
├── core/
│   ├── vram.py          # GPU VRAM detection and static ceiling check
│   └── model_client.py  # Async Ollama model inference client
├── config/
│   ├── settings.py      # App configurations (Pydantic Settings)
│   └── system_prompt.txt# System directives for the AI
├── api/
│   └── main.py          # FastAPI server gateway
├── ui/
│   └── index.html       # Vanilla JS SSE-powered chat UI
├── requirements.txt     # Python package requirements
└── docker-compose.yml   # Services configuration
```

---

## 🚀 Setup & Execution

### Prerequisites
1. Install [Ollama](https://ollama.com/) on your local machine.
2. Install [Python 3.11](https://www.python.org/downloads/release/python-3110/).

### 1. Start Ollama and Pull the Model
Open your terminal and pull the target 3B model (low VRAM friendly):
```bash
ollama pull llama3.2:3b
```
Ensure the Ollama backend is running (typically runs in background automatically, listening on `http://localhost:11434`).

### 2. Configure Environment variables (Optional)
If you need to customize default settings, create a `.env` file in the `mark45/` directory:
```env
MODEL_NAME=llama3.2:3b
OLLAMA_URL=http://localhost:11434
APP_PORT=8000
```

### 3. Install Python Dependencies
From the `mark45/` directory, create a virtual environment and install the required modules:
```bash
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 4. Start the FastAPI API Server
Start the backend app by running the following command in the `mark45/` directory (with virtual env active):
```bash
python -m uvicorn mark45.api.main:app --reload --port 8000
```

---

## 🔍 Verification Step

### 1. Health & VRAM Check
On application startup, you will see a console message estimating VRAM usage:
```text
[VRAM CHECK] ✅ VRAM Check Passed: GPU VRAM detection unavailable (falling back to static checks). Model llama3.2:3b (~3.0B) requires ~3.15 GB VRAM.
[VRAM OK] Model fits within the 8GB VRAM limit.
```
If you choose a model larger than 3B, it will warn you if it might exceed the VRAM of your RTX 3050.

Verify the server is healthy by visiting:
`http://localhost:8000/api/health`

Expected response:
```json
{
  "status": "online",
  "app": "MARK 45 OS",
  "model": "llama3.2:3b",
  "ollama_connected": true
}
```

### 2. Test /chat via cURL
Test non-streaming response via terminal:
```bash
curl -X POST "http://localhost:8000/api/chat" \
     -H "Content-Type: application/json" \
     -d '{"messages": [{"role": "user", "content": "Hello MARK 45, run diagnostics."}]}'
```
Expected output:
```json
{
  "response": "Hello Chetan. Interface active. System diagnostics normal. How can I assist you today?"
}
```

### 3. Open the UI
Since FastAPI serves the single-file UI at root, simply open your web browser and navigate to:
`http://localhost:8000/`

You will see the dark-themed Iron Man styled layout. Type a message and hit **SEND**. It will stream the response word-by-word via Server-Sent Events (SSE).
