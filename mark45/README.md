# 🤖 MARK 45 — Phase 3: Secure Tools & Coding Agent (RTX 3050 Optimized)

MARK 45 is a local-first, private personal AI assistant system running locally on your hardware. This Phase 3 implementation introduces a ReAct-style coding agent capable of writing, executing, and debugging code securely using allowlisted sandbox tools.

---

## ⚙️ Project Structure (Phase 3)
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
│   └── coding_agent.py  # ReAct reasoning loop (8 steps max safety limit)
├── sandbox/             # Workspace isolation folder for file/python runs
├── config/
│   ├── settings.py      # App configurations (Pydantic Settings)
│   └── system_prompt.txt# System directives for the AI
├── api/
│   └── main.py          # FastAPI gateway (Integrated with RAG & Agent endpoints)
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

## 🔒 Security & Sandbox Guardrails

1. **Path Isolation**: File tools (`read_file`, `write_file`) resolve paths inside the absolute sandbox subdirectory (`mark45/sandbox/`). They block directory traversal attempts (`../`) and throw immediate security exceptions.
2. **Execution Time Limits**: Python scripts executed via `run_python` are running inside isolated subprocesses with a hard **10-second timeout** and local directory scoping.
3. **Allowlisted Shells**: Terminal commands run via `run_command` are validated against a strict set of permitted prefixes (`dir`, `ls`, `cat`, `type`, `echo`, `git status`, `git diff`, `pwd`). Operators like `;`, `&&`, `||`, and `|` are strictly blocked.
4. **Agent Step Limits**: The coding agent runs a ReAct reasoning cycle limited to **8 steps maximum**. If it cannot complete the goal in 8 steps, it automatically halts to prevent infinite loops.

---

## 🔍 Agent Verification Step

Test the secure agent by sending a programming task that requires coding, executing, detecting a bug, and fixing it:

### Run the Agent via cURL:
```bash
curl -X POST "http://localhost:8000/api/agent/code" \
     -H "Content-Type: application/json" \
     -d '{"goal": "Write a python file named add.py that defines a function adding two inputs. The file must print the output of add(5, 5). Write the function with a bug (e.g. subtracting instead of adding), run it, see the wrong output, fix the bug, run it again to verify, and present the final code."}'
```

### Expected Output & Logs:
* **Terminal Server Logs**:
  You will see the agent's reasoning loop steps logged to the FastAPI console:
  ```text
  INFO:mark45.agents.coding_agent:Agent Loop Step 1/8
  INFO:mark45.agents.coding_agent:Executing tool 'write_file' with args {'path': 'add.py', 'content': 'def add(a, b):\n    return a - b\n\nprint(add(5, 5))'}
  INFO:mark45.agents.coding_agent:Agent Loop Step 2/8
  INFO:mark45.agents.coding_agent:Executing tool 'run_python' with args {'code': 'import os\nwith open("add.py", "r") as f:\n    exec(f.read())'}
  INFO:mark45.agents.coding_agent:Observation: 0
  INFO:mark45.agents.coding_agent:Agent Loop Step 3/8
  INFO:mark45.agents.coding_agent:Executing tool 'write_file' with args {'path': 'add.py', 'content': 'def add(a, b):\n    return a + b\n\nprint(add(5, 5))'}
  INFO:mark45.agents.coding_agent:Agent Loop Step 4/8
  INFO:mark45.agents.coding_agent:Executing tool 'run_python' with args {'code': 'import os\nwith open("add.py", "r") as f:\n    exec(f.read())'}
  INFO:mark45.agents.coding_agent:Observation: 10
  INFO:mark45.agents.coding_agent:Agent completed goal.
  ```

* **cURL Response**:
  ```json
  {
    "final_answer": "The script 'add.py' has been successfully created, verified, corrected from subtracting to adding, and re-tested. The final correct output is 10.",
    "steps": [
      {
        "step": 1,
        "thought": "I will create add.py with a deliberate bug (subtraction instead of addition) and test it.",
        "action": "write_file",
        "args": {"path": "add.py", "content": "def add(a, b):\n    return a - b\nprint(add(5, 5))"},
        "observation": "Successfully wrote to file 'add.py'."
      },
      ...
    ]
  }
  ```
