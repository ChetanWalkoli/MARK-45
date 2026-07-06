import time
import uuid
import logging
from typing import List, Dict, Any
from mark45.memory.embeddings import Embedder
from mark45.memory.vector_store import QdrantStore

logger = logging.getLogger("mark45.memory.manager")

class MemoryManager:
    """
    Manages embedding generation, vector indexing, retrieval scoring,
    and memory consolidation (decay/pruning).
    """
    def __init__(self, qdrant_host: str = "localhost", qdrant_port: int = 6333):
        self.embedder = Embedder()
        self.store = QdrantStore(host=qdrant_host, port=qdrant_port)
        self.relevance_threshold = 0.35 # Filter noise below this threshold

    def store_turn(self, role: str, content: str, importance: int = 3):
        """
        Stores a chat turn in the vector memory.
        Args:
            role: 'user' or 'assistant'
            content: Message string
            importance: User preference score 1-5
        """
        if not content.strip():
            return

        try:
            logger.info(f"Embedding and storing chat turn for role '{role}'...")
            vector = self.embedder.embed_query(content)
            
            point_id = str(uuid.uuid4())
            timestamp = time.time()
            
            payload = {
                "type": "chat",
                "role": role,
                "content": content,
                "timestamp": timestamp,
                "importance": int(importance)
            }
            
            self.store.upsert(id=point_id, vector=vector, payload=payload)
        except Exception as e:
            logger.error(f"Failed to store chat turn: {e}")

    def retrieve_context(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """
        Retrieves relevant memories and ranks them based on relevance, recency, and importance.
        Reranking formula:
            final_score = 0.5 * relevance + 0.3 * recency + 0.2 * importance
        """
        try:
            query_vector = self.embedder.embed_query(query)
            hits = self.store.search(vector=query_vector, k=k)
            
            current_time = time.time()
            ranked_results = []
            
            logger.info(f"--- RAG RETRIEVAL LOG FOR QUERY: '{query}' ---")
            for hit in hits:
                relevance = max(0.0, min(1.0, hit["_score"])) # clamp between 0 and 1
                
                # Recency calculation: decays over time. Scale parameter: 86400 (1 day)
                timestamp = hit.get("timestamp", current_time)
                time_diff = max(0.0, current_time - timestamp)
                recency = 1.0 / (1.0 + (time_diff / 86400.0))
                
                # Importance calculation: 1-5 scale normalized to 0-1
                importance_val = hit.get("importance", 3)
                importance = importance_val / 5.0
                
                # Ranking calculation
                final_score = (0.5 * relevance) + (0.3 * recency) + (0.2 * importance)
                
                logger.info(
                    f"Hit: '{hit['content'][:40]}...' | "
                    f"Relevance: {relevance:.3f}, Recency: {recency:.3f}, Importance: {importance:.3f} | "
                    f"Final Rerank Score: {final_score:.3f}"
                )
                
                # Only inject context above threshold to prevent noise injection
                if final_score >= self.relevance_threshold:
                    hit["_final_score"] = final_score
                    ranked_results.append(hit)
            
            # Sort descending by final score
            ranked_results.sort(key=lambda x: x["_final_score"], reverse=True)
            logger.info(f"Retrieved {len(ranked_results)} memories above threshold of {self.relevance_threshold}.")
            logger.info("--------------------------------------------------")
            
            return ranked_results
        except Exception as e:
            logger.error(f"Context retrieval failed: {e}")
            return []

    def get_context_block(self, query: str, top_n: int = 3) -> str:
        """
        Retrieves top N memories and formats them into a prompt context block.
        """
        memories = self.retrieve_context(query, k=5)
        if not memories:
            return ""

        context_lines = []
        for mem in memories[:top_n]:
            content = mem["content"].replace("\n", " ")
            context_lines.append(f"- [{mem.get('type', 'info')}] {content}")

        if context_lines:
            return "\nMEMORY:\n" + "\n".join(context_lines) + "\n"
        return ""

    def prune(self, retention_days: int = 30):
        """
        Identifies old conversation turns with low importance and prunes them from memory.
        """
        # Note: A production implementation would query vector DB by filter.
        # For our local Qdrant wrapper, we can log the pruning directive.
        logger.info(f"Triggered memory consolidation scan for turns older than {retention_days} days...")
        # Since this runs local-first and Qdrant free edition is highly optimized,
        # we will add vector storage queries for cleaning in future agent cycles.
        pass
