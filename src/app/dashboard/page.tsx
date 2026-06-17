"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
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
    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950/30 border border-white/[0.08] rounded-2xl backdrop-blur-xl">
      <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
      <p className="mt-3 text-[10px] text-neutral-400 font-mono tracking-wider">INITIALIZING 3D ENGINE...</p>
    </div>
  ),
});

const SOURCE_BADGES: Record<string, { label: string; color: string }> = {
  openai: { label: "OpenAI GPT-4o Vision", color: "text-emerald-400 bg-emerald-950/40 border-emerald-500/20" },
  llava: { label: "LLaVA-1.5 Vision", color: "text-indigo-400 bg-indigo-950/40 border-indigo-500/20" },
  blip2: { label: "BLIP-2 Vision", color: "text-violet-400 bg-violet-950/40 border-violet-500/20" },
  local: { label: "Local Image Inspector", color: "text-amber-400 bg-amber-950/40 border-amber-500/20" },
};

export default function Dashboard() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const glbInputRef = useRef<HTMLInputElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // App States
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisSource, setAnalysisSource] = useState<string>("local");
  const [modelPath, setModelPath] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [modelType, setModelType] = useState<string>("local-gpu");

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [consoleLogs]);

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
        "[INFO] Initiating server-side generation stream...",
      ]);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePath: path,
          modelType,
          analysisPrompt: analysis || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to start generation stream");
      }

      if (!res.body) {
        throw new Error("Response body is not readable");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      let localModelPath = "";
      let modelUsed = "local-gpu";
      let fallbackTriggered = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data:")) {
            const rawData = line.substring(5).trim();
            if (!rawData) continue;
            
            try {
              const event = JSON.parse(rawData);
              if (event.status === "progress") {
                addLog(event.message);
              } else if (event.status === "success") {
                // Convert base64 GLB to Blob URL
                const base64Data = event.result;
                const binaryString = window.atob(base64Data);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: "model/gltf-binary" });
                localModelPath = URL.createObjectURL(blob);
                modelUsed = event.modelUsed;
                fallbackTriggered = event.fallbackTriggered;
              } else if (event.status === "error") {
                throw new Error(event.message || "Generation failed");
              }
            } catch (err: any) {
              if (err.message) throw err;
            }
          }
        }
      }

      if (!localModelPath) {
        throw new Error("Server closed the connection before generating the model");
      }

      return { 
        success: true, 
        modelPath: localModelPath, 
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
  return (
    <div className="relative w-full h-screen h-[100dvh] overflow-hidden bg-gradient-to-tr from-[#94a3b8] via-[#cbd5e1] to-[#94a3b8] select-none text-slate-800 flex flex-col font-inter">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-300/15 blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-sky-300/25 blur-[130px] pointer-events-none z-0" />
      <div className="absolute top-[30%] right-[20%] w-[45%] h-[45%] rounded-full bg-white/20 blur-[120px] pointer-events-none z-0" />

      {/* Professional 3D workbench grid background overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.15] z-0">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px)",
            backgroundSize: "24px 24px"
          }} 
        />
      </div>

      {/* Top Navbar */}
      <header className="relative z-40 border-b border-white/40 bg-white/20 backdrop-blur-md px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link 
            href="/" 
            className="p-2 rounded-xl bg-white/40 hover:bg-white/60 border border-white/50 text-slate-800 hover:text-slate-950 transition-all duration-300 backdrop-blur-sm shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-podium font-bold uppercase text-lg tracking-wider text-slate-900">
              Toms 3D
            </span>
            <span className="text-[10px] font-bold bg-slate-900/5 border border-slate-900/10 px-2 py-0.5 rounded text-slate-800 tracking-widest uppercase font-mono">
              WORKSTATION
            </span>
            <span className="text-[9px] font-bold bg-slate-900/10 border border-slate-900/15 px-1.5 py-0.5 rounded text-slate-800 font-mono tracking-widest uppercase animate-pulse">
              BETA
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Pipeline steps indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono tracking-wider">
            <span className={`px-2.5 py-1 rounded-lg border ${imagePath ? "text-slate-850 bg-white/60 border-white/80 font-bold shadow-sm" : "text-slate-500/40 border-slate-500/10"}`}>
              1 UPLOAD
            </span>
            <span className="text-slate-400">›</span>
            <span className={`px-2.5 py-1 rounded-lg border ${analysis ? "text-slate-850 bg-white/60 border-white/80 font-bold shadow-sm" : "text-slate-500/40 border-slate-500/10"}`}>
              2 ANALYZE
            </span>
            <span className="text-slate-400">›</span>
            <span className={`px-2.5 py-1 rounded-lg border ${modelPath ? "text-slate-850 bg-white/60 border-white/80 font-bold shadow-sm" : "text-slate-500/40 border-slate-500/10"}`}>
              3 GENERATE
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-700 bg-white/45 border border-white/50 px-3 py-1.5 rounded-xl backdrop-blur-sm shadow-sm">
            <Cpu className="w-3.5 h-3.5 text-slate-500 animate-pulse" />
            <span className="font-medium tracking-wide">GPU-Priority</span>
          </div>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="relative z-10 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden">
        
        {/* Left Panel: Controls */}
        <section className="lg:col-span-5 min-h-0 min-w-0 overflow-y-auto flex flex-col gap-4 custom-scrollbar pr-1">
          
          {/* Card 1: Upload & Preview */}
          <div className="p-5 rounded-2xl bg-white/40 border border-white/50 backdrop-blur-xl shadow-lg shadow-slate-200/50 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-podium font-bold uppercase tracking-wider text-xs text-slate-850 flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-slate-500/60" />
                1. Upload Source Image
              </h2>
              {imagePath && (
                <span className="text-[9px] text-emerald-700 bg-emerald-100/60 border border-emerald-300/60 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-bold font-mono">
                  <CheckCircle className="w-3 h-3" /> LOADED
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
              className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[110px] ${
                dragActive 
                  ? "border-slate-500 bg-white/60" 
                  : "border-slate-300 hover:border-slate-400 bg-white/20 hover:bg-white/35"
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
                  <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                  <p className="text-[10px] text-slate-650 font-semibold font-mono">Uploading...</p>
                </div>
              ) : imagePath ? (
                <div className="relative w-full max-h-[100px] flex items-center justify-center overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePath}
                    alt="Preview"
                    className="max-h-[90px] max-w-full object-contain rounded-md shadow-md border border-white/5"
                  />
                  <div className="absolute inset-0 bg-black/70 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                    <span className="text-[10px] bg-slate-900 border border-white/10 px-3 py-1.5 rounded-lg text-white font-semibold">
                      Change Image
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="p-2.5 rounded-lg bg-white/40 border border-white/60 text-slate-650 shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs text-slate-800 font-medium">
                    Drop image here or <span className="text-slate-950 font-bold hover:underline">browse</span>
                  </p>
                  <p className="text-[9px] text-slate-500/80 font-mono">PNG, JPG, WEBP • Max 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: AI Image Analysis */}
          <div className="p-5 rounded-2xl bg-white/40 border border-white/50 backdrop-blur-xl shadow-lg shadow-slate-200/50 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-podium font-bold uppercase tracking-wider text-xs text-slate-850 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-slate-500/60" />
                2. AI Vision Analysis
              </h2>
              {analysis && (
                <span className={`text-[10px] border px-2 py-0.5 rounded font-bold font-mono ${sourceBadge.color}`}>
                  <Eye className="w-3 h-3" /> {sourceBadge.label.toUpperCase()}
                </span>
              )}
            </div>

            {!imagePath ? (
              <div className="p-4 rounded-xl border border-white/40 bg-white/20 text-center py-6 text-xs text-slate-500 flex items-center justify-center gap-2 font-medium shadow-inner">
                <Clock className="w-3.5 h-3.5" />
                Upload an image to begin analysis
              </div>
            ) : analyzeMutation.isPending ? (
              <div className="p-4 rounded-xl border border-white/40 bg-white/20 text-center py-6 text-xs text-slate-700 flex flex-col items-center gap-3 shadow-inner">
                <Loader2 className="w-4 h-4 animate-spin text-slate-650" />
                <span className="font-semibold text-xs">AI Vision analyzing your image...</span>
                <span className="text-[10px] text-slate-500 font-mono">Reading shape, materials & geometry...</span>
              </div>
            ) : !analysis ? (
              <button
                onClick={() => analyzeMutation.mutate(imagePath)}
                className="w-full py-2.5 px-4 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 hover:scale-[1.01] text-xs flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Analyze Image with AI Vision
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="bg-white/35 border border-white/55 p-3.5 rounded-xl max-h-[95px] overflow-y-auto font-mono text-[10px] leading-relaxed text-slate-755 custom-scrollbar select-text whitespace-pre-wrap shadow-inner">
                  {analysis}
                </div>
                <button
                  onClick={() => analyzeMutation.mutate(imagePath)}
                  disabled={analyzeMutation.isPending}
                  className="text-right text-[10px] text-slate-500 hover:text-slate-800 font-semibold self-end flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> Re-analyze
                </button>
              </div>
            )}
          </div>

          {/* Card 3: 3D Generation */}
          <div className="p-5 rounded-2xl bg-white/40 border border-white/50 backdrop-blur-xl shadow-lg shadow-slate-200/50 flex-shrink-0">
            <h2 className="font-podium font-bold uppercase tracking-wider text-xs text-slate-850 flex items-center gap-2 mb-3">
              <Box className="w-3.5 h-3.5 text-slate-500/60" />
              3. Generate 3D Model
            </h2>

            {!imagePath ? (
              <div className="p-4 rounded-xl border border-white/40 bg-white/20 text-center py-6 text-xs text-slate-500 flex items-center justify-center gap-2 font-medium shadow-inner">
                <Clock className="w-3.5 h-3.5" />
                Upload an image to enable generation
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Analysis connected indicator */}
                {analysis && (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/50 border border-white/70 backdrop-blur-sm shadow-sm">
                    <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 animate-pulse" />
                    <span className="text-[10px] text-slate-700 leading-normal font-medium">
                      AI analysis connected — reconstruction guided by image content
                    </span>
                  </div>
                )}

                {/* Model Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-500 font-mono">Reconstruction Model:</span>
                  <select
                    value={modelType}
                    onChange={(e) => setModelType(e.target.value)}
                    className="w-full bg-white/60 border border-white/70 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-slate-400 transition-colors cursor-pointer shadow-sm"
                  >
                    <option value="local-gpu">💻 Local GPU — TripoSR (NVIDIA CUDA)</option>
                    <option value="tripo-api">🔥 SOTA Commercial — Tripo AI API</option>
                    <option value="trellis">✨ High-Quality — Microsoft TRELLIS</option>
                    <option value="stable-fast-3d">⚡ Fast — Stable Fast 3D</option>
                    <option value="triposr">🔷 Standard — TripoSR</option>
                  </select>

                  {modelType === "local-gpu" && (
                    <div className="mt-2.5 p-3.5 rounded-xl bg-white/20 border border-white/40 backdrop-blur-sm flex flex-col gap-2.5 shadow-inner">
                      <span className="text-[9.5px] text-slate-600 font-mono leading-relaxed">
                        Pertama kali menggunakan Local GPU? Unduh installer ini untuk mengaktifkan dukungan CUDA di PC Anda secara otomatis.
                      </span>
                      <a
                        href="/install_cuda_deps.bat"
                        download="install_cuda_deps.bat"
                        className="px-3 py-2 text-center rounded-xl bg-white/60 border border-white/75 hover:bg-white/85 text-slate-800 hover:text-slate-950 text-[10px] font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 shadow-sm backdrop-blur-sm"
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
                  className="w-full py-2.5 px-4 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 transition-all duration-300 text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      Generating 3D...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Generate 3D Model
                    </>
                  )}
                </button>

                {/* Console Logs */}
                {consoleLogs.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-slate-500/70" />
                      Pipeline Logs:
                    </span>
                    <div 
                      ref={logContainerRef}
                      className="bg-white/30 border border-white/55 p-3.5 rounded-xl font-mono text-[10px] text-slate-700 h-[120px] overflow-y-auto flex flex-col gap-1 custom-scrollbar scroll-smooth shadow-inner"
                    >
                      {consoleLogs.map((log, index) => {
                        const isSystem = log.startsWith("[SYSTEM]");
                        const isError = log.startsWith("[CRITICAL ERROR]");
                        const isSuccess = log.startsWith("[SUCCESS]");
                        const isWarning = log.startsWith("[WARNING]");
                        return (
                          <div 
                            key={index} 
                            className={`leading-normal break-all ${
                              isSystem ? "text-slate-900 font-semibold" :
                              isError ? "text-rose-600 font-bold" :
                              isSuccess ? "text-emerald-600 font-semibold" :
                              isWarning ? "text-amber-600 font-semibold" : ""
                            }`}
                          >
                            {log}
                          </div>
                        );
                      })}
                      {generateMutation.isPending && (
                        <div className="text-slate-550/65 animate-pulse flex items-center gap-1">
                          <span>█</span><span>Processing pipeline...</span>
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
        <section className="lg:col-span-7 min-h-0 min-w-0 flex flex-col h-full">
          {/* Viewport container */}
          <div className="flex-1 min-h-0 bg-white/30 border border-white/50 rounded-3xl relative overflow-hidden backdrop-blur-xl shadow-lg shadow-slate-200/50">
            <input
              ref={glbInputRef}
              type="file"
              className="hidden"
              accept=".glb"
              onChange={handleGlbImport}
            />

            {/* Floating Viewport Controls */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 select-none">
              <button
                onClick={() => glbInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/65 border border-white/85 hover:bg-white/85 text-slate-700 hover:text-slate-955 transition-all duration-300 flex items-center gap-1.5 cursor-pointer backdrop-blur-md shadow-sm"
                title="Import local GLB file for visual inspection"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                Import GLB
              </button>
              {modelPath && (
                <>
                  <button
                    onClick={handleDownload}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download GLB
                  </button>
                  <button
                    onClick={handleClearModel}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/65 border border-white/85 hover:bg-white/85 text-slate-655 hover:text-slate-955 transition-all duration-300 cursor-pointer backdrop-blur-md shadow-sm"
                    title="Clear model viewer"
                  >
                    Reset
                  </button>
                </>
              )}
            </div>

            {modelPath ? (
              <ModelViewer modelPath={modelPath} />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center select-none pointer-events-none z-10">
                {/* Professional 3D Grid Floor */}
                <div 
                  className="absolute inset-0 perspective-grid-floor z-0" 
                  style={{
                    backgroundImage: "linear-gradient(rgba(15, 23, 42, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.08) 1px, transparent 1px)"
                  }}
                />

                {/* Holographic Volumetric Atmosphere Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.5)_0%,transparent_70%)] pointer-events-none z-0" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(255,255,255,0.6)_0%,transparent_80%)] pointer-events-none z-0" />

                {/* Volumetric Holographic Projection Cone */}
                <div 
                  className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-64 h-56 bg-gradient-to-t from-white/35 to-transparent pointer-events-none z-0" 
                  style={{ clipPath: "polygon(35% 0%, 65% 0%, 0% 100%, 100% 100%)" }}
                />

                {/* Scanner projection base ring on the floor */}
                <div 
                  className="absolute bottom-[18%] left-1/2 -translate-x-1/2 w-64 h-12 rounded-full border border-slate-350 bg-white/25 pointer-events-none z-0 animate-pulse" 
                  style={{ transform: "perspective(300px) rotateX(75deg)" }}
                />
                <div 
                  className="absolute bottom-[18%] left-1/2 -translate-x-1/2 w-44 h-8 rounded-full border border-slate-200 pointer-events-none z-0 animate-ping [animation-duration:4s]" 
                  style={{ transform: "perspective(300px) rotateX(75deg)" }}
                />

                {/* Holographic scanning particles rising from the base */}
                <div className="absolute bottom-[18%] left-1/2 -translate-x-1/2 w-64 h-48 overflow-hidden pointer-events-none z-0">
                  {[...Array(12)].map((_, i) => {
                    const size = (i % 3) + 1.2; // 1.2px to 3.2px
                    const left = 15 + (i * 6.5); // spread from 15% to 90%
                    const delay = (i * 0.45).toFixed(2);
                    const duration = (4.0 + (i % 4) * 0.9).toFixed(2);
                    return (
                      <div
                        key={i}
                        className="absolute bg-slate-400/35 rounded-full animate-particle-float"
                        style={{
                          width: `${size}px`,
                          height: `${size}px`,
                          left: `${left}%`,
                          bottom: "0px",
                          animationDelay: `${delay}s`,
                          animationDuration: `${duration}s`,
                        }}
                      />
                    );
                  })}
                </div>

                {/* Central Holographic Chamber Element (Rotating Wireframe) */}
                <div className="relative w-64 h-64 flex items-center justify-center z-10 animate-holo-rotate">
                  <svg width="220" height="220" viewBox="0 0 100 100" className="text-slate-800/20 select-none">
                    {/* Outer dashed radar ring */}
                    <ellipse cx="50" cy="50" rx="46" ry="14" fill="none" stroke="rgba(30, 41, 59, 0.12)" strokeWidth="0.6" strokeDasharray="4, 4" />
                    
                    {/* Inner solid and dotted orbit rings */}
                    <ellipse cx="50" cy="50" rx="38" ry="10" fill="none" stroke="rgba(30, 41, 59, 0.18)" strokeWidth="0.5" />
                    <ellipse cx="50" cy="50" rx="26" ry="7" fill="none" stroke="rgba(30, 41, 59, 0.12)" strokeWidth="0.5" strokeDasharray="1, 2" />
                    
                    {/* High-tech grid ticks / markings */}
                    <line x1="10" y1="50" x2="14" y2="50" stroke="rgba(30, 41, 59, 0.25)" strokeWidth="0.5" />
                    <line x1="86" y1="50" x2="90" y2="50" stroke="rgba(30, 41, 59, 0.25)" strokeWidth="0.5" />
                    
                    {/* Wireframe Polyhedron Structure */}
                    <polygon points="50,12 28,38 50,48" fill="rgba(30, 41, 59, 0.02)" stroke="rgba(30, 41, 59, 0.25)" strokeWidth="0.8" />
                    <polygon points="50,12 50,48 72,38" fill="none" stroke="rgba(30, 41, 59, 0.15)" strokeWidth="0.7" />
                    <polygon points="50,12 72,38 78,50" fill="rgba(30, 41, 59, 0.01)" stroke="rgba(30, 41, 59, 0.15)" strokeWidth="0.7" strokeDasharray="2, 1" />
                    <polygon points="50,12 28,38 22,50" fill="none" stroke="rgba(30, 41, 59, 0.12)" strokeWidth="0.7" />
                    
                    {/* Mid-body facets */}
                    <polygon points="28,38 50,48 50,56" fill="none" stroke="rgba(30, 41, 59, 0.12)" strokeWidth="0.7" />
                    <polygon points="50,48 72,38 78,50" fill="rgba(30, 41, 59, 0.02)" stroke="rgba(30, 41, 59, 0.2)" strokeWidth="0.8" />
                    <polygon points="72,38 50,48 50,56" fill="none" stroke="rgba(30, 41, 59, 0.12)" strokeWidth="0.7" />
                    <polygon points="28,38 50,48 22,50" fill="none" stroke="rgba(30, 41, 59, 0.12)" strokeWidth="0.7" strokeDasharray="2, 2" />
                    
                    {/* Lower cone facet paths */}
                    <polygon points="50,88 28,62 50,52" fill="none" stroke="rgba(30, 41, 59, 0.15)" strokeWidth="0.7" />
                    <polygon points="50,88 50,52 72,62" fill="rgba(30, 41, 59, 0.02)" stroke="rgba(30, 41, 59, 0.2)" strokeWidth="0.8" />
                    <polygon points="50,88 72,62 78,50" fill="none" stroke="rgba(30, 41, 59, 0.1)" strokeWidth="0.7" strokeDasharray="2, 1" />
                    <polygon points="50,88 28,62 22,50" fill="none" stroke="rgba(30, 41, 59, 0.12)" strokeWidth="0.7" />
                    
                    {/* Central core energy spheres */}
                    <circle cx="50" cy="50" r="2.0" fill="#475569" className="animate-pulse" />
                    <circle cx="50" cy="50" r="4" fill="none" stroke="rgba(71, 85, 105, 0.3)" strokeWidth="0.7" className="animate-ping [animation-duration:2s]" />
 
                    {/* Vertices & Nodes */}
                    <circle cx="50" cy="12" r="1.6" fill="#475569" />
                    <circle cx="50" cy="88" r="1.6" fill="#475569" style={{ opacity: 0.85 }} />
                    <circle cx="28" cy="38" r="1.4" fill="#475569" style={{ opacity: 0.85 }} />
                    <circle cx="72" cy="38" r="1.6" fill="#475569" />
                    <circle cx="28" cy="62" r="1.6" fill="#475569" />
                    <circle cx="72" cy="62" r="1.4" fill="#475569" style={{ opacity: 0.85 }} />
                    
                    {/* Technical text labels pointing to coordinates */}
                    <text x="53" y="16" fill="rgba(71, 85, 105, 0.4)" fontSize="3.5" fontFamily="monospace">[v_001]</text>
                    <text x="74" y="36" fill="rgba(71, 85, 105, 0.4)" fontSize="3.5" fontFamily="monospace">x_lock</text>
                    <text x="12" y="65" fill="rgba(71, 85, 105, 0.3)" fontSize="3.5" fontFamily="monospace">[rec_init]</text>
                    <line x1="24" y1="63" x2="28" y2="62" stroke="rgba(71, 85, 105, 0.3)" strokeWidth="0.6" />
                  </svg>
                </div>
                
                {/* XYZ 3D Axis helper widget */}
                <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-white/50 border border-white/75 px-3.5 py-2.5 rounded-2xl backdrop-blur-xl z-10 select-none shadow-md">
                  <svg width="30" height="30" viewBox="0 0 32 32" className="text-white/40">
                    <circle cx="16" cy="18" r="1.2" fill="#a1a1aa" />
                    
                    {/* Y-Axis: Up (Green) */}
                    <line x1="16" y1="18" x2="16" y2="4" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" />
                    <polygon points="15,5 16,2 17,5" fill="#10b981" />
                    <text x="19" y="7" fill="#10b981" fontSize="5" fontFamily="monospace" fontWeight="bold">Y</text>
                    
                    {/* X-Axis: Right-Forward (Red) */}
                    <line x1="16" y1="18" x2="28" y2="18" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round" />
                    <polygon points="27,17 30,18 27,19" fill="#ef4444" />
                    <text x="26" y="15" fill="#ef4444" fontSize="5" fontFamily="monospace" fontWeight="bold">X</text>
                    
                    {/* Z-Axis: Diagonal (Blue) */}
                    <line x1="16" y1="18" x2="8" y2="26" stroke="#3b82f6" strokeWidth="1.2" strokeLinecap="round" />
                    <polygon points="7.5,24 5.5,28.5 10,26.5" fill="#3b82f6" />
                    <text x="5" y="22" fill="#3b82f6" fontSize="5" fontFamily="monospace" fontWeight="bold">Z</text>
                  </svg>
                  <div className="font-mono text-[9px] text-slate-600 flex flex-col gap-0.5 border-l border-slate-350 pl-2.5 items-start">
                    <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> X: +0.000</div>
                    <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Y: +0.000</div>
                    <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Z: +0.000</div>
                  </div>
                </div>

                <h3 className="font-podium font-bold uppercase tracking-wider text-sm text-slate-900 mb-2 mt-4 z-10">Awaiting 3D Generation</h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xs font-normal z-10">
                  {!imagePath 
                    ? "Upload a source image to get started. AI Vision will analyze it automatically."
                    : !analysis 
                    ? "AI is analyzing your image... Generation will be available shortly."
                    : "Image analyzed ✓ — Click \"Generate 3D Model\" to reconstruct in 3D."
                  }
                </p>

                {/* Pipeline progress visual */}
                <div className="mt-6 flex items-center gap-2 text-[10px] font-mono tracking-wider font-bold z-10">
                  <span className={`px-2.5 py-1.5 rounded-lg border ${imagePath ? "text-slate-800 bg-white/60 border-white/70 shadow-sm" : "text-slate-450 border-slate-500/10"}`}>
                    {imagePath ? "✓ UPLOADED" : "① UPLOAD"}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className={`px-2.5 py-1.5 rounded-lg border ${
                    analyzeMutation.isPending ? "text-slate-800 bg-white/60 border-white/70 shadow-sm animate-pulse" : 
                    analysis ? "text-slate-800 bg-white/60 border-white/70 shadow-sm" : "text-slate-450 border-slate-500/10"
                  }`}>
                    {analyzeMutation.isPending ? "⟳ ANALYZING..." : analysis ? "✓ ANALYZED" : "② ANALYZE"}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className={`px-2.5 py-1.5 rounded-lg border ${modelPath ? "text-slate-800 bg-white/60 border-white/70 shadow-sm" : "text-slate-450 border-slate-500/10"}`}>
                    {modelPath ? "✓ GENERATED" : "③ GENERATE"}
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
