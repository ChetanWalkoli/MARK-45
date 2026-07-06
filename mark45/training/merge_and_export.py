import os
import sys
import yaml
import logging

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("mark45.training.merge")

def load_yaml_config(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def merge_weights():
    # Verify imports
    try:
        import torch
        from peft import PeftModel
        from transformers import AutoModelForCausalLM, AutoTokenizer
    except ImportError:
        print("\n❌ Missing merge dependencies!")
        print("Please install requirements: pip install torch transformers peft\n")
        sys.exit(1)

    config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config", "train.yaml")
    config = load_yaml_config(config_path)
    base_model_name = config["model"]["base_model_name"]
    adapters_dir = "./adapters"
    merged_dir = "./merged_model"

    if not os.path.exists(adapters_dir):
        logger.error(f"LoRA adapters not found at {adapters_dir}. Please run qlora_train.py first.")
        sys.exit(1)

    logger.info(f"Loading base model: {base_model_name} on CPU...")
    try:
        # Load base model on CPU to protect VRAM
        base_model = AutoModelForCausalLM.from_pretrained(
            base_model_name,
            torch_dtype=torch.float16,
            device_map="cpu",
            trust_remote_code=True
        )
        
        tokenizer = AutoTokenizer.from_pretrained(base_model_name)
        
        logger.info(f"Loading LoRA adapters from {adapters_dir}...")
        model = PeftModel.from_pretrained(base_model, adapters_dir)
        
        logger.info("Merging LoRA adapters into base weights...")
        merged_model = model.merge_and_unload()
        
        logger.info(f"Saving merged HF model weights to: {merged_dir}...")
        os.makedirs(merged_dir, exist_ok=True)
        merged_model.save_pretrained(merged_dir)
        tokenizer.save_pretrained(merged_dir)
        
        logger.info("Weight merge completed successfully!")
        print_export_instructions(merged_dir)
        
    except Exception as e:
        logger.error(f"Failed to merge weights: {e}")
        sys.exit(1)

def print_export_instructions(merged_dir: str):
    absolute_merged_path = os.path.abspath(merged_dir)
    print("\n" + "="*70)
    print("      EXPORT TO GGUF & OLLAMA INITIALIZATION")
    print("="*70)
    print("\nTo load your fine-tuned model into Ollama, follow these steps:")
    print("\n1. Clone llama.cpp repository to get the conversion scripts:")
    print("   git clone https://github.com/ggerganov/llama.cpp.git")
    print("   pip install -r llama.cpp/requirements.txt")
    print("\n2. Convert the merged PyTorch/HF weights to GGUF format:")
    print(f"   python llama.cpp/convert_hf_to_gguf.py {absolute_merged_path} --outfile mark45_custom.gguf")
    print("\n3. Create a Modelfile:")
    print("   Create a file named 'Modelfile' in your current directory with these contents:")
    print("-" * 50)
    print("   FROM ./mark45_custom.gguf")
    print("   PARAMETER temperature 0.7")
    print("   SYSTEM \"You are MARK 45 — Chetan's custom-trained offline co-pilot. Be direct.\"")
    print("-" * 50)
    print("\n4. Initialize and load model into Ollama:")
    print("   ollama create mark45-custom -f Modelfile")
    print("\n5. Update your MARK 45 configuration in .env:")
    print("   Update MODEL_NAME=mark45-custom and restart FastAPI.")
    print("="*70 + "\n")

if __name__ == "__main__":
    merge_weights()
