import os
import shutil
import logging
import subprocess
import time
from typing import Optional

logger = logging.getLogger("mark45.voice.tts")

class PiperTTS:
    """
    Lightweight Piper TTS wrapper with native pyttsx3 fallback.
    """
    def __init__(self, piper_path: Optional[str] = None, model_path: Optional[str] = None):
        # Allow override from env/params
        self.piper_path = piper_path or os.environ.get("PIPER_PATH", "piper")
        self.model_path = model_path or os.environ.get("PIPER_MODEL_PATH", "en_US-lessac-medium.onnx")
        self.use_fallback = False
        
        self._check_piper_availability()

    def _check_piper_availability(self):
        """Verifies if Piper binary and voice model exist; configures OS fallback if missing."""
        if not shutil.which(self.piper_path) and not os.path.exists(self.piper_path):
            logger.warning("Piper binary not found in PATH or configured directory.")
            self.use_fallback = True
            
        if not self.use_fallback and not os.path.exists(self.model_path):
            logger.warning(f"Piper ONNX model not found at: {self.model_path}")
            self.use_fallback = True

        if self.use_fallback:
            print("\n💡 Piper TTS is not fully configured. Using system speech fallback (pyttsx3).")
            print("To enable high-quality local Piper TTS:")
            print("1. Download Piper binary: https://github.com/rhasspy/piper/releases")
            print("2. Download Voice Model (e.g. en_US-lessac-medium.onnx): https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/lessac/medium")
            print("3. Configure paths in .env: PIPER_PATH=path/to/piper.exe and PIPER_MODEL_PATH=path/to/model.onnx\n")

    def speak(self, text: str, output_wav_path: str = "output.wav") -> bool:
        """
        Synthesizes text to speech.
        """
        if not text.strip():
            return False

        start_time = time.time()
        
        if not self.use_fallback:
            try:
                # Command: piper --model model.onnx --output_file out.wav
                cmd = [
                    self.piper_path,
                    "--model", self.model_path,
                    "--output_file", output_wav_path
                ]
                
                # Run Piper process, feeding text to stdin
                process = subprocess.Popen(
                    cmd,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                _, stderr = process.communicate(input=text)
                
                if process.returncode == 0 and os.path.exists(output_wav_path):
                    elapsed = time.time() - start_time
                    logger.info(f"Piper TTS generated speech in {elapsed:.2f}s")
                    return True
                else:
                    logger.error(f"Piper failed with code {process.returncode}: {stderr}")
            except Exception as e:
                logger.error(f"Failed to execute Piper: {e}")

        # Fallback to pyttsx3
        try:
            import pyttsx3
            engine = pyttsx3.init()
            # Set speed and voice parameters
            engine.setProperty("rate", 160)
            
            # Since pyttsx3 plays directly or saves to file, let's write to file if requested
            if output_wav_path:
                # pyttsx3 can write to a file directly
                # Wait until file writing completes
                engine.save_to_file(text, output_wav_path)
                engine.runAndWait()
                # Ensure engine resets correctly
                time.sleep(0.1)
                
            elapsed = time.time() - start_time
            logger.info(f"System TTS fallback generated speech in {elapsed:.2f}s")
            return True
        except ImportError:
            print("\n❌ pyttsx3 is not installed!")
            print("Please run: pip install pyttsx3\n")
            return False
        except Exception as e:
            logger.error(f"TTS Fallback execution failed: {e}")
            return False
