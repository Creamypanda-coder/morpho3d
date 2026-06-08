"use client";

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/components/Toast";
import { 
  Upload, 
  ArrowLeft, 
  Sparkles, 
  Box, 
  Download, 
  Terminal, 
  Cpu, 
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  Clock,
  Play,
  Zap,
  Eye,
  RefreshCw
} from "lucide-react";

// Dynamically import the 3D Viewer with SSR disabled
const ModelViewer = dynamic(() => import("@/components/ModelViewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 rounded-2xl">
      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      <p className="mt-3 text-xs text-gray-500 font-mono">Initializing 3D Engine...</p>
    </div>
  ),
});

const SOURCE_BADGES: Record<string, { label: string; color: string }> = {
  gemini: { label: "Google Gemini Vision", color: "text-sky-400 bg-sky-950/40 border-sky-500/20" },
  openai: { label: "OpenAI GPT-4o Vision", color: "text-emerald-400 bg-emerald-950/40 border-emerald-500/20" },
  llava: { label: "LLaVA-1.5 Vision", color: "text-indigo-400 bg-indigo-950/40 border-indigo-500/20" },
  blip2: { label: "BLIP-2 Vision", color: "text-violet-400 bg-violet-950/40 border-violet-500/20" },
  local: { label: "Local Image Inspector", color: "text-amber-400 bg-amber-950/40 border-amber-500/20" },
};

