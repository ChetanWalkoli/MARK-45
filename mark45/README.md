# 🤖 MARK 45 — Phase 2: Persistent Memory & RAG (RTX 3050 Optimized)

MARK 45 is a local-first, private personal AI assistant system running locally on your hardware. This Phase 2 implementation builds on the streaming MVP, adding private vector storage (Qdrant), CPU-locked embeddings (`all-MiniLM-L6-v2`), conversational memory, and local document ingestion (RAG) — completely offline.

---

## ⚙️ Project Structure (Phase 2)
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
├── config/
│   ├── settings.py      # App configurations (Pydantic Settings)
│   └── system_prompt.txt# System directives for the AI
├── api/
│   └── main.py          # FastAPI server gateway (integrated with RAG)
├── ui/
│   └── index.html       # Vanilla JS SSE-powered chat UI
├── requirements.txt     # Python package requirements
└── docker-compose.yml   # Services configuration (Qdrant)
```

---

## 🚀 Setup & Execution

### Prerequisites
1. Install [Docker & Docker Compose](https://docs.docker.com/engine/install/).
2. Install [Ollama](https://ollama.com/) (and pull the `llama3.2:3b` model).
3. Install [Python 3.11](https://www.python.org/downloads/release/python-3110/).

### 1. Start Qdrant Vector Database
Run Qdrant in the background via Docker:
```bash
# Inside the mark45/ directory:
docker compose up -d
```
Verify Qdrant is running by checking `http://localhost:6333` in your browser.

### 2. Install Python Dependencies
Create a virtual environment and install the required modules:
```bash
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```
*(Note: Installing `sentence-transformers` for the first time will automatically download the lightweight `all-MiniLM-L6-v2` model on CPU. PyTorch will automatically run on CPU to protect your GPU VRAM.)*

### 3. Start the FastAPI API Server
Start the backend app:
```bash
python -m uvicorn mark45.api.main:app --reload --port 8000
```

---

## 📁 Document Ingestion (RAG)

To feed private documentation (.txt, .md, or .pdf) to MARK 45's memory base, use the standalone `ingest.py` script:

```bash
# Ingest a single document
python mark45/memory/ingest.py path/to/document.md

# Ingest an entire directory of documents
python mark45/memory/ingest.py path/to/docs_folder/
```

---

## 🔍 Verification Step

### 1. Ingest a Test Document
Create a test file `knowledge.txt` with specific custom information:
```text
Chetan Walkoli is working on the MARK 45 OS Project, which is a futuristic local-first co-pilot interface. The project utilizes Qdrant as its memory matrix.
```
Ingest it:
```bash
python mark45/memory/ingest.py knowledge.txt
```

### 2. Query the Assistant
Navigate to the UI at `http://localhost:8000/` or run a cURL call:
```bash
curl -X POST "http://localhost:8000/api/chat" \
     -H "Content-Type: application/json" \
     -d '{"messages": [{"role": "user", "content": "What database does Chetan use for the MARK 45 memory matrix?"}]}'
```

Expected Output:
* In your FastAPI console, you will see a detailed reranking log outputting retrieved chunks, scores, and decay values:
  ```text
  --- RAG RETRIEVAL LOG FOR QUERY: 'What database does Chetan use for the MARK 45 memory matrix?' ---
  Hit: 'Chetan Walkoli is working on the MARK 45 OS Project, which is a futuristic local-first...' | Relevance: 0.725, Recency: 0.998, Importance: 1.000 | Final Rerank Score: 0.862
  Retrieved 1 memories above threshold of 0.35.
  ```
* The API returns the response utilizing the ingested context:
  ```json
  {
    "response": "Chetan Walkoli uses Qdrant as the vector database for the MARK 45 memory matrix."
  }
  ```
