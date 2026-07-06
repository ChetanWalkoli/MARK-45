# 🤖 MARK 45 — Phase 4: Local Voice Interface (RTX 3050 Optimized)

MARK 45 is a local-first, private personal AI assistant system running locally on your hardware. This Phase 4 implementation adds a fully local voice link enabling hands-free microphone input, speech-to-text transcription (via faster-whisper on CPU), local speech synthesis (Piper TTS with native system speaker fallbacks), and dynamic barge-in (interruption) control.

---

## ⚙️ Project Structure (Phase 4)
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
├── voice/
│   ├── stt.py           # faster-whisper CPU-locked speech transcriber
│   ├── tts.py           # Piper TTS with native OS speaker fallback
│   └── loop.py          # Audio capture, energy VAD, and barge-in execution loop
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

---

## 🎙️ Local voice Setup

### 1. (Optional) Configure high-quality Piper TTS
To run the high-fidelity neural Piper speaker instead of the default native OS speaker:
* **Download Piper executable**: Get the release matching your OS from [rhasspy/piper](https://github.com/rhasspy/piper/releases).
* **Download ONNX Voice Model**: Download the voice model [en_US-lessac-medium.onnx](https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/lessac/medium) and put it inside `mark45/voice/`.
* **Add to `.env`**:
  ```env
  PIPER_PATH=path/to/piper.exe
  PIPER_MODEL_PATH=mark45/voice/en_US-lessac-medium.onnx
  ```
If these files are missing, the loop automatically falls back to your OS's built-in text-to-speech framework (`pyttsx3`) so it works out-of-the-box.

---

## 🔍 Voice Verification Step

Run the hands-free voice loop using your local python environment:

```bash
# Inside the virtual environment from the mark45/ folder:
python mark45/voice/loop.py
```

### Expected End-to-End Behavior:
1. **Console Status**: The program prints diagnostic indicators for GPU VRAM check, loads Whisper on CPU, and logs:
   ```text
   =========================================
       MARK 45 LOCAL VOICE LINK ON
   =========================================
   Listening... Speak, and say your command.
   =========================================
   ```
2. **Speech Detection**: When you speak, the system automatically detects voice activity, transcribes it, and prints the text to your console:
   ```text
   🎤 Listening...
   Silence detected. Recording stopped.
   User: Hello MARK 45, run system diagnostics.
   ```
3. **Response & TTS Playback**: MARK 45 generates the streaming text response and plays it via your system speaker.
4. **Barge-in Interruption**: While the assistant is speaking, if you start talking, the voice loop immediately stops playing the speaker output, clearing the audio channel so it can listen to your new query.
5. **VRAM Protection**: All voice operations run on the CPU (Whisper model inference and Piper voice processing), leaving your GPU VRAM completely clear for Ollama inference.