export default function Dashboard() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const glbInputRef = useRef<HTMLInputElement>(null);
  
  // App States
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisSource, setAnalysisSource] = useState<string>("local");
  const [modelPath, setModelPath] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [modelType, setModelType] = useState<string>("local-gpu");

  const addLog = useCallback((msg: string) => {
    setConsoleLogs((prev) => [...prev, msg]);
  }, []);

  const handleGlbImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".glb")) {
      toast("Invalid file type. Please select a model in GLB format.", "error", "Invalid Format");
      return;
    }

    try {
      if (modelPath && modelPath.startsWith("blob:")) {
        URL.revokeObjectURL(modelPath);
      }
      
      const localUrl = URL.createObjectURL(file);
      setModelPath(localUrl);
      
      e.target.value = "";
      
      toast(`Successfully loaded ${file.name} visually!`, "success", "Model Loaded");
      addLog(`[SYSTEM] Imported local GLB model: ${file.name}`);
    } catch (err: any) {
      toast(`Failed to load GLB file: ${err.message}`, "error", "Import Failed");
    }
  };

  const handleClearModel = () => {
    if (modelPath && modelPath.startsWith("blob:")) {
      URL.revokeObjectURL(modelPath);
    }
    setModelPath(null);
    toast("3D viewport has been reset.", "info", "Viewport Reset");
    addLog("[SYSTEM] 3D viewport cleared.");
  };

  // File Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setAnalysis(null);
      setModelPath(null);
      setConsoleLogs([]);

      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "File upload failed");
      }

      return res.json() as Promise<{ success: boolean; imagePath: string }>;
    },
    onSuccess: (data) => {
      setImagePath(data.imagePath);
      toast("Image uploaded! Now analyzing with AI Vision...", "success", "Upload Complete");
      // Auto-trigger analysis after upload
      setTimeout(() => {
        analyzeMutation.mutate(data.imagePath);
      }, 300);
    },
    onError: (err: any) => {
      toast(err.message, "error", "Upload Failed");
    }
  });

  // Image Analysis Mutation
  const analyzeMutation = useMutation({
    mutationFn: async (path: string) => {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath: path }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "AI Analysis failed");
      }

      return res.json() as Promise<{ prompt: string; source: string }>;
    },
    onSuccess: (data) => {
      setAnalysis(data.prompt);
      setAnalysisSource(data.source || "local");
      const badge = SOURCE_BADGES[data.source] || SOURCE_BADGES["local"];
      toast(`Image analyzed by ${badge.label}`, "success", "Analysis Complete");
    },
    onError: (err: any) => {
      toast(err.message, "error", "Analysis Failed");
    }
  });

  // 3D Generation Mutation — passes analysis to backend
  const generateMutation = useMutation({
    mutationFn: async (path: string) => {
      setConsoleLogs([
        "[SYSTEM] Initializing 3D Reconstruction Pipeline...",
        `[INFO] Source Image: ${path}`,
        `[INFO] Model: ${
          modelType === "local-gpu" ? "Local GPU (TripoSR Offline)" :
          modelType === "tripo-api" ? "Tripo AI API (Commercial SOTA)" :
          modelType === "trellis" ? "Microsoft TRELLIS (High-Quality)" :
          modelType === "stable-fast-3d" ? "Stable Fast 3D (Fast)" : 
          "TripoSR (Standard)"
        }`,
        analysis
          ? `[INFO] AI Analysis context loaded (${SOURCE_BADGES[analysisSource]?.label || "AI Vision"}) — guiding reconstruction.`
          : "[INFO] No analysis context. Upload and analyze image first for best results.",
        "[INFO] Connecting to Hugging Face inference pipeline...",
      ]);

      const logSteps = [
        { msg: "[PIPELINE] Queue joined. Uploading to GPU worker...", delay: 800 },
        { msg: "[PIPELINE] Background removal & foreground extraction...", delay: 2500 },
        { msg: "[PIPELINE] Running feed-forward 3D reconstruction on GPU...", delay: 5000 },
        { msg: "[PIPELINE] Generating PBR textures & UV coordinates...", delay: 9000 },
        { msg: "[PIPELINE] Compiling 3D mesh to binary GLB format...", delay: 12500 },
      ];

      logSteps.forEach(({ msg, delay }) => {
        setTimeout(() => addLog(msg), delay);
      });

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePath: path,
          modelType,
          analysisPrompt: analysis || null, // ← pass AI analysis to backend
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "3D generation failed" }));
        throw new Error(errorData.error || "3D generation failed");
      }

      const blob = await res.blob();
      const localModelUrl = URL.createObjectURL(blob);
      const modelUsed = res.headers.get("x-model-used") || "stable-fast-3d";
      const fallbackTriggered = res.headers.get("x-fallback-triggered") === "true";

      return { 
        success: true, 
        modelPath: localModelUrl, 
        modelUsed, 
        fallbackTriggered 
      };
    },
    onSuccess: (data) => {
      setModelPath(data.modelPath);
      
      if (data.fallbackTriggered) {
        addLog(`[WARNING] Model pipeline hit limits or failed — fell back to ${
          data.modelUsed === "tripo-api" ? "Tripo AI API" :
          data.modelUsed === "trellis" ? "Microsoft TRELLIS" :
          data.modelUsed === "stable-fast-3d" ? "Stable Fast 3D" : 
          "TripoSR"
        }.`);
        addLog(`[TIP] Local GPU requires Python/CUDA. Try checking server logs for detailed local GPU setup guides.`);
      } else {
        addLog(`[SUCCESS] Generation complete using ${
          data.modelUsed === "local-gpu" ? "Local GPU (TripoSR)" :
          data.modelUsed === "tripo-api" ? "Tripo AI API" :
          data.modelUsed === "trellis" ? "Microsoft TRELLIS" :
          data.modelUsed === "stable-fast-3d" ? "Stable Fast 3D" : 
          "TripoSR"
        }.`);
      }
      addLog(`[SYSTEM] 3D model saved → ${data.modelPath}`);
      toast("3D GLB model generated successfully!", "success", "Generation Complete");
    },
    onError: (err: any) => {
      addLog(`[CRITICAL ERROR] ${err.message}`);
      toast(err.message, "error", "Generation Failed");
    }
  });

  const handleFileUpload = (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast("Invalid file type. Please upload a JPG, PNG, or WEBP image.", "error", "Invalid Format");
      return;
    }
    uploadMutation.mutate(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDownload = () => {
    if (!modelPath) return;
    const link = document.createElement("a");
    link.href = modelPath;
    link.download = "model.glb";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast("Downloading model.glb...", "info", "Downloading Model");
  };

  const sourceBadge = SOURCE_BADGES[analysisSource] || SOURCE_BADGES["local"];
  const isWorking = uploadMutation.isPending || analyzeMutation.isPending || generateMutation.isPending;

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#000000", overflow: "hidden" }}>
      {/* Top Navbar */}
      <header className="border-b border-gray-900 bg-black/70 backdrop-blur-md z-40 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link 
            href="/" 
            className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              Toms 3D
            </span>
            <span className="text-xs bg-gray-900 border border-gray-800 px-2 py-0.5 rounded text-cyan-400 font-mono">
              WORKSTATION
            </span>
            <span className="text-[9px] font-bold bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded text-amber-400 font-mono">
              BETA
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pipeline steps indicator */}
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono">
            <span className={`px-2 py-1 rounded border ${imagePath ? "text-emerald-400 bg-emerald-950/30 border-emerald-800/40" : "text-gray-600 border-gray-800"}`}>
              1 Upload
            </span>
            <span className="text-gray-700">›</span>
            <span className={`px-2 py-1 rounded border ${analysis ? "text-indigo-400 bg-indigo-950/30 border-indigo-800/40" : "text-gray-600 border-gray-800"}`}>
              2 Analyze
            </span>
            <span className="text-gray-700">›</span>
            <span className={`px-2 py-1 rounded border ${modelPath ? "text-violet-400 bg-violet-950/30 border-violet-800/40" : "text-gray-600 border-gray-800"}`}>
              3 Generate
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 bg-gray-900/50 border border-gray-900 px-3 py-1 rounded-md">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>GPU-Priority</span>
          </div>
        </div>
      </header>

      {/* Main Grid Workspace — fixed height, no scroll */}
      <main style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "1rem", padding: "1rem", overflow: "hidden" }}>
        
        {/* Left Panel: Controls */}
        <section style={{ minHeight: 0, minWidth: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem" }} className="custom-scrollbar pr-1">
          
          {/* Card 1: Upload & Preview */}
          <div className="p-3.5 rounded-xl bg-gray-900/40 border border-gray-800/80 backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                1. Upload Source Image
              </h2>
              {imagePath && (
                <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Loaded
                </span>
              )}
            </div>

            {/* Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[95px] ${
                dragActive 
                  ? "border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-500/5" 
                  : "border-gray-800 hover:border-gray-700 bg-gray-950/40 hover:bg-gray-950/60"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={onFileChange}
              />
              
              {uploadMutation.isPending ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                  <p className="text-xs text-gray-400">Uploading...</p>
                </div>
              ) : imagePath ? (
                <div className="relative w-full max-h-[85px] flex items-center justify-center overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePath}
                    alt="Preview"
                    className="max-h-[75px] max-w-full object-contain rounded-lg shadow-md border border-gray-800"
                  />
                  <div className="absolute inset-0 bg-gray-950/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <span className="text-[10px] bg-gray-900 border border-gray-800 px-3 py-1 rounded-lg text-gray-300 font-semibold">
                      Change Image
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-400">
                    <Upload className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs text-gray-300 font-medium">
                    Drop image here or <span className="text-cyan-400">browse</span>
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono">PNG, JPG, WEBP • Max 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: AI Image Analysis */}
          <div className="p-3.5 rounded-xl bg-gray-900/40 border border-gray-800/80 backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                2. AI Vision Analysis
              </h2>
              {analysis && (
                <span className={`text-[10px] border px-2 py-0.5 rounded-full flex items-center gap-1 ${sourceBadge.color}`}>
                  <Eye className="w-2.5 h-2.5" /> {sourceBadge.label}
                </span>
              )}
            </div>

            {!imagePath ? (
              <div className="p-3 rounded-xl border border-gray-900 bg-gray-950/40 text-center py-4 text-xs text-gray-500 flex items-center justify-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Upload an image to begin analysis
              </div>
            ) : analyzeMutation.isPending ? (
              <div className="p-3 rounded-xl border border-indigo-900/30 bg-indigo-950/10 text-center py-4 text-xs text-indigo-400 flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>AI Vision analyzing your image...</span>
                <span className="text-[10px] text-gray-500">Reading shape, materials & geometry...</span>
              </div>
            ) : !analysis ? (
              <button
                onClick={() => analyzeMutation.mutate(imagePath)}
                className="w-full py-2 px-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Analyze Image with AI Vision
              </button>
            ) : (
              <div className="flex flex-col gap-1.5">
                <div className="bg-gray-950/80 border border-gray-800/50 p-2.5 rounded-xl max-h-[75px] overflow-y-auto font-mono text-[10px] leading-relaxed text-gray-300 custom-scrollbar select-text whitespace-pre-wrap">
                  {analysis}
                </div>
                <button
                  onClick={() => analyzeMutation.mutate(imagePath)}
                  disabled={analyzeMutation.isPending}
                  className="text-right text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold self-end flex items-center gap-1"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> Re-analyze
                </button>
              </div>
            )}
          </div>

          {/* Card 3: 3D Generation */}
          <div className="p-3.5 rounded-xl bg-gray-900/40 border border-gray-800/80 backdrop-blur-sm flex-shrink-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2 mb-2">
              <Box className="w-3.5 h-3.5 text-violet-400" />
              3. Generate 3D Model
            </h2>

            {!imagePath ? (
              <div className="p-3 rounded-xl border border-gray-900 bg-gray-950/40 text-center py-4 text-xs text-gray-500 flex items-center justify-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Upload an image to enable generation
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {/* Analysis connected indicator */}
                {analysis && (
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-950/20 border border-emerald-800/30">
                    <Zap className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <span className="text-[10px] text-emerald-300 leading-tight">
                      AI analysis connected — reconstruction guided by image content
                    </span>
                  </div>
                )}

                {/* Model Selector */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-500 font-mono">Reconstruction Model:</span>
                  <select
                    value={modelType}
                    onChange={(e) => setModelType(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    <option value="local-gpu">💻 Local GPU — TripoSR (NVIDIA CUDA)</option>
                    <option value="tripo-api">🔥 SOTA Commercial — Tripo AI API</option>
                    <option value="trellis">✨ High-Quality — Microsoft TRELLIS</option>
                    <option value="stable-fast-3d">⚡ Fast — Stable Fast 3D</option>
                    <option value="triposr">🔷 Standard — TripoSR</option>
                  </select>

                  {modelType === "local-gpu" && (
                    <div className="mt-2 p-2 rounded-lg bg-cyan-950/20 border border-cyan-800/30 flex flex-col gap-1.5">
                      <span className="text-[9px] text-cyan-400/80 font-mono leading-relaxed">
                        Pertama kali menggunakan Local GPU? Unduh installer ini untuk mengaktifkan dukungan CUDA di PC Anda secara otomatis.
                      </span>
                      <a
                        href="/install_cuda_deps.bat"
                        download="install_cuda_deps.bat"
                        className="px-2.5 py-1 text-center rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-[10px] text-cyan-400 font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/30"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Unduh Script Setup GPU (.bat)
                      </a>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => generateMutation.mutate(imagePath)}
                  disabled={generateMutation.isPending || !imagePath}
                  className="w-full py-2.5 px-4 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-indigo-500 text-white hover:from-cyan-400 hover:to-indigo-400 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 transition-all text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating 3D...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      Generate 3D Model
                    </>
                  )}
                </button>

                {/* Console Logs */}
                {consoleLogs.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5">
                      <Terminal className="w-3 h-3 text-cyan-500" />
                      Pipeline Logs:
                    </span>
                    <div className="bg-gray-950 border border-gray-900 p-2.5 rounded-lg font-mono text-[10px] text-cyan-500/90 max-h-[70px] overflow-y-auto flex flex-col gap-0.5 custom-scrollbar">
                      {consoleLogs.map((log, index) => (
                        <div key={index} className="leading-normal break-all">{log}</div>
                      ))}
                      {generateMutation.isPending && (
                        <div className="text-gray-500 animate-pulse flex items-center gap-1">
                          <span>█</span><span>Reconstructing...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: 3D Viewer */}
        <section style={{ minHeight: 0, minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-gray-200">3D Workspace Viewport</h2>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={glbInputRef}
                type="file"
                className="hidden"
                accept=".glb"
                onChange={handleGlbImport}
              />
              <button
                onClick={() => glbInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white transition-all flex items-center gap-1.5"
                title="Import local GLB file for visual inspection"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                Import GLB
              </button>
              {modelPath && (
                <>
                  <button
                    onClick={handleDownload}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition-all flex items-center gap-1.5 border border-emerald-500/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download GLB
                  </button>
                  <button
                    onClick={handleClearModel}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-red-950/40 border border-red-500/20 text-red-400 hover:bg-red-900/40 transition-all"
                    title="Clear model viewer"
                  >
                    Reset
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Viewport container — fills remaining height */}
          <div style={{ flex: 1, minHeight: 0 }} className="bg-gray-900/20 rounded-2xl border border-gray-800/80 backdrop-blur-sm relative overflow-hidden">
            {modelPath ? (
              <ModelViewer modelPath={modelPath} />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center select-none pointer-events-none">
                <div className="relative w-20 h-20 mb-5 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-2xl border border-gray-800 bg-gray-950/50 shadow-inner" />
                  <div className="absolute inset-4 rounded-xl border border-dashed border-gray-700/50 animate-spin [animation-duration:15s]" />
                  <Box className="w-7 h-7 text-gray-600 z-10" />
                </div>
                <h3 className="text-sm font-bold text-gray-300 mb-2">Awaiting 3D Generation</h3>
                <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
                  {!imagePath 
                    ? "Upload a source image to get started. AI Vision will analyze it automatically."
                    : !analysis 
                    ? "AI is analyzing your image... Generation will be available shortly."
                    : "Image analyzed ✓ — Click \"Generate 3D Model\" to reconstruct in 3D."
                  }
                </p>

                {/* Pipeline progress visual */}
                <div className="mt-6 flex items-center gap-2 text-[10px] font-mono">
                  <span className={`px-2.5 py-1 rounded-full border ${imagePath ? "text-emerald-400 bg-emerald-950/30 border-emerald-800/40" : "text-gray-600 border-gray-800"}`}>
                    {imagePath ? "✓ Uploaded" : "① Upload"}
                  </span>
                  <span className="text-gray-700">→</span>
                  <span className={`px-2.5 py-1 rounded-full border ${
                    analyzeMutation.isPending ? "text-indigo-300 bg-indigo-950/30 border-indigo-700/40 animate-pulse" : 
                    analysis ? "text-indigo-400 bg-indigo-950/30 border-indigo-800/40" : "text-gray-600 border-gray-800"
                  }`}>
                    {analyzeMutation.isPending ? "⟳ Analyzing..." : analysis ? "✓ Analyzed" : "② Analyze"}
                  </span>
                  <span className="text-gray-700">→</span>
                  <span className={`px-2.5 py-1 rounded-full border ${modelPath ? "text-violet-400 bg-violet-950/30 border-violet-800/40" : "text-gray-600 border-gray-800"}`}>
                    {modelPath ? "✓ Generated" : "③ Generate"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
