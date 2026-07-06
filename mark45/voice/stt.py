import os
import time
import logging
from typing import Optional

logger = logging.getLogger("mark45.voice.stt")

class WhisperSTT:
    """
    Speech-To-Text client using faster-whisper, running on CPU to preserve VRAM.
    """
    def __init__(self, model_size: str = "base"):
        self.model_size = model_size
        self.model = None

    def _load_model(self):
        if self.model is None:
            try:
                from faster_whisper import WhisperModel
                logger.info(f"Loading faster-whisper model '{self.model_size}' on CPU...")
                # Lock to CPU and compute_type="int8" to minimize RAM and save all VRAM for LLM
                self.model = WhisperModel(
                    self.model_size, 
                    device="cpu", 
                    compute_type="int8"
                )
            except ImportError:
                print("\n❌ faster-whisper is not installed!")
                print("Please run this command to install STT requirements:")
                print("👉 pip install faster-whisper\n")
                raise
            except Exception as e:
                logger.error(f"Failed to load Whisper model: {e}")
                # Fallback to tiny if base fails
                if self.model_size != "tiny":
                    logger.info("Retrying with 'tiny' Whisper model...")
                    self.model_size = "tiny"
                    self._load_model()
                else:
                    raise

    def transcribe(self, audio_path: str) -> str:
        """
        Transcribes the given audio file path to text.
        """
        self._load_model()
        
        if not os.path.exists(audio_path):
            logger.error(f"Audio file not found: {audio_path}")
            return ""

        start_time = time.time()
        try:
            segments, info = self.model.transcribe(audio_path, beam_size=5)
            
            # Combine all transcribed segments
            text_segments = [segment.text for segment in segments]
            text = " ".join(text_segments).strip()
            
            elapsed = time.time() - start_time
            logger.info(f"STT completed in {elapsed:.2f}s | Result: '{text}'")
            return text
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            return ""
