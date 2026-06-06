"use client";

import React, { useState } from "react";
import {
  X, Download, Package, Gamepad2, Image as ImageIcon,
  Film, Loader2, CheckCircle, ChevronRight, Box, Layers,
  Triangle, Grid3X3, Scan, Monitor, Smartphone, Aperture
} from "lucide-react";

export interface ExportHandlers {
  exportGLB: () => Promise<void>;
  exportGLTF: () => Promise<void>;
  exportOBJ: () => Promise<void>;
  exportSTL: () => Promise<void>;
  exportPLY: () => Promise<void>;
  exportUSDZ: () => Promise<void>;
  exportPNG: () => void;
  exportJPEG: () => void;
  exportPNG4K: () => Promise<void>;
  exportWebM: () => Promise<void>;
  exportGIF: () => Promise<void>;
}

interface FormatItem {
  id: keyof ExportHandlers;
  label: string;
  ext: string;
  icon: React.ReactNode;
  desc: string;
  badge?: string;
  badgeColor?: string;
}

interface FormatCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  formats: FormatItem[];
}

const CATEGORIES: FormatCategory[] = [
  {
    id: "3d",
    label: "3D Mesh",
    icon: <Box className="w-4 h-4" />,
    color: "text-cyan-400",
    bg: "bg-cyan-950/30",
    border: "border-cyan-800/40",
    formats: [
      {
        id: "exportGLB",
        label: "GLB",
        ext: ".glb",
        icon: <Package className="w-3.5 h-3.5" />,
        desc: "Binary GLTF — Universal, compact. Best for Sketchfab, web, game engines.",
        badge: "Universal",
        badgeColor: "text-cyan-400 bg-cyan-950/60 border-cyan-800/40",
      },
      {
        id: "exportGLTF",
        label: "GLTF",
        ext: ".gltf",
        icon: <Layers className="w-3.5 h-3.5" />,
        desc: "JSON GLTF — Editable, human-readable, web-native format.",
        badge: "Web",
        badgeColor: "text-sky-400 bg-sky-950/60 border-sky-800/40",
      },
      {
        id: "exportOBJ",
        label: "OBJ",
        ext: ".obj",
        icon: <Grid3X3 className="w-3.5 h-3.5" />,
        desc: "Wavefront OBJ — Blender, Maya, 3ds Max, Cinema 4D compatible.",
        badge: "Blender / Maya",
        badgeColor: "text-indigo-400 bg-indigo-950/60 border-indigo-800/40",
      },
      {
        id: "exportSTL",
        label: "STL",
        ext: ".stl",
        icon: <Triangle className="w-3.5 h-3.5" />,
        desc: "Stereolithography — For 3D printing, Fusion 360, SolidWorks.",
        badge: "3D Print",
        badgeColor: "text-violet-400 bg-violet-950/60 border-violet-800/40",
      },
      {
        id: "exportPLY",
        label: "PLY",
        ext: ".ply",
        icon: <Scan className="w-3.5 h-3.5" />,
        desc: "Stanford PLY — MeshLab, CloudCompare, point cloud pipelines.",
        badge: "Research",
        badgeColor: "text-gray-400 bg-gray-900/60 border-gray-700/40",
      },
    ],
  },
  {
    id: "game",
    label: "Game Engine",
    icon: <Gamepad2 className="w-4 h-4" />,
    color: "text-violet-400",
    bg: "bg-violet-950/30",
    border: "border-violet-800/40",
    formats: [
      {
        id: "exportGLB",
        label: "Unity GLB",
        ext: ".glb",
        icon: <Monitor className="w-3.5 h-3.5" />,
        desc: "GLB is natively imported by Unity 2019.3+. Just drag & drop into Assets.",
        badge: "Unity 3D",
        badgeColor: "text-emerald-400 bg-emerald-950/60 border-emerald-800/40",
      },
      {
        id: "exportGLB",
        label: "Unreal GLB",
        ext: ".glb",
        icon: <Monitor className="w-3.5 h-3.5" />,
        desc: "Import into Unreal Engine 5 via glTF Importer plugin (built-in).",
        badge: "Unreal 5",
        badgeColor: "text-orange-400 bg-orange-950/60 border-orange-800/40",
      },
      {
        id: "exportUSDZ",
        label: "USDZ",
        ext: ".usdz",
        icon: <Smartphone className="w-3.5 h-3.5" />,
        desc: "Apple AR format — opens directly in Reality Composer, QuickLook on iPhone/iPad.",
        badge: "Apple AR",
        badgeColor: "text-pink-400 bg-pink-950/60 border-pink-800/40",
      },
    ],
  },
  {
    id: "image",
    label: "Image Render",
    icon: <ImageIcon className="w-4 h-4" />,
    color: "text-emerald-400",
    bg: "bg-emerald-950/30",
    border: "border-emerald-800/40",
    formats: [
      {
        id: "exportPNG",
        label: "PNG Screenshot",
        ext: ".png",
        icon: <Aperture className="w-3.5 h-3.5" />,
        desc: "Current viewport capture, lossless PNG with transparency.",
        badge: "Lossless",
        badgeColor: "text-emerald-400 bg-emerald-950/60 border-emerald-800/40",
      },
      {
        id: "exportJPEG",
        label: "JPEG Screenshot",
        ext: ".jpg",
        icon: <Aperture className="w-3.5 h-3.5" />,
        desc: "Compressed JPEG — smaller file size for sharing.",
        badge: "Compressed",
        badgeColor: "text-yellow-400 bg-yellow-950/60 border-yellow-800/40",
      },
      {
        id: "exportPNG4K",
        label: "PNG 4K Render",
        ext: ".png",
        icon: <Monitor className="w-3.5 h-3.5" />,
        desc: "High-res offscreen render at 2048×2048 with enhanced lighting.",
        badge: "Hi-Res",
        badgeColor: "text-fuchsia-400 bg-fuchsia-950/60 border-fuchsia-800/40",
      },
    ],
  },
  {
    id: "anim",
    label: "Animation",
    icon: <Film className="w-4 h-4" />,
    color: "text-amber-400",
    bg: "bg-amber-950/30",
    border: "border-amber-800/40",
    formats: [
      {
        id: "exportWebM",
        label: "WebM Video",
        ext: ".webm",
        icon: <Film className="w-3.5 h-3.5" />,
        desc: "360° turntable video — 5 sec smooth loop. Works in browsers, Discord, Slack.",
        badge: "5s loop",
        badgeColor: "text-amber-400 bg-amber-950/60 border-amber-800/40",
      },
      {
        id: "exportGIF",
        label: "Animated GIF",
        ext: ".gif",
        icon: <Film className="w-3.5 h-3.5" />,
        desc: "Animated 360° turntable GIF — shareable anywhere. Takes ~10 seconds to encode.",
        badge: "Shareable",
        badgeColor: "text-pink-400 bg-pink-950/60 border-pink-800/40",
      },
    ],
  },
];

