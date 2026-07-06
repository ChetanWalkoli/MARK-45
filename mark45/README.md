# 🤖 MARK 45 — Phase 5: Planner & Router Multi-Agent (RTX 3050 Optimized)

MARK 45 is a local-first, private personal AI assistant system running locally on your hardware. This Phase 5 implementation adds a robust Multi-Agent Orchestration layer. Given a complex goal, a **Planner** decomposes it into subtasks, a **Router** dispatches each subtask to the correct specialist (Coding Agent or RAG Research), and an **Orchestrator** coordinates the execution sequence while strictly enforcing global step limits and timeouts.

---

## ⚙️ Project Structure (Phase 5)
```text
mark45/
├── core/
│   ├── vram.py          # GPU VRAM detection and static ceiling check
│   └── model_client.py  # Async Ollama model client
├── memory/
│   ├── embeddings.py    # sentence-transformers CPU-locked embeddings
│   ├── vector_store.py  # Qdrant client wrapper
│   ├── manager.py       # Memory retrieval, ranking, and context injection
│   └── ingest.py        # Local file ingestion script (.txt, .md, .pdf)
├── tools/
│   ├── base.py          # Tool interface structure
│   ├── registry.py      # Registration/schema mapping of tools
│   ├── file_tool.py     # Sandbox restricted file read/write (Access Control)
│   ├── python_tool.py   # Subprocess-sandboxed Python executor (10s timeout)
│   └── terminal_tool.py # Allowlisted command execution shell
├── agents/
│   ├── coding_agent.py  # ReAct reasoning coding agent
│   ├── planner.py       # High-level task planner (max 6 subtasks)
│   ├── router.py        # Specialist routing dispatcher
│   └── orchestrator.py  # Execution coordinator (max 20 steps safety limit)
├── sandbox/             # Workspace isolation folder for file/python runs
├── config/
│   ├── settings.py      # App configurations (Pydantic Settings)
│   └── system_prompt.txt# System directives for the AI
├── api/
│   └── main.py          # FastAPI gateway (Integrated with RAG & Multi-Agent endpoints)
├── ui/
│   └── index.html       # Vanilla JS SSE-powered chat UI
├── requirements.txt     # Python package requirements
└── docker-compose.yml   # Services configuration (Qdrant)
```

---

## 🚀 Setup & Execution

### Prerequisites
1. Start Qdrant in Docker: `docker compose up -d`
2. Spin up Ollama and pull `llama3.2:3b`.
3. Activate virtual environment and install packages: `pip install -r requirements.txt`

### Start the FastAPI API Server
Start the backend app:
```bash
python -m uvicorn mark45.api.main:app --reload --port 8000
```

---

## 🛡️ Multi-Agent Guardrails

1. **Step Budget**: The orchestrator counts total steps executed across all sub-agents. It halts immediately if the total exceeds **20 steps** to prevent infinite loops and runaway compute.
2. **Global Timeout**: A strict limit of **180 seconds** is enforced for overall goal execution.
3. **Double Failure Halt**: If any individual subtask fails twice, the orchestrator immediately halts the entire pipeline and reports the trace to prevent cascading failures.
4. **Intermediate Memory Registration**: Success outputs of each subtask are written directly into the `MemoryManager` to inform future context.

---

## 🔍 Orchestrator Verification Step

Test the multi-agent orchestration by submitting a compound goal that requires reading a file, summarizing it, and writing a new file:

### 1. Create a Test file in the Sandbox
Create a source file `notes.txt` inside your sandbox folder `mark45/sandbox/`:
```text
MARK 45 is a local-first personal AI assistant built for Chetan Walkoli.
It incorporates a FastAPI backend, vector memories via Qdrant, and local voice links.
Current deployment phase is Phase 5 (Multi-Agent System).
Future goals include Phase 6 (Fine-Tuning).
```

### 2. Submit the Goal via cURL:
```bash
curl -X POST "http://localhost:8000/api/agent/run" \
     -H "Content-Type: application/json" \
     -d '{"goal": "Read notes.txt inside the sandbox, summarize it, and write the summary to summary.txt inside the sandbox."}'
```

### 3. Expected Streamed Output:
The server will return an SSE stream (Server-Sent Events) tracing the entire coordination. You will see:
* **Plan Event**:
  ```json
  {"type": "plan", "tasks": [{"id": 1, "description": "Read the contents of notes.txt", "specialist": "coding_agent"}, {"id": 2, "description": "Summarize the contents of notes.txt and write the summary to summary.txt", "specialist": "coding_agent"}]}
  ```
* **Step Logs**:
  Shows start, execution, and outputs of each step.
* **Complete Event**:
  ```json
  {"type": "complete", "final_context": "...", "steps_used": 5, "duration_seconds": 12.4}
  ```

Check `mark45/sandbox/summary.txt` to verify the summary was correctly written!
