import os
import json
import hashlib
import random
import logging
from typing import List, Dict, Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("mark45.training.prepare_data")

def get_hash(text: str) -> str:
    """Returns MD5 hash of text for deduplication."""
    return hashlib.md5(text.encode("utf-8", errors="ignore")).hexdigest()

def clean_and_format_data(raw_data_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Filters, cleans, and formats raw data items into Chat JSON formats:
    {"messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
    """
    seen_hashes = set()
    cleaned_dataset = []

    for item in raw_data_list:
        # Check standard properties
        instruction = item.get("instruction", "").strip()
        response = item.get("output", item.get("response", "")).strip()
        system_msg = item.get("system", "You are MARK 45, a helpful local assistant.").strip()
        
        # If item is structured as pre-formatted messages list, extract instruction for dedup
        if "messages" in item and len(item["messages"]) >= 2:
            messages = item["messages"]
            # Find the user input for hashing
            user_inputs = [m["content"] for m in messages if m["role"] == "user"]
            inst_text = " ".join(user_inputs)
            response_text = messages[-1]["content"] if messages[-1]["role"] == "assistant" else ""
        else:
            inst_text = instruction
            response_text = response
            messages = [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": inst_text},
                {"role": "assistant", "content": response_text}
            ]

        if not inst_text or not response_text:
            continue # Basic quality filter: ignore empty query or empty answer

        # Check deduplication
        item_hash = get_hash(inst_text)
        if item_hash in seen_hashes:
            continue
            
        seen_hashes.add(item_hash)
        cleaned_dataset.append({"messages": messages})

    logger.info(f"Filtered raw items from {len(raw_data_list)} to {len(cleaned_dataset)} unique samples.")
    return cleaned_dataset

def split_and_save(dataset: List[Dict[str, Any]], output_dir: str, val_ratio: float = 0.1):
    """
    Shuffles the dataset, holds out val_ratio for validation, and saves to JSONL files.
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # Shuffle dataset
    random.seed(42)
    random.shuffle(dataset)
    
    val_size = int(len(dataset) * val_ratio)
    val_data = dataset[:val_size]
    train_data = dataset[val_size:]
    
    # Save train set
    train_path = os.path.join(output_dir, "train.jsonl")
    with open(train_path, "w", encoding="utf-8") as f:
        for item in train_data:
            f.write(json.dumps(item) + "\n")
            
    # Save val set
    val_path = os.path.join(output_dir, "val.jsonl")
    with open(val_path, "w", encoding="utf-8") as f:
        for item in val_data:
            f.write(json.dumps(item) + "\n")

    logger.info(f"Saved {len(train_data)} training samples to: {train_path}")
    logger.info(f"Saved {len(val_data)} validation samples to: {val_path}")

def generate_mock_personal_data() -> List[Dict[str, Any]]:
    """Generates basic personalized Q/A data about MARK 45 to bootstrap fine-tuning."""
    return [
        {
            "instruction": "Who built you?",
            "output": "I am MARK 45, a private offline-capable assistant built exclusively by Chetan Walkoli."
        },
        {
            "instruction": "What is your main hardware stack?",
            "output": "I run locally on Chetan's machine, optimized for an RTX 3050 GPU with 8GB of VRAM, utilizing Qdrant for memory."
        },
        {
            "instruction": "Tell me about your architecture.",
            "output": "My brain runs locally using Ollama. My memory is managed by Qdrant with CPU embeddings, and my automation is coordinated by a ReAct-style Multi-Agent system."
        },
        {
            "instruction": "What is your name?",
            "output": "I am MARK 45, your personal AI OS co-pilot."
        },
        {
            "instruction": "Can you run offline?",
            "output": "Yes, I am fully local, private, and capable of running completely offline on your local machine."
        },
        {
            "instruction": "What database do you use?",
            "output": "I use a local Qdrant container for vector memory storage and semantic retrieval."
        },
        {
            "instruction": "Who is Chetan?",
            "output": "Chetan Walkoli is a full-stack developer and AI systems engineer who created me."
        },
        {
            "instruction": "How do you run code safely?",
            "output": "I run Python and shell scripts inside a local, time-bounded, and access-controlled sandbox directory."
        },
        {
            "instruction": "What is Phase 5?",
            "output": "Phase 5 of my system development introduced the Planner and Router Multi-Agent coordination layers."
        },
        {
            "instruction": "What is Phase 6?",
            "output": "Phase 6 represents my QLoRA local fine-tuning pipeline to personalize my model weights on Chetan's private dataset."
        }
    ]

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Prepares training and validation datasets for QLoRA fine-tuning")
    parser.add_argument("--raw_data_path", help="Path to raw JSON file containing QA list (Optional)", default=None)
    parser.add_argument("--output_dir", help="Directory to output train/val JSONL files", default="./data")
    args = parser.parse_args()

    raw_items = []
    
    # If user provides a raw JSON data file, load it
    if args.raw_data_path and os.path.exists(args.raw_data_path):
        try:
            with open(args.raw_data_path, "r", encoding="utf-8") as f:
                raw_items = json.load(f)
            logger.info(f"Loaded {len(raw_items)} items from {args.raw_data_path}")
        except Exception as e:
            logger.error(f"Failed to read raw file: {e}")
            
    # If no data provided or load failed, bootstrap with mock personal data
    if not raw_items:
        logger.info("No raw dataset found. Bootstrapping with mock personal dataset about MARK 45...")
        raw_items = generate_mock_personal_data() * 15 # Duplicate to create a small workable batch

    cleaned_data = clean_and_format_data(raw_items)
    split_and_save(cleaned_data, args.output_dir, val_ratio=0.1)
