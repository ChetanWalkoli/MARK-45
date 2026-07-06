import os
import sys
import time
import wave
import logging
import numpy as np
from typing import Optional

logger = logging.getLogger("mark45.voice.loop")

# Ensure dependencies are available
try:
    import sounddevice as sd
    import soundfile as sf
except ImportError:
    print("\n❌ sounddevice or soundfile is not installed!")
    print("Please install them for audio capturing and playback:")
    print("👉 pip install sounddevice soundfile\n")
    raise

try:
    from mark45.voice.stt import WhisperSTT
    from mark45.voice.tts import PiperTTS
    from mark45.core.model_client import OllamaClient
    from mark45.memory.manager import MemoryManager
    from mark45.config.settings import settings
except ImportError:
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from voice.stt import WhisperSTT
    from voice.tts import PiperTTS
    from core.model_client import OllamaClient
    from memory.manager import MemoryManager
    from config.settings import settings

class VoiceAssistantLoop:
    def __init__(self):
        self.stt = WhisperSTT(model_size="base")
        self.tts = PiperTTS()
        self.ollama = OllamaClient(ollama_url=settings.ollama_url, model_name=settings.model_name)
        self.memory = MemoryManager()
        
        # Audio capture settings
        self.sample_rate = 16000
        self.channels = 1
        self.temp_user_wav = "temp_user.wav"
        self.temp_assistant_wav = "temp_assistant.wav"
        
        # VAD thresholds
        self.silence_limit_seconds = 1.5
        self.speaking_threshold_rms = 0.015 # Tune based on mic sensitivity
        self.barge_in_threshold_rms = 0.025

    def record_until_silence(self) -> bool:
        """
        Records audio from the microphone until silence is detected.
        Returns:
            bool: True if audio was captured, False otherwise.
        """
        logger.info("Awaiting speech... Speak into the microphone.")
        
        audio_frames = []
        is_speaking = False
        silent_chunks = 0
        chunk_size = 1024
        
        # Calculate how many silent chunks correspond to silence_limit_seconds
        chunks_per_sec = self.sample_rate / chunk_size
        max_silent_chunks = int(self.silence_limit_seconds * chunks_per_sec)

        try:
            with sd.InputStream(samplerate=self.sample_rate, channels=self.channels, dtype='float32') as stream:
                while True:
                    data, overflowed = stream.read(chunk_size)
                    if overflowed:
                        logger.warning("Audio input overflowed.")
                    
                    rms = np.sqrt(np.mean(data**2))
                    
                    if not is_speaking:
                        if rms > self.speaking_threshold_rms:
                            logger.info("🎤 Listening...")
                            is_speaking = True
                            audio_frames.append(data.copy())
                            silent_chunks = 0
                    else:
                        audio_frames.append(data.copy())
                        if rms < self.speaking_threshold_rms:
                            silent_chunks += 1
                        else:
                            silent_chunks = 0
                            
                        # If silence limit exceeded, stop recording
                        if silent_chunks > max_silent_chunks:
                            logger.info("Silence detected. Recording stopped.")
                            break
                            
        except Exception as e:
            logger.error(f"Error capturing audio input: {e}")
            return False

        if not audio_frames:
            return False

        # Concatenate and save to WAV file
        recording = np.concatenate(audio_frames, axis=0)
        # Convert float32 [-1.0, 1.0] to 16-bit PCM
        recording_int16 = (recording * 32767).astype(np.int16)
        
        with wave.open(self.temp_user_wav, "wb") as wf:
            wf.setnchannels(self.channels)
            wf.setsampwidth(2) # 2 bytes = 16-bit
            wf.setframerate(self.sample_rate)
            wf.writeframes(recording_int16.tobytes())
            
        return True

    def play_with_barge_in(self, wav_path: str) -> bool:
        """
        Plays assistant voice file while checking for user speech to barge-in.
        Returns:
            bool: True if played to completion, False if barged-in.
        """
        if not os.path.exists(wav_path):
            return False

        data, fs = sf.read(wav_path)
        chunk_size = 1024
        
        logger.info("🗣️ Speaking response...")
        
        # Start sounddevice playback
        sd.play(data, fs)
        
        # Open an input stream concurrently to monitor for barge-in speech
        interrupted = False
        try:
            with sd.InputStream(samplerate=self.sample_rate, channels=self.channels, dtype='float32') as stream:
                for start_idx in range(0, len(data), chunk_size):
                    # Check if sounddevice is still active playing
                    if not sd.get_stream().active:
                        break
                    
                    # Read current mic input
                    mic_data, _ = stream.read(chunk_size)
                    rms = np.sqrt(np.mean(mic_data**2))
                    
                    # Check if user spoke loudly enough to interrupt
                    if rms > self.barge_in_threshold_rms:
                        logger.info("Barge-in detected! Stopping playback.")
                        sd.stop()
                        interrupted = True
                        break
                        
        except Exception as e:
            logger.error(f"Error in barge-in monitor: {e}")
            
        if not interrupted:
            sd.wait()
            
        return not interrupted

    async def run_step(self):
        """Executes one iteration of STT -> LLM -> TTS -> Playback loop."""
        # 1. Record User Voice
        if not self.record_until_silence():
            return

        # 2. Speech-to-Text
        start_stt = time.time()
        user_text = self.stt.transcribe(self.temp_user_wav)
        stt_duration = time.time() - start_stt
        
        # Cleanup user recording
        if os.path.exists(self.temp_user_wav):
            os.remove(self.temp_user_wav)

        if not user_text.strip():
            logger.info("Could not transcribe clear speech. Retrying...")
            return

        print(f"\nUser: {user_text}")

        # 3. LLM Query & Response Generation
        print("MARK 45: ", end="", flush=True)
        start_llm = time.time()
        
        # Retrieve context from Memory
        context = self.memory.get_context_block(user_text)
        system_prompt = "You are MARK 45, a helpful local AI assistant."
        with open(settings.system_prompt_path, "r", encoding="utf-8") as f:
            system_prompt = f.read().strip()
            
        if context:
            system_prompt += f"\n{context}"
            
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_text}
        ]

        assistant_response = ""
        first_token_time = None
        
        async for token in self.ollama.chat(messages, stream=True):
            if first_token_time is None:
                first_token_time = time.time() - start_llm
            assistant_response += token
            print(token, end="", flush=True)
        print()

        llm_total_duration = time.time() - start_llm
        
        # Log performance
        logger.info(f"Performance: STT={stt_duration:.2f}s | LLM First Token={first_token_time or 0:.2f}s | LLM Total={llm_total_duration:.2f}s")

        # Store turn in memory matrix
        self.memory.store_turn("user", user_text)
        self.memory.store_turn("assistant", assistant_response)

        # 4. Text-to-Speech
        start_tts = time.time()
        ok = self.tts.speak(assistant_response, self.temp_assistant_wav)
        tts_duration = time.time() - start_tts
        
        logger.info(f"Performance: TTS generation={tts_duration:.2f}s")

        if ok and os.path.exists(self.temp_assistant_wav):
            # 5. Play Audio response with barge-in active
            self.play_with_barge_in(self.temp_assistant_wav)
            # Cleanup assistant audio file
            try:
                os.remove(self.temp_assistant_wav)
            except Exception:
                pass

    async def start(self):
        """Starts the voice assistant loop."""
        logger.info("Initializing MARK 45 OS local voice link...")
        
        # Verify Ollama is ready
        is_healthy = await self.ollama.check_health()
        if not is_healthy:
            logger.error("Ollama is offline. Starting system in DEGRADED voice loop mode.")
            
        print("\n=========================================")
        print("    MARK 45 LOCAL VOICE LINK ON")
        print("=========================================")
        print("Listening... Speak, and say your command.")
        print("Press Ctrl+C to terminate.")
        print("=========================================\n")
        
        try:
            while True:
                await self.run_step()
                time.sleep(0.5)
        except KeyboardInterrupt:
            print("\nShutting down voice link. Standby...")

if __name__ == "__main__":
    import asyncio
    loop = VoiceAssistantLoop()
    asyncio.run(loop.start())
