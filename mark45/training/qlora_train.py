import os
import sys
import yaml
import time
import logging
from typing import Dict, Any

# Ensure import paths resolve
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from mark45.core.vram import get_gpu_vram
except ImportError:
    from core.vram import get_gpu_vram

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("mark45.training.train")

def load_yaml_config(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def run_preflight_checks(config: Dict[str, Any]) -> Tuple[Dict[str, Any], bool]:
    """
    Analyzes VRAM and adjusts training params to fit inside the RTX 3050 (8GB VRAM) budget.
    """
    vram_info = get_gpu_vram()
    gpu_available = bool(vram_info)
    
    print("\n=========================================")
    print("      QLORA PRE-FLIGHT DIAGNOSTICS")
    print("=========================================")
    
    # 8GB Target Budget limits
    safe_vram_limit_gb = 7.0
    
    if gpu_available:
        free_vram_gb = vram_info["free_mb"] / 1024.0
        total_vram_gb = vram_info["total_mb"] / 1024.0
        print(f"Detected GPU: {free_vram_gb:.2f} GB free VRAM of {total_vram_gb:.2f} GB total.")
        
        if free_vram_gb < safe_vram_limit_gb:
            print(f"⚠️ WARNING: Available VRAM ({free_vram_gb:.2f} GB) is below safety limit ({safe_vram_limit_gb} GB).")
            print("Applying aggressive memory optimizations:")
            print(" - Enforcing Qwen-1.5B (or smaller) model size.")
            print(" - Restricting max sequence length to 512 tokens.")
            print(" - Enforcing paged_adamw_8bit optimizer and double quantization.")
            print(" - Activating gradient checkpointing.")
            
            # Adjust config dynamically
            config["model"]["base_model_name"] = "Qwen/Qwen2.5-1.5B-Instruct"
            config["training"]["max_seq_length"] = 512
            config["training"]["gradient_checkpointing"] = True
            config["training"]["optim"] = "paged_adamw_8bit"
            config["quantization"]["bnb_4bit_use_double_quant"] = True
        else:
            print("✅ VRAM OK: Sufficient memory for standard 3B fine-tuning.")
    else:
        print("❌ No NVIDIA GPU detected or nvidia-smi is unavailable.")
        print("⚠️ WARNING: Attempting to run fine-tuning on CPU will be extremely slow!")
        print("💡 RECOMMENDATION: For faster training, rent a cloud GPU instance (e.g. RunPod / Vast.ai)")
        print("   for ~$0.30/hour, then download the adapters locally for private offline inference.")
        print("Setting fallback to 0.5B parameter model to prevent CPU crash...")
        
        config["model"]["base_model_name"] = config["model"].get("fallback_model_name", "Qwen/Qwen2.5-0.5B-Instruct")
        config["training"]["max_seq_length"] = 256
        config["training"]["optim"] = "adamw_torch" # CPU doesn't support 8bit CUDA optimizers
        
    print("=========================================\n")
    return config, gpu_available

def check_dependencies():
    """Verify deep learning dependencies are present, print installation command if not."""
    required = ["torch", "transformers", "peft", "trl", "bitsandbytes", "datasets"]
    missing = []
    for pkg in required:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
            
    if missing:
        print("\n❌ Missing QLoRA training dependencies!")
        print("Please run this command to install the required libraries:")
        print("👉 pip install torch transformers peft trl bitsandbytes datasets pyyaml\n")
        sys.exit(1)

def train():
    check_dependencies()
    
    # Import libraries after dependency check to avoid crash
    import torch
    from datasets import load_dataset
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        TrainingArguments,
        BitsAndBytesConfig
    )
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from trl import SFTTrainer

    # 1. Load config and run VRAM check
    config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config", "train.yaml")
    config = load_yaml_config(config_path)
    config, gpu_available = run_preflight_checks(config)

    model_name = config["model"]["base_model_name"]
    logger.info(f"Preparing to train: {model_name}")

    # 2. BitsAndBytes Quantization Config
    # If running on CPU, we cannot load in 4-bit via bitsandbytes
    if gpu_available:
        compute_dtype = getattr(torch, config["quantization"]["bnb_4bit_compute_dtype"])
        if not torch.cuda.is_bf16_supported() and config["quantization"]["bnb_4bit_compute_dtype"] == "bfloat16":
            compute_dtype = torch.float16
            
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=config["quantization"]["load_in_4bit"],
            bnb_4bit_quant_type=config["quantization"]["bnb_4bit_quant_type"],
            bnb_4bit_use_double_quant=config["quantization"]["bnb_4bit_use_double_quant"],
            bnb_4bit_compute_dtype=compute_dtype
        )
    else:
        bnb_config = None

    # 3. Load Tokenizer & Model
    logger.info("Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    logger.info("Loading base model...")
    device_map = "auto" if gpu_available else "cpu"
    
    if gpu_available:
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            quantization_config=bnb_config,
            device_map=device_map,
            trust_remote_code=True
        )
        # Prepare for quantized training
        model = prepare_model_for_kbit_training(model)
    else:
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            device_map=device_map,
            trust_remote_code=True,
            torch_dtype=torch.float32
        )

    # 4. LoRA config
    lora_config = LoraConfig(
        r=config["lora"]["r"],
        lora_alpha=config["lora"]["alpha"],
        target_modules=config["lora"]["target_modules"],
        lora_dropout=config["lora"]["dropout"],
        bias=config["lora"]["bias"],
        task_type=config["lora"]["task_type"]
    )
    
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # 5. Load dataset
    data_dir = "./data"
    train_file = os.path.join(data_dir, "train.jsonl")
    val_file = os.path.join(data_dir, "val.jsonl")
    
    if not os.path.exists(train_file):
        logger.error(f"Training data not found at {train_file}. Please run prepare_data.py first.")
        sys.exit(1)

    logger.info("Loading prepared train/val datasets...")
    dataset = load_dataset("json", data_files={"train": train_file, "validation": val_file})

    # Formatter for ChatML / Message formatting
    def format_prompts(batch):
        formatted = []
        for messages in batch["messages"]:
            # Format using tokenizer chat template
            text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
            formatted.append(text)
        return formatted

    # 6. Training Arguments
    training_args = TrainingArguments(
        output_dir=config["training"]["output_dir"],
        per_device_train_batch_size=config["training"]["per_device_train_batch_size"],
        gradient_accumulation_steps=config["training"]["gradient_accumulation_steps"],
        learning_rate=float(config["training"]["learning_rate"]),
        lr_scheduler_type=config["training"]["lr_scheduler_type"],
        warmup_ratio=config["training"]["warmup_ratio"],
        num_train_epochs=config["training"]["num_train_epochs"],
        weight_decay=config["training"]["weight_decay"],
        optim=config["training"]["optim"],
        logging_steps=config["training"]["logging_steps"],
        eval_steps=config["training"]["eval_steps"],
        save_steps=config["training"]["save_steps"],
        evaluation_strategy=config["training"]["evaluation_strategy"],
        save_strategy=config["training"]["save_strategy"],
        gradient_checkpointing=config["training"]["gradient_checkpointing"],
        fp16=not torch.cuda.is_bf16_supported() if gpu_available else False,
        bf16=torch.cuda.is_bf16_supported() if gpu_available else False,
        logging_dir="./logs",
        report_to=config["training"]["report_to"],
        remove_unused_columns=False
    )

    # 7. SFTTrainer
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset["train"],
        eval_dataset=dataset["validation"],
        peft_config=lora_config,
        max_seq_length=config["training"]["max_seq_length"],
        tokenizer=tokenizer,
        formatting_func=format_prompts,
        args=training_args
    )

    # Disable cache to allow gradient checkpointing
    model.config.use_cache = False

    logger.info("Starting fine-tuning process...")
    start_time = time.time()
    trainer.train()
    
    # Save fine-tuned adapter weights
    trainer.model.save_pretrained("./adapters")
    tokenizer.save_pretrained("./adapters")
    
    elapsed = time.time() - start_time
    logger.info(f"Training completed successfully in {elapsed/60:.2f} minutes!")

if __name__ == "__main__":
    train()
