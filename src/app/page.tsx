"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, Box, Cpu, Sparkles, Orbit, Download,
  Upload, Scan, Layers, MousePointer, ChevronDown, Zap
} from "lucide-react";

/* ─────────────────────────────────────────────
   IntersectionObserver hook — animates section
   into view as user scrolls
   ───────────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ─────────────────────────────────────────────
   AnimatedStep — cycles through 3 demo steps
   like an Apple product page motion demo
   ───────────────────────────────────────────── */
function MotionDemo() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const STEP_DURATION = 3200; // ms per step

  useEffect(() => {
    let startTime: number;
    let raf: number;

    const tick = (now: number) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const pct = Math.min((elapsed / STEP_DURATION) * 100, 100);
      setProgress(pct);
      if (elapsed >= STEP_DURATION) {
        setActive((a) => (a + 1) % 3);
        startTime = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const steps = [
    {
      num: "01",
      label: "Upload Your Image",
      desc: "Drop any JPG, PNG or WEBP — a photo, sketch, product shot, anything",
      color: "from-cyan-500 to-sky-500",
      glow: "rgba(6,182,212,0.15)",
      icon: Upload,
      screen: <UploadScreen />,
    },
    {
      num: "02",
      label: "AI Analyzes It",
      desc: "Vision AI reads shape, materials, depth & geometry from your image",
      color: "from-indigo-500 to-violet-500",
      glow: "rgba(99,102,241,0.15)",
      icon: Scan,
      screen: <AnalyzeScreen />,
    },
    {
      num: "03",
      label: "Get Your 3D Model",
      desc: "Stable Fast 3D reconstructs a full GLB — ready to rotate, inspect & download",
      color: "from-violet-500 to-fuchsia-500",
      glow: "rgba(139,92,246,0.15)",
      icon: Layers,
      screen: <ModelScreen />,
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Demo screen */}
      <div className="demo-screen w-full relative" style={{ minHeight: 400 }}>
        {/* Top browser bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <div className="flex-1 mx-3 h-5.5 rounded bg-gray-800/80 flex items-center px-3">
            <span className="text-[9px] text-gray-500 font-mono">localhost:3000/dashboard</span>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            running
          </div>
        </div>

        {/* Step-specific content */}
        <div className="relative overflow-hidden" style={{ minHeight: 340 }}>
          {steps.map((s, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-all duration-700"
              style={{
                opacity: active === i ? 1 : 0,
                transform: active === i ? "translateY(0) scale(1)" : "translateY(12px) scale(0.99)",
                pointerEvents: active === i ? "auto" : "none",
              }}
            >
              {s.screen}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-950/80 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${steps[active].color} rounded-r-full transition-all duration-100 relative`}
            style={{ width: `${progress}%` }}
          >
            {/* Glowing tip */}
            {progress > 0 && progress < 100 && (
              <>
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/40 blur-xs animate-ping" />
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#fff]" />
              </>
            )}
          </div>
        </div>

        {/* Ambient glow behind screen */}
        <div
          className="absolute -inset-px rounded-2xl pointer-events-none transition-all duration-700"
          style={{ boxShadow: `0 0 60px 0 ${steps[active].glow}` }}
        />
      </div>

      {/* Step description */}
      <p className="text-center text-gray-400 text-sm mt-6 transition-all duration-500">
        {steps[active].desc}
      </p>
    </div>
  );
}

/* ── Demo screen contents ── */
function UploadScreen() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    let v = 0;
    const t = setInterval(() => {
      v = Math.min(v + 3, 100);
      setPct(v);
      if (v >= 100) clearInterval(t);
    }, 40);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-center justify-center p-6 h-full min-h-[340px]">
      <div className="w-full max-w-md flex flex-col gap-4">
        {/* Drop zone */}
        <div className="border border-dashed border-cyan-500/40 rounded-2xl p-5 flex flex-col items-center gap-2 bg-cyan-950/10 relative overflow-hidden transition-colors duration-500 hover:border-cyan-400">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
          <div className="w-11 h-11 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <Upload className="w-4.5 h-4.5 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-200 text-center">Drop your image here</p>
            <p className="text-[11px] text-gray-500 text-center mt-0.5 font-mono">PNG · JPG · WEBP</p>
          </div>
          {pct < 100 ? (
            <div className="w-full">
              <div className="flex justify-between text-[10px] text-gray-500 mb-1 font-mono">
                <span>Uploading photo_product.png</span>
                <span>{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-400 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold animate-fade-in">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <span>✓</span>
              </div>
              Upload complete
            </div>
          )}
        </div>
        {/* Mini preview */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-900/60 border border-gray-800/60 animate-float">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-900/60 to-sky-900/60 border border-cyan-800/30 flex items-center justify-center flex-shrink-0">
            <Box className="w-3.5 h-3.5 text-cyan-400 opacity-60" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-300 truncate">photo_product.png</p>
            <p className="text-[10px] text-gray-600 font-mono">1536 × 1024 px · 1.2 MB</p>
          </div>
          <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">Ready</span>
        </div>
      </div>
    </div>
  );
}

function AnalyzeScreen() {
  const [step, setStep] = useState(0);
  const lines = [
    "[AI] Reading image features and depth cues...",
    "[AI] Identified: rectangular consumer device",
    "[AI] Material: brushed aluminum + matte plastic",
    "[AI] Estimated depth: 8mm, Width: 280mm",
    "[AI] Geometry: hard-edge mesh, 6 primary faces",
    "[AI] Surface roughness: 0.2 · Metalness: 0.7",
    "[AI] Analysis complete → forwarding to 3D pipeline",
  ];
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i++;
      setStep(i);
      if (i >= lines.length) clearInterval(t);
    }, 380);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-center justify-center p-6 h-full min-h-[340px]">
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-xs font-semibold text-gray-300">AI Vision Analysis</span>
            <span className="ml-auto text-[10px] text-indigo-400 font-mono animate-pulse">● Analyzing</span>
          </div>
          <div className="rounded-xl bg-gray-950/80 border border-gray-800/60 p-4 font-mono text-[11px] leading-relaxed min-h-[200px]">
            {lines.slice(0, step).map((line, i) => (
              <div
                key={i}
                className="text-cyan-400/90 leading-6 animate-slide-left"
                style={{ animation: `slideInLeft 0.3s ease both` }}
              >
                {line}
              </div>
            ))}
            {step < lines.length && (
              <span className="text-gray-600 animate-blink-cursor">█</span>
            )}
            {step >= lines.length && (
              <div className="mt-3 flex items-center gap-2 text-emerald-400 text-[11px]">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[9px]">✓</span>
                Ready for 3D reconstruction
              </div>
            )}
          </div>
        </div>

        {/* Graphical Scanning Preview Visual */}
        <div className="hidden md:flex flex-col items-center justify-center p-4 rounded-xl border border-gray-800/60 bg-gray-950/40 relative overflow-hidden min-h-[240px]">
          {/* Grid backdrop */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          
          {/* 3D wireframe mesh SVG */}
          <svg width="110" height="110" viewBox="0 0 100 100" className="text-cyan-400/35 animate-pulse duration-1000">
            <polygon points="20,30 50,15 80,30 80,70 50,85 20,70" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <line x1="20" y1="30" x2="50" y2="50" stroke="currentColor" strokeWidth="0.8" />
            <line x1="80" y1="30" x2="50" y2="50" stroke="currentColor" strokeWidth="0.8" />
            <line x1="50" y1="85" x2="50" y2="50" stroke="currentColor" strokeWidth="0.8" />
            <line x1="20" y1="70" x2="50" y2="50" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2, 2" />
            <line x1="80" y1="70" x2="50" y2="50" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2, 2" />
            <line x1="50" y1="15" x2="50" y2="50" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2, 2" />
            
            {/* inner mesh points */}
            <circle cx="50" cy="50" r="1.5" fill="#22d3ee" />
            <circle cx="20" cy="30" r="1" fill="#22d3ee" />
            <circle cx="50" cy="15" r="1" fill="#22d3ee" />
            <circle cx="80" cy="30" r="1" fill="#22d3ee" />
            <circle cx="80" cy="70" r="1" fill="#22d3ee" />
            <circle cx="50" cy="85" r="1" fill="#22d3ee" />
            <circle cx="20" cy="70" r="1" fill="#22d3ee" />
          </svg>

          {/* Laser Scanning Line */}
          <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-scan-line" style={{ top: '15%' }} />
          <span className="mt-4 text-[9px] font-mono text-cyan-400 tracking-widest uppercase animate-pulse">Analyzing Volume</span>
        </div>
      </div>
    </div>
  );
}

function ModelScreen() {
  const [angle, setAngle] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setAngle(a => (a + 0.8) % 360), 16);
    return () => clearInterval(t);
  }, []);

  const rad = (angle * Math.PI) / 180;
  const w_geom = 110;
  // projection helpers
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const px = (x: number, z: number) => x * cos - z * sin;
  const pz = (x: number, z: number) => x * sin + z * cos;

  // 6 vertices of the crystal octahedron (top, bottom, and 4 middle ring points)
  const v = [
    [0, -100, 0],              // 0: Top Vertex
    [0, 100, 0],               // 1: Bottom Vertex
    [-w_geom/2, 0, -w_geom/2], // 2: Mid Front Left
    [w_geom/2, 0, -w_geom/2],  // 3: Mid Front Right
    [w_geom/2, 0, w_geom/2],   // 4: Mid Back Right
    [-w_geom/2, 0, w_geom/2],  // 5: Mid Back Left
  ].map(([x, y, z]) => {
    const rx = px(x, z!);
    const rz = pz(x, z!);
    return [rx * 0.8 + 240, y * 0.8 + rz * 0.35 + 160];
  });

  const faces = [
    { verts: [0, 2, 3], fill: "rgba(99, 102, 241, 0.25)", stroke: "rgba(99, 102, 241, 0.75)" },
    { verts: [0, 3, 4], fill: "rgba(139, 92, 246, 0.20)", stroke: "rgba(139, 92, 246, 0.65)" },
    { verts: [0, 4, 5], fill: "rgba(6, 182, 212, 0.22)", stroke: "rgba(6, 182, 212, 0.70)" },
    { verts: [0, 5, 2], fill: "rgba(168, 85, 247, 0.15)", stroke: "rgba(168, 85, 247, 0.60)" },
    { verts: [1, 3, 2], fill: "rgba(99, 102, 241, 0.18)", stroke: "rgba(99, 102, 241, 0.60)" },
    { verts: [1, 4, 3], fill: "rgba(139, 92, 246, 0.15)", stroke: "rgba(139, 92, 246, 0.50)" },
    { verts: [1, 5, 4], fill: "rgba(6, 182, 212, 0.20)", stroke: "rgba(6, 182, 212, 0.65)" },
    { verts: [1, 2, 5], fill: "rgba(168, 85, 247, 0.12)", stroke: "rgba(168, 85, 247, 0.55)" },
  ];

  const edges = [
    [0, 2], [0, 3], [0, 4], [0, 5],
    [1, 2], [1, 3], [1, 4], [1, 5],
    [2, 3], [3, 4], [4, 5], [5, 2]
  ];

  const pt = (i: number) => `${v[i][0]},${v[i][1]}`;

  return (
    <div className="flex items-center justify-center p-6 h-full min-h-[340px]">
      <div className="flex items-center gap-6 w-full max-w-lg">
        {/* 3D SVG preview */}
        <div className="flex-shrink-0 w-[180px] h-[180px] relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-violet-500/5 blur-2xl" />
          <svg width="180" height="180" viewBox="0 0 480 320" className="drop-shadow-2xl">
            {/* Grid lines */}
            {[...Array(7)].map((_, i) => (
              <line key={i} x1={i*80} y1="0" x2={i*80} y2="320" stroke="#1e293b" strokeWidth="0.8" opacity="0.6" />
            ))}
            {[...Array(5)].map((_, i) => (
              <line key={i} x1="0" y1={i*80} x2="480" y2={i*80} stroke="#1e293b" strokeWidth="0.8" opacity="0.6" />
            ))}

            {/* Orbiting rings */}
            <ellipse cx="240" cy="160" rx="140" ry="40" fill="none" stroke="rgba(6, 182, 212, 0.25)" strokeWidth="1" strokeDasharray="6, 6" />
            <ellipse cx="240" cy="160" rx="110" ry="25" fill="none" stroke="rgba(139, 92, 246, 0.15)" strokeWidth="0.8" />

            {/* Faces */}
            {faces.map((f, i) => (
              <polygon
                key={i}
                points={f.verts.map(pt).join(" ")}
                fill={f.fill}
                stroke={f.stroke}
                strokeWidth="1.2"
              />
            ))}

            {/* Edges */}
            {edges.map(([a,b], i) => (
              <line key={i} x1={v[a][0]} y1={v[a][1]} x2={v[b][0]} y2={v[b][1]}
                stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
            ))}
          </svg>
        </div>

        {/* Info panel */}
        <div className="flex-1 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">model.glb</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">Generated</span>
          </div>
          {[
            { label: "Vertices", val: "42,816", color: "#67e8f9" },
            { label: "Polygons", val: "85,604", color: "#a78bfa" },
            { label: "Texture",  val: "1024 × 1024", color: "#f0abfc" },
            { label: "Format",   val: "GLB (Binary GLTF)", color: "#86efac" },
          ].map((item, i) => (
            <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-800/45 last:border-0">
              <span className="text-[10px] text-gray-500 font-mono">{item.label}</span>
              <span className="text-[10px] font-semibold font-mono" style={{ color: item.color }}>{item.val}</span>
            </div>
          ))}
          <button className="mt-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all">
            <Download className="w-3.5 h-3.5" />
            Download GLB
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Feature cards data
   ───────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Zap,
    color: "from-cyan-500 to-sky-500",
    bg: "bg-cyan-950/40",
    border: "hover:border-cyan-500/30",
    title: "Stable Fast 3D Engine",
    body: "Powered by StabilityAI's Stable Fast 3D — the fastest open-source image-to-3D model, running on Hugging Face ZeroGPU.",
  },
  {
    icon: Sparkles,
    color: "from-indigo-500 to-violet-500",
    bg: "bg-indigo-950/40",
    border: "hover:border-indigo-500/30",
    title: "Multi-tier AI Vision",
    body: "OpenAI GPT-4o Vision → LLaVA-1.5 → BLIP-2 cascade. The AI actually reads your image to guide the 3D reconstruction.",
  },
  {
    icon: Orbit,
    color: "from-violet-500 to-fuchsia-500",
    bg: "bg-violet-950/40",
    border: "hover:border-violet-500/30",
    title: "Interactive 3D Viewer",
    body: "Powered by Three.js with auto-grounding, PBR lighting, wireframe toggle, shadow casting, and fullscreen support.",
  },
  {
    icon: Cpu,
    color: "from-fuchsia-500 to-pink-500",
    bg: "bg-fuchsia-950/40",
    border: "hover:border-fuchsia-500/30",
    title: "100% Private & Local",
    body: "No cloud storage. Files stay in your /public directory. No subscription, no API credits required for basic use.",
  },
];

/* ─────────────────────────────────────────────
   Main Page
   ───────────────────────────────────────────── */
export default function LandingPage() {
  const heroSection  = useInView(0.1);
  const featSection  = useInView(0.1);

  return (
    <div className="relative min-h-screen flex flex-col bg-black overflow-x-hidden">

      {/* ── Ambient background glows ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-cyan-500/8 blur-[120px] animate-glow-pulse" />
        <div className="absolute top-[30%] right-[-15%] w-[600px] h-[600px] rounded-full bg-violet-500/8 blur-[100px] animate-glow-pulse delay-400" />
        <div className="absolute bottom-[-10%] left-[30%] w-[500px] h-[500px] rounded-full bg-indigo-500/6 blur-[100px] animate-glow-pulse delay-200" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        {/* Floating 3D Background Assets with low opacity */}
        <div className="absolute top-[12%] left-[3%] w-[320px] h-[320px] opacity-[0.05] blur-[1px] animate-float">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/wireframe_mesh_3d.png" alt="3D Mesh Background 1" className="w-full h-full object-contain" />
        </div>
        <div className="absolute top-[52%] right-[5%] w-[380px] h-[380px] opacity-[0.06] blur-[0.5px] animate-spin-slow">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/torus_knot_3d.png" alt="3D Torus Background" className="w-full h-full object-contain" />
        </div>
        <div className="absolute bottom-[8%] left-[6%] w-[360px] h-[360px] opacity-[0.04] blur-[2px] animate-float-slow">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/wireframe_mesh_3d.png" alt="3D Mesh Background 2" className="w-full h-full object-contain transform rotate-45" />
        </div>
      </div>

      {/* ══════════════════════════════
          NAV
         ══════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Box className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[17px] tracking-tight">
                <span className="text-shimmer">Toms 3D Generator</span>
              </span>
              <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
                BETA
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {["How it Works", "Features"].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase().replace(/\s+/g, "-")}`}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-all"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live
            </span>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white text-gray-900 hover:bg-gray-100 transition-all shadow-lg shadow-white/10"
            >
              Open App
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════
          HERO SECTION (2 COLUMNS)
         ══════════════════════════════ */}
      <section
        id="how-it-works"
        ref={heroSection.ref}
        className="relative z-10 max-w-7xl mx-auto px-6 pt-6 lg:pt-10 pb-12 w-full"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          {/* Left Column: Title & Info */}
          <div className="lg:col-span-5 flex flex-col items-start text-left">
            {/* Live status + colorful indicator pills */}
            <div className={`flex flex-wrap items-center gap-2 mb-5 ${heroSection.inView ? "animate-fade-in-up" : "opacity-0"}`}>
              {/* Live pulse indicator */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold tracking-wide">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                LIVE
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-cyan-300 text-[10px] font-semibold">
                <Sparkles className="w-2.5 h-2.5" />
                AI-Powered
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-950/40 border border-violet-500/20 text-violet-300 text-[10px] font-semibold">
                <Cpu className="w-2.5 h-2.5" />
                Local GPU
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-950/40 border border-indigo-500/20 text-indigo-300 text-[10px] font-semibold">
                <Box className="w-2.5 h-2.5" />
                GLB · GLTF
              </span>
            </div>

            {/* Headline */}
            <h1 className={`text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15] text-white mb-4 ${heroSection.inView ? "animate-fade-in-up delay-100" : "opacity-0"}`}>
              Turn any photo into a <span className="text-shimmer">3D model</span> in seconds
            </h1>

            {/* Sub */}
            <p className={`text-gray-400 text-sm leading-relaxed mb-6 max-w-lg ${heroSection.inView ? "animate-fade-in-up delay-200" : "opacity-0"}`}>
              Upload an image. AI reads shape and depth cues. Stable Fast 3D reconstructs a full GLB — ready to rotate, inspect, and download.
            </p>

            {/* CTA buttons */}
            <div className={`flex flex-row items-center gap-3 w-full mb-6 ${heroSection.inView ? "animate-fade-in-up delay-300" : "opacity-0"}`}>
              <Link
                href="/dashboard"
                className="group relative flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500 shadow-xl shadow-indigo-500/15 hover:shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5"
              >
                <span>Launch Workstation</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                <span className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </span>
              </Link>
              <a
                href="#features"
                className="flex items-center gap-1 px-4 py-3.5 rounded-xl font-semibold text-xs text-gray-400 border border-gray-800 hover:border-gray-600 hover:text-white hover:bg-white/5 transition-all"
              >
                Features
              </a>
            </div>

            {/* Hero stats */}
            <div className={`grid grid-cols-2 gap-x-8 gap-y-4 border-t border-white/[0.05] pt-8 w-full ${heroSection.inView ? "animate-fade-in-up delay-400" : "opacity-0"}`}>
              {[
                { val: "< 30s", label: "Reconstruction time" },
                { val: "GLB",   label: "Standard 3D format" },
                { val: "Free",  label: "Unlimited local use" },
                { val: "Private", label: "Processing stays local" },
              ].map((s) => (
                <div key={s.label} className="flex flex-col">
                  <span className="text-xl font-extrabold text-white">{s.val}</span>
                  <span className="text-[10px] text-gray-500 font-mono tracking-wide uppercase mt-0.5">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Motion Design Demo */}
          <div className="lg:col-span-7 w-full">
            <div className={heroSection.inView ? "animate-scale-in delay-200" : "opacity-0"}>
              <MotionDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          FEATURES
         ══════════════════════════════ */}
      <section
        id="features"
        ref={featSection.ref}
        className="relative z-10 py-28 w-full"
      >
        {/* Divider line */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="border-t border-white/[0.05] mb-28" />
        </div>

        <div className="max-w-7xl mx-auto px-6">
          <div className={`text-center mb-16 ${featSection.inView ? "animate-fade-in-up" : "opacity-0"}`}>
            <p className="text-xs font-bold tracking-widest text-violet-400 uppercase mb-3 font-mono">Features</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
              Built for{" "}
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                serious creators
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className={`glass-card p-7 rounded-2xl border border-white/[0.05] ${f.border} hover:bg-white/[0.03] transition-all group cursor-default ${featSection.inView ? `animate-fade-in-up delay-${(i + 1) * 100}` : "opacity-0"}`}
                >
                  <div className={`w-12 h-12 rounded-2xl ${f.bg} bg-gradient-to-br ${f.color} p-[1px] mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <div className="w-full h-full rounded-2xl bg-gray-950/80 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{f.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          FINAL CTA BANNER
         ══════════════════════════════ */}
      <section className="relative z-10 px-6 pb-28">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden p-px bg-gradient-to-br from-cyan-500/30 via-indigo-500/20 to-violet-500/30">
            <div className="rounded-3xl bg-black px-10 py-14 text-center relative overflow-hidden">
              {/* Inner glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
              <p className="text-xs font-bold tracking-widest text-indigo-400 uppercase mb-4 font-mono relative">
                Ready to try?
              </p>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-5 relative">
                Your image → 3D model
                <br />
                <span className="text-shimmer">in under a minute</span>
              </h2>
              <p className="text-gray-400 mb-8 relative max-w-md mx-auto">
                No setup required. The server is already running locally.
                Open the app and drop your first image.
              </p>
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-base text-white bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500 shadow-2xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 hover:-translate-y-0.5 relative"
              >
                <MousePointer className="w-4 h-4" />
                Open Workstation
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          FOOTER
         ══════════════════════════════ */}
      <footer className="border-t border-white/[0.05] py-8 z-10 relative">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center">
              <Box className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-400">Toms 3D Generator</span>
          </div>
          <p className="text-xs text-gray-600">
            © 2026 · Built with Next.js, Three.js &amp; Stable Fast 3D · Created by Toms
          </p>
        </div>
      </footer>

    </div>
  );
}
