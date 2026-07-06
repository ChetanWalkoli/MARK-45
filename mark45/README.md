# 🤖 MARK 45 — Phase 6: QLoRA Fine-Tuning (RTX 3050 Optimized)

MARK 45 is a local-first, private personal AI assistant system running locally on your hardware. This Phase 6 implementation adds a fully local QLoRA fine-tuning pipeline to customize model weights (specifically Qwen2.5-1.5B or Llama3.2-3B) using your private documents, notes, or chat logs — completely private and offline.

---

## ⚙️ Project Structure (Phase 6)
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
│   ├── planner.py       # High-level task planner
│   ├── router.py        # Specialist routing dispatcher
│   └── orchestrator.py  # Execution coordinator
├── training/
│   ├── prepare_data.py  # Cleans, hashes, dedups raw notes into training format
│   ├── qlora_train.py   # QLoRA training script (NF4, PEFT, TRL, CPU offloads)
│   └── merge_and_export.py # Merges LoRA adapters and exports GGUF instructions
├── sandbox/             # Workspace isolation folder for file/python runs
├── config/
│   ├── settings.py      # App configurations (Pydantic Settings)
│   ├── train.yaml       # Hyperparameters for QLoRA training
│   └── system_prompt.txt# System directives for the AI
├── api/
│   └── main.py          # FastAPI gateway
├── ui/
│   └── index.html       # Vanilla JS SSE-powered chat UI
├── requirements.txt     # Python package requirements
└── docker-compose.yml   # Services configuration (Qdrant)
```

---

## 🚀 Setup & Execution

### Prerequisites
1. Start Qdrant in Docker: `docker compose up -d`
2. Activate virtual environment and install packages: `pip install -r requirements.txt`

---

## 🛠️ Fine-Tuning Pipeline

### 1. Data Preparation
Clean, deduplicate, and split your raw data (JSON QA lists, text transcripts) into training (`train.jsonl`) and validation (`val.jsonl`) datasets. If no raw data is specified, the script automatically bootstraps with a default dataset about MARK 45:
```bash
python mark45/training/prepare_data.py
```

### 2. Run QLoRA Training
Execute local fine-tuning. The script runs preflight VRAM check. If available VRAM is under 8GB, it automatically selects a 1.5B base model, decreases context length to 512, sets batch size to 1, and enables double quantization to guarantee zero Out-Of-Memory (OOM) failures:
```bash
python mark45/training/qlora_train.py
```
*Note: If no GPU is detected, training runs on CPU (with Qwen-0.5B fallback) but will be very slow. In this case, we recommend renting a cloud GPU (e.g. RunPod / Vast.ai ~$0.30/hr) to run training, and transferring adapter checkpoints back to your local machine.*

### 3. Merge Adapters
Merge the trained LoRA weights back into the baseline model:
```bash
python mark45/training/merge_and_export.py
```

---

## 🔍 GGUF & Ollama Integration (Verification)

Once the merge completes, compile and load it directly into Ollama:

1. **Clone and setup llama.cpp (for quantization conversions)**:
   ```bash
   git clone https://github.com/ggerganov/llama.cpp.git
   pip install -r llama.cpp/requirements.txt
   ```
2. **Convert weights to GGUF**:
   ```bash
   python llama.cpp/convert_hf_to_gguf.py ./merged_model --outfile mark45_custom.gguf
   ```
3. **Build custom Ollama model**:
   Create a file `Modelfile` inside your `mark45/` directory:
   ```text
   FROM ./mark45_custom.gguf
   PARAMETER temperature 0.7
   SYSTEM "You are MARK 45 — Chetan's custom-trained offline co-pilot. Be direct."
   ```
   Load it into Ollama:
   ```bash
   ollama create mark45-custom -f Modelfile
   ```
4. **Wire into MARK 45 API**:
   Update your local `.env` configuration file to point to your new model:
   ```env
   MODEL_NAME=mark45-custom
   ```
   Restart uvicorn server. Your API `/api/chat` and UI will now run on top of your personalized, fine-tuned model!
