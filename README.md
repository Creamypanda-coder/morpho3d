# ✨ Morpho3D — AI-Powered Image to 3D Model Generator

<div align="center">

![Morpho3D Banner](https://img.shields.io/badge/Morpho3D-Image%20to%203D-cyan?style=for-the-badge&logo=threedotjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js%2016-black?style=for-the-badge&logo=next.js)
![Three.js](https://img.shields.io/badge/Three.js-black?style=for-the-badge&logo=three.js)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)

**Transform any photo into a fully interactive 3D model in under 30 seconds.**  
Local, private, free — powered by Stable Fast 3D & AI Vision.

[🚀 Quick Start](#-quick-start) · [✨ Features](#-features) · [📦 Export Formats](#-export-formats) · [🤖 AI Models](#-ai-models-used)

</div>

---

## 🎯 What is Morpho3D?

**Morpho3D** is a local web workstation that converts any JPG, PNG, or WEBP image into a detailed 3D GLB model using cutting-edge AI — running entirely on your machine via localhost.

> Drop an image → AI analyzes it → Stable Fast 3D reconstructs it → Download in 13+ formats

No cloud uploads. No subscriptions. No credit systems. Just pure AI-powered 3D generation.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧠 **Multi-tier AI Vision** | OpenAI GPT-4o → LLaVA-1.5 → BLIP-2 cascade — analyzes actual image content |
| ⚡ **Stable Fast 3D** | StabilityAI's fastest open-source image-to-3D model via Hugging Face |
| 🔄 **Auto-fallback** | Falls back to TripoSR if SF3D ZeroGPU quota is hit |
| 🖥️ **Interactive 3D Viewer** | Three.js viewer with auto-grounding, PBR lighting, wireframe, fullscreen |
| 📦 **13 Export Formats** | GLB, GLTF, OBJ, STL, PLY, USDZ, PNG, JPEG, 4K PNG, WebM, Animated GIF |
| 🎮 **Game Engine Ready** | Direct import into Unity 3D, Unreal Engine 5, Apple AR |
| 🔒 **100% Local & Private** | Files stay on your machine, in `/public` directory |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### 1. Clone & Install

```bash
git clone https://github.com/Creamypanda-coder/morpho3d.git
cd morpho3d
npm install
```

### 2. Configure Environment (Optional but recommended)

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Optional: OpenAI GPT-4o Vision (best image analysis quality)
OPENAI_API_KEY=sk-...

# Optional: Hugging Face Token (increases SF3D rate limits)
HF_TOKEN=hf_...
```

> **Without any API keys:** The app still works — it uses LLaVA/BLIP-2 for free analysis and Stable Fast 3D via public ZeroGPU.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 🎬 How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                     MORPHO3D PIPELINE                        │
│                                                              │
│  1. UPLOAD          2. AI ANALYZE         3. RECONSTRUCT    │
│  ──────────         ────────────          ─────────────────  │
│  Drop JPG/PNG  →   Vision AI reads   →   Stable Fast 3D    │
│  or WEBP           shape, material,      feeds-forward      │
│                    geometry, depth       neural network      │
│                                          on GPU              │
│                                              │               │
│  4. INTERACT        5. EXPORT                               │
│  ────────────       ───────────                             │
│  Rotate/zoom   ←   Download GLB,                           │
│  in real-time       OBJ, STL, GIF,                         │
│  3D viewer          USDZ + 9 more                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Export Formats

### 3D Mesh
| Format | Extension | Best For |
|--------|-----------|----------|
| GLB (Binary GLTF) | `.glb` | Universal — Sketchfab, web, everywhere |
| GLTF (JSON) | `.gltf` | Web, editable, Substance Painter |
| Wavefront OBJ | `.obj` | Blender, Maya, 3ds Max, Cinema 4D |
| STL | `.stl` | 3D Printing, Fusion 360, SolidWorks |
| Stanford PLY | `.ply` | MeshLab, CloudCompare, research |

### Game Engine Ready
| Format | Extension | Best For |
|--------|-----------|----------|
| GLB (Unity) | `.glb` | Drag & drop into Unity 2019.3+ |
| GLB (Unreal) | `.glb` | Unreal Engine 5 GLTF Importer |
| USDZ | `.usdz` | Apple AR, iPhone QuickLook |

### Image & Animation
| Format | Extension | Best For |
|--------|-----------|----------|
| PNG Screenshot | `.png` | Lossless viewport capture |
| JPEG Screenshot | `.jpg` | Compressed, shareable |
| PNG 4K Render | `.png` | 2048×2048 high-res render |
| WebM Turntable | `.webm` | 5-second 360° loop video |
| Animated GIF | `.gif` | 36-frame turntable, loops forever |

---

## 🤖 AI Models Used

| Model | Provider | Role |
|-------|----------|------|
| [Stable Fast 3D](https://huggingface.co/stabilityai/stable-fast-3d) | StabilityAI | Primary 3D reconstruction |
| [TripoSR](https://huggingface.co/stabilityai/TripoSR) | StabilityAI | Fallback 3D reconstruction |
| GPT-4o Vision | OpenAI | Image analysis (if API key set) |
| [LLaVA-1.5-7B](https://huggingface.co/llava-hf/llava-1.5-7b-hf) | LLaVA | Free image analysis fallback |
| [BLIP-2](https://huggingface.co/Salesforce/blip-image-captioning-large) | Salesforce | Free captioning fallback |

---

## 🗂️ Project Structure

```
morpho3d/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page with motion demo
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Main workstation UI
│   │   └── api/
│   │       ├── upload/           # Image upload handler
│   │       ├── analyze/          # AI Vision analysis (4-tier)
│   │       └── generate/         # Stable Fast 3D / TripoSR pipeline
│   ├── components/
│   │   ├── ModelViewer.tsx       # Three.js 3D viewer + export engine
│   │   ├── ExportPanel.tsx       # Multi-format export UI
│   │   └── Toast.tsx             # Notification system
│   └── lib/
│       └── openai.ts             # OpenAI client
├── public/
│   ├── uploads/                  # Uploaded images (gitignored)
│   ├── generated/                # Generated GLB files (gitignored)
│   └── gif.worker.js             # GIF encoding web worker
└── scripts/
    └── generate.py               # (Legacy) Python generation script
```

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **3D Engine:** Three.js + React Three Fiber + Drei
- **AI APIs:** OpenAI, Hugging Face Inference API, Gradio (SF3D/TripoSR)
- **Export:** GLTFExporter, OBJExporter, STLExporter, PLYExporter, USDZExporter, gif.js
- **UI:** Tailwind CSS v4, Lucide Icons, Framer-style animations
- **State:** TanStack Query

---

## 📄 License

MIT © 2026 [Creamypanda-coder](https://github.com/Creamypanda-coder)

---

<div align="center">
  <sub>Built with ❤️ using Next.js, Three.js & Stable Fast 3D</sub>
</div>
