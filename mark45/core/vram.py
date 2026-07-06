import subprocess
import shutil
import logging

logger = logging.getLogger("mark45.core.vram")

def get_gpu_vram() -> dict:
    """
    Detects available GPU VRAM (total and free) using nvidia-smi.
    Returns:
        dict: {'total_mb': float, 'free_mb': float} or empty dict if detection fails.
    """
    if not shutil.which("nvidia-smi"):
        logger.warning("nvidia-smi not found in system PATH. Cannot detect GPU VRAM via nvidia-smi.")
        return {}

    try:
        # Run nvidia-smi query to get total and free memory
        cmd = ["nvidia-smi", "--query-gpu=memory.total,memory.free", "--format=csv,nounits,noheader"]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        
        lines = result.stdout.strip().split("\n")
        if lines:
            parts = lines[0].split(",")
            total_mb = float(parts[0].strip())
            free_mb = float(parts[1].strip())
            return {"total_mb": total_mb, "free_mb": free_mb}
    except Exception as e:
        logger.error(f"Error querying GPU VRAM via nvidia-smi: {e}")

    # Fallback to PyTorch if installed and available
    try:
        import torch
        if torch.cuda.is_available():
            device = 0
            total_b = torch.cuda.get_device_properties(device).total_memory
            # PyTorch doesn't have a direct query for free memory without allocating,
            # but we can get cached/allocated memory
            allocated_b = torch.cuda.memory_allocated(device)
            reserved_b = torch.cuda.memory_reserved(device)
            free_b = total_b - allocated_b
            return {
                "total_mb": total_b / (1024 * 1024),
                "free_mb": free_b / (1024 * 1024)
            }
    except ImportError:
        pass
    except Exception as e:
        logger.error(f"Error querying GPU VRAM via PyTorch: {e}")

    return {}

def estimate_fits(model_name: str) -> tuple[bool, str]:
    """
    Estimates if a model fits in 8GB VRAM (the target device RTX 3050).
    Args:
        model_name: Name of the Ollama model (e.g. 'llama3.2:3b', 'llama3.1:8b')
    Returns:
        tuple[bool, str]: (fits_in_8gb, explanation_message)
    """
    # Parse parameter size from model name if possible
    # e.g., 'llama3.2:3b' -> 3.0, 'llama3.1:8b' -> 8.0
    param_size = 3.0 # default fallback
    model_lower = model_name.lower()
    
    import re
    match = re.search(r'(\d+(?:\.\d+)?)[bB]', model_lower)
    if match:
        try:
            param_size = float(match.group(1))
        except ValueError:
            pass

    # Quantized 4-bit models require roughly:
    # Size in GB = Parameters (Billions) * 0.55 GB (for Q4_K_M weights)
    # Add roughly 1.5 GB for context window (KV cache) and backend overhead.
    estimated_weight_gb = param_size * 0.55
    estimated_total_vram_gb = estimated_weight_gb + 1.5

    # Check against our target hard ceiling (7.0 GB for OS headroom)
    target_limit_gb = 7.0
    fits = estimated_total_vram_gb <= target_limit_gb

    vram_info = get_gpu_vram()
    gpu_detected = bool(vram_info)
    
    if gpu_detected:
        actual_free_gb = vram_info["free_mb"] / 1024.0
        actual_total_gb = vram_info["total_mb"] / 1024.0
        
        status_msg = (
            f"Detected GPU VRAM: {actual_free_gb:.2f} GB free of {actual_total_gb:.2f} GB total. "
            f"Model {model_name} (~{param_size}B) requires ~{estimated_total_vram_gb:.2f} GB VRAM."
        )
        
        # If the actual free VRAM is less than estimated requirement, warn
        if actual_free_gb < estimated_total_vram_gb:
            return False, f"[WARNING]: Insufficient VRAM! {status_msg}"
        return True, f"[OK]: VRAM OK: {status_msg}"
    else:
        # Fallback static estimation (optimizing for 8GB device with 7GB target limit)
        status_msg = (
            f"GPU VRAM detection unavailable (falling back to static checks). "
            f"Model {model_name} (~{param_size}B) requires ~{estimated_total_vram_gb:.2f} GB VRAM."
        )
        if estimated_total_vram_gb > target_limit_gb:
            return False, f"[WARNING]: Model might exceed VRAM! {status_msg} Limit for RTX 3050 is ~7.0 GB."
        return True, f"[OK]: VRAM Check Passed: {status_msg}"