interface ExportPanelProps {
  onClose: () => void;
  handlers: ExportHandlers;
}

type ExportStatus = "idle" | "loading" | "done" | "error";

export default function ExportPanel({ onClose, handlers }: ExportPanelProps) {
  const [activeCategory, setActiveCategory] = useState("3d");
  const [status, setStatus] = useState<Record<string, ExportStatus>>({});
  const [progress, setProgress] = useState<string>("");

  const handleExport = async (formatId: keyof ExportHandlers, label: string) => {
    const key = `${formatId}-${label}`;
    setStatus((s) => ({ ...s, [key]: "loading" }));
    setProgress(`Exporting ${label}...`);
    try {
      const fn = handlers[formatId];
      if (typeof fn === "function") {
        await (fn as () => Promise<void>)();
      }
      setStatus((s) => ({ ...s, [key]: "done" }));
      setProgress(`✓ ${label} exported successfully`);
      setTimeout(() => {
        setStatus((s) => ({ ...s, [key]: "idle" }));
        setProgress("");
      }, 3000);
    } catch (err: any) {
      setStatus((s) => ({ ...s, [key]: "error" }));
      setProgress(`✗ ${err.message || "Export failed"}`);
      setTimeout(() => {
        setStatus((s) => ({ ...s, [key]: "idle" }));
        setProgress("");
      }, 4000);
    }
  };

  const currentCat = CATEGORIES.find((c) => c.id === activeCategory)!;

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-gray-800/80 bg-gray-950/95 backdrop-blur-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fadeInUp 0.3s cubic-bezier(0.22,1,0.36,1) both" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center">
              <Download className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Export Model</p>
              <p className="text-[10px] text-gray-500 font-mono">model.glb</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1 px-4 pt-3 pb-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeCategory === cat.id
                  ? `${cat.color} ${cat.bg} border ${cat.border}`
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-900/50"
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Format list */}
        <div className="px-4 py-3 flex flex-col gap-2 max-h-[320px] overflow-y-auto custom-scrollbar">
          {currentCat.formats.map((fmt, i) => {
            const key = `${fmt.id}-${fmt.label}`;
            const st = status[key] || "idle";
            return (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-800/60 bg-gray-900/30 hover:bg-gray-900/60 hover:border-gray-700/60 transition-all group"
              >
                {/* Format icon */}
                <div className={`w-9 h-9 rounded-xl ${currentCat.bg} border ${currentCat.border} flex items-center justify-center flex-shrink-0 ${currentCat.color}`}>
                  {fmt.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-white font-mono">{fmt.label}</span>
                    <span className="text-[9px] text-gray-600 font-mono">{fmt.ext}</span>
                    {fmt.badge && (
                      <span className={`text-[9px] font-semibold border px-1.5 py-0.5 rounded-full ${fmt.badgeColor}`}>
                        {fmt.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">{fmt.desc}</p>
                </div>

                {/* Export button */}
                <button
                  onClick={() => handleExport(fmt.id, fmt.label)}
                  disabled={st === "loading"}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    st === "done"
                      ? "bg-emerald-950/60 border border-emerald-800/40 text-emerald-400"
                      : st === "error"
                      ? "bg-red-950/60 border border-red-800/40 text-red-400"
                      : st === "loading"
                      ? "bg-gray-900 border border-gray-800 text-gray-500"
                      : "bg-gray-900 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 hover:bg-gray-800 group-hover:border-gray-600"
                  }`}
                >
                  {st === "loading" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : st === "done" ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  {st === "loading" ? "Exporting" : st === "done" ? "Done" : "Export"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Status bar */}
        <div className="px-5 py-3 border-t border-gray-800/60 flex items-center gap-2 min-h-[44px]">
          {progress ? (
            <p className="text-[11px] font-mono text-gray-400 animate-fade-in">{progress}</p>
          ) : (
            <p className="text-[11px] text-gray-600 font-mono">
              Select a format above to download
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
