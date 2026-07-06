import os
import logging
from typing import List

logger = logging.getLogger("mark45.memory.embeddings")

class Embedder:
    """
    Sentence Transformers embedder class, locked to CPU to preserve GPU VRAM.
    """
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None

    def _load_model(self):
        if self.model is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading SentenceTransformer model '{self.model_name}' on CPU...")
                # Lock to CPU explicitly to keep GPU VRAM completely clear for Ollama
                self.model = SentenceTransformer(self.model_name, device="cpu")
            except ImportError:
                logger.error("sentence-transformers is not installed. Please run: pip install sentence-transformers")
                raise
            except Exception as e:
                logger.error(f"Failed to load sentence-transformers model: {e}")
                raise

    def embed_query(self, text: str) -> List[float]:
        """Embed a single query string."""
        self._load_model()
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed a batch of document strings."""
        self._load_model()
        embeddings = self.model.encode(texts, convert_to_numpy=True)
        return embeddings.tolist()
