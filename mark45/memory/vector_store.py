import logging
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct

logger = logging.getLogger("mark45.memory.vector_store")

class QdrantStore:
    """
    Wrapper around Qdrant client for upsert and search operations.
    """
    def __init__(self, host: str = "localhost", port: int = 6333, collection_name: str = "mark45_memory"):
        self.host = host
        self.port = port
        self.collection_name = collection_name
        self.vector_size = 384 # Dimension of sentence-transformers all-MiniLM-L6-v2
        self.client = QdrantClient(host=self.host, port=self.port)
        
        self._ensure_collection_exists()

    def _ensure_collection_exists(self):
        """Creates the collection in Qdrant if it doesn't already exist."""
        try:
            collections = self.client.get_collections()
            collection_names = [col.name for col in collections.collections]
            
            if self.collection_name not in collection_names:
                logger.info(f"Creating Qdrant collection '{self.collection_name}' with Cosine distance...")
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=self.vector_size, distance=Distance.COSINE),
                )
        except Exception as e:
            logger.error(f"Failed to connect to Qdrant or create collection: {e}")
            logger.warning("Ensure that Qdrant is running in Docker (docker-compose up -d).")

    def upsert(self, id: Any, vector: List[float], payload: Dict[str, Any]):
        """
        Upsert a vector point into Qdrant.
        """
        try:
            self.client.upsert(
                collection_name=self.collection_name,
                points=[
                    PointStruct(
                        id=id,
                        vector=vector,
                        payload=payload
                    )
                ]
            )
        except Exception as e:
            logger.error(f"Failed to upsert point into Qdrant: {e}")

    def search(self, vector: List[float], k: int = 5) -> List[Dict[str, Any]]:
        """
        Perform vector search in Qdrant.
        Returns:
            List of matched point payloads with similarity score appended.
        """
        try:
            hits = self.client.search(
                collection_name=self.collection_name,
                query_vector=vector,
                limit=k
            )
            
            results = []
            for hit in hits:
                data = hit.payload.copy()
                data["_score"] = hit.score  # Append similarity score
                data["_id"] = hit.id
                results.append(data)
            return results
        except Exception as e:
            logger.error(f"Failed to search vector in Qdrant: {e}")
            return []

    def delete_point(self, point_id: Any):
        """Deletes a specific point from Qdrant by ID."""
        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=[point_id]
            )
        except Exception as e:
            logger.error(f"Failed to delete point {point_id}: {e}")
