import os
import sys
import json

# Add TripoSR repository to Python path
triposr_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "TripoSR")
if triposr_path not in sys.path:
    sys.path.append(triposr_path)

def report_status(status, message, details=None):
    print(json.dumps({
        "status": status,
        "message": message,
        "details": details
    }))
    if status in ("success", "error"):
        sys.exit(0 if status == "success" else 1)

# Check dependencies
try:
    import torch
    if not hasattr(torch, "float8_e8m0fnu"):
        setattr(torch, "float8_e8m0fnu", torch.float32)
except ImportError:
    report_status("error", "PyTorch is not installed.", "Please install PyTorch with CUDA support: pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121")

try:
    from PIL import Image
except ImportError:
    report_status("error", "Pillow is not installed.", "Please install Pillow: pip install Pillow")

# Check CUDA device
if not torch.cuda.is_available():
    report_status("error", "NVIDIA CUDA is not available on your PyTorch installation.", "Ensure you have an NVIDIA GPU and installed PyTorch with CUDA enabled.")

try:
    # tsr is the official package for TripoSR
    from tsr.system import TSR
    from tsr.utils import remove_background, resize_foreground
except ImportError:
    report_status("error", "TripoSR (tsr) package is not installed.", "Please install the tsr library: pip install tsr")

def main():
    if len(sys.argv) < 3:
        report_status("error", "Invalid arguments.", "Usage: python local_generate.py <input_image> <output_glb>")

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if not os.path.exists(input_path):
        report_status("error", f"Input image not found: {input_path}", "")

    try:
        report_status("progress", "Loading TripoSR model weights into local GPU VRAM...", "")
        # Load TripoSR Model (weights are automatically downloaded on first run)
        device = "cuda"
        model = TSR.from_pretrained(
            "stabilityai/TripoSR",
            config_name="config.yaml",
            weight_name="model.ckpt"
        )
        model.renderer.set_chunk_size(8192)
        model.to(device)

        report_status("progress", "Preprocessing image (background removal)...", "")
        image = Image.open(input_path)
        
        import rembg
        import numpy as np
        rembg_session = rembg.new_session()
        processed_image = remove_background(image, rembg_session)
        processed_image = resize_foreground(processed_image, 0.85)

        # Blend transparent background to grey (0.5) and convert to RGB (3 channels)
        img_np = np.array(processed_image).astype(np.float32) / 255.0
        img_np = img_np[:, :, :3] * img_np[:, :, 3:4] + (1 - img_np[:, :, 3:4]) * 0.5
        processed_image = Image.fromarray((img_np * 255.0).astype(np.uint8))

        report_status("progress", "Running feed-forward 3D reconstruction on NVIDIA GPU...", "")
        with torch.no_grad():
            scene_codes = model([processed_image], device=device)

        report_status("progress", "Extracting mesh and compiling GLB file...", "")
        meshes = model.extract_mesh(scene_codes, True, resolution=256)
        meshes[0].export(output_path)

        report_status("success", "3D model generated locally using NVIDIA GPU successfully!", {
            "output_path": output_path
        })

    except Exception as e:
        report_status("error", f"Execution error: {str(e)}", "Please check your local CUDA drivers and PyTorch version.")

if __name__ == "__main__":
    main()
