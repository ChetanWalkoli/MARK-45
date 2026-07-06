import os
import uuid
import time
import argparse
import logging
from typing import List

# Setup logger for standalone execution
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("mark45.memory.ingest")

try:
    from mark45.memory.embeddings import Embedder
    from mark45.memory.vector_store import QdrantStore
except ImportError:
    # Handle direct script execution path issues
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from memory.embeddings import Embedder
    from memory.vector_store import QdrantStore

def chunk_text(text: str, chunk_size_chars: int = 2000, overlap_chars: int = 200) -> List[str]:
    """
    Split text into chunks of roughly chunk_size_chars with overlap_chars overlap.
    """
    if not text:
        return []
    
    chunks = []
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = start + chunk_size_chars
        # If we aren't at the end of the text, try to find a natural boundary (newline/space)
        if end < text_len:
            # Look back up to 200 characters for a newline or paragraph break
            search_start = max(start, end - 200)
            boundary = text.rfind("\n", search_start, end)
            if boundary == -1:
                boundary = text.rfind(" ", search_start, end)
            if boundary != -1:
                end = boundary + 1
        
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
            
        start = end - overlap_chars
        if start >= text_len or (end - start) <= 0:
            break
            
    return chunks

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from a PDF file using pypdf."""
    try:
        from pypdf import PdfReader
    except ImportError:
        logger.error("pypdf is not installed. Run: pip install pypdf")
        return ""
        
    try:
        reader = PdfReader(pdf_path)
        text_parts = []
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        return "\n".join(text_parts)
    except Exception as e:
        logger.error(f"Failed to read PDF file {pdf_path}: {e}")
        return ""

def ingest_file(file_path: str, embedder: Embedder, store: QdrantStore):
    """
    Reads, chunks, embeds, and stores a file (.txt, .md, .pdf) in Qdrant.
    """
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return

    ext = os.path.splitext(file_path)[1].lower()
    text = ""
    
    logger.info(f"Ingesting file: {file_path}...")
    
    if ext in [".txt", ".md"]:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
        except Exception as e:
            logger.error(f"Failed to read text file {file_path}: {e}")
            return
    elif ext == ".pdf":
        text = extract_text_from_pdf(file_path)
    else:
        logger.warning(f"Unsupported file format '{ext}' for file {file_path}. Skipping.")
        return

    if not text.strip():
        logger.warning(f"No text extracted from {file_path}. Skipping.")
        return

    # Chunking: 500 tokens is roughly 2000 characters
    chunks = chunk_text(text, chunk_size_chars=2000, overlap_chars=200)
    logger.info(f"Split {file_path} into {len(chunks)} chunks.")

    for i, chunk in enumerate(chunks):
        try:
            vector = embedder.embed_query(chunk)
            point_id = str(uuid.uuid4())
            
            payload = {
                "type": "document",
                "filename": os.path.basename(file_path),
                "path": os.path.abspath(file_path),
                "content": chunk,
                "chunk_index": i,
                "timestamp": time.time(),
                "importance": 5 # Ingested knowledge documents get high default importance
            }
            
            store.upsert(id=point_id, vector=vector, payload=payload)
            logger.info(f"Ingested chunk {i+1}/{len(chunks)} successfully.")
        except Exception as e:
            logger.error(f"Failed to ingest chunk {i} for file {file_path}: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest documents (.txt, .md, .pdf) into MARK 45 Vector Memory")
    parser.add_argument("path", help="Path to file or directory containing files to ingest")
    args = parser.parse_args()

    # Initialize memory components
    # (Assuming localhost for standalone scripts, docker configuration loads from settings if run in server context)
    embedder = Embedder()
    store = QdrantStore(host="localhost", port=6333)

    if os.path.isdir(args.path):
        for root, _, files in os.walk(args.path):
            for file in files:
                file_path = os.path.join(root, file)
                ingest_file(file_path, embedder, store)
    else:
        ingest_file(args.path, embedder, store)
        
    logger.info("Ingestion process completed successfully!")
