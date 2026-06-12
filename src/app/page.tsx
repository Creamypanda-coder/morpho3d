"use client";

import Link from "next/link";
import { useEffect, useRef, useState, memo, useCallback } from "react";
import {
  ArrowRight, Box, Cpu, Sparkles, Orbit, Download,
  Upload, Scan, Layers, ChevronDown, Zap,
  Globe, Link2, Mail, Phone, MapPin, ExternalLink, Code,
  Image as ImageIcon, HelpCircle
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
   MagneticButton Component for premium touch
   (Optimized: RAF + direct DOM, no React re-renders)
   ───────────────────────────────────────────── */
function MagneticButton({ children, className, href, ...props }: any) {
  const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    posRef.current = { x: x * 0.22, y: y * 0.22 };
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (ref.current) {
          ref.current.style.transform =
            `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`;
        }
        rafRef.current = 0;
      });
    }
  };

  const handleMouseLeave = () => {
    posRef.current = { x: 0, y: 0 };
    if (ref.current) {
      ref.current.style.transform = 'translate3d(0, 0, 0)';
    }
  };

  const isLink = !!href;
  const Component = isLink ? Link : "button";

  return (
    <Component
      ref={ref as any}
      href={href}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`magnetic-btn ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

/* ─────────────────────────────────────────────
   AnimatedStep — cycles through 3 primary tools
   like an Apple product page motion demo
   ───────────────────────────────────────────── */
function MotionDemo() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const STEP_DURATION = 5500; // ms per step for more smooth experience

  const progressRef = useRef(0);

  useEffect(() => {
    let startTime: number;
    let raf: number;

    const tick = (now: number) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const pct = Math.min(Math.round((elapsed / STEP_DURATION) * 100), 100);
      if (pct !== progressRef.current) {
        progressRef.current = pct;
        setProgress(pct);
      }
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
      label: "3D Reconstructor",
      desc: "Turn any photo into a detailed, textured 3D GLB model in seconds, guided by AI Vision analysis.",
      color: "from-cyan-400 to-sky-500",
      glow: "rgba(6,182,212,0.2)",
      icon: Box,
      screen: <ModelScreen progress={progress} />,
    },
    {
      num: "02",
      label: "AI Image Generator",
      desc: "Describe your ideas and render high-resolution artwork instantly, then export directly to the 3D pipeline.",
      color: "from-indigo-400 to-violet-500",
      glow: "rgba(99,102,241,0.2)",
      icon: ImageIcon,
      screen: <ImageDemoScreen progress={progress} />,
    },
    {
      num: "03",
      label: "Text to Diagram",
      desc: "Compile system flowcharts, mindmaps, and architecture diagrams from plain descriptions in real-time.",
      color: "from-violet-400 to-fuchsia-500",
      glow: "rgba(168,85,247,0.2)",
      icon: Sparkles,
      screen: <DiagramDemoScreen progress={progress} />,
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Demo tabs selector */}
      <div className="flex justify-center gap-3 mb-8 flex-wrap">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <button
              key={i}
              onClick={() => { setActive(i); setProgress(0); }}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 border ${
                active === i
                  ? "bg-white/10 border-white/20 text-white shadow-[0_4px_20px_rgba(255,255,255,0.05)]"
                  : "bg-transparent border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon className={`w-4 h-4 transition-transform duration-300 ${active === i ? 'scale-110' : ''}`} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Demo screen */}
      <div className="demo-screen w-full relative" style={{ minHeight: 400 }}>
        <div className="screen-shimmer" />
        
        {/* Top browser bar */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5 bg-gray-950/60 backdrop-blur-md">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50 hover:bg-red-500 transition-colors cursor-pointer" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50 hover:bg-yellow-500 transition-colors cursor-pointer" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50 hover:bg-green-500 transition-colors cursor-pointer" />
          </div>
          <div className="flex-1 mx-4 h-6 rounded-lg bg-gray-900/60 border border-white/5 flex items-center px-4">
            <span className="text-[10px] text-gray-500 font-mono tracking-wider">localhost:3000/dashboard</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono tracking-tight bg-emerald-950/20 border border-emerald-500/10 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            active
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
                transform: active === i ? "translateY(0) scale(1)" : "translateY(16px) scale(0.985)",
                pointerEvents: active === i ? "auto" : "none",
              }}
            >
              {s.screen}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-950/90 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${steps[active].color} rounded-r-full transition-all duration-100 relative`}
            style={{ width: `${progress}%` }}
          >
            {/* Glowing tip */}
            {progress > 0 && progress < 100 && (
              <>
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/40 blur-xs animate-ping" />
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_#fff]" />
              </>
            )}
          </div>
        </div>

        {/* Ambient glow behind screen */}
        <div
          className="absolute -inset-px rounded-2xl pointer-events-none transition-all duration-700"
          style={{ boxShadow: `0 0 80px 0 ${steps[active].glow}` }}
        />
      </div>

      {/* Step description */}
      <p className="text-center text-gray-400 text-sm mt-8 max-w-2xl mx-auto transition-all duration-500 leading-relaxed">
        {steps[active].desc}
      </p>
    </div>
  );
}

interface DemoScreenProps {
  progress: number;
}

/* ── Demo screen 1: 3D Reconstructor (Optimized) ── */
const ModelScreen = memo(function ModelScreen({ progress }: DemoScreenProps) {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const telXRef = useRef<HTMLSpanElement>(null);
  const telYRef = useRef<HTMLSpanElement>(null);
  const telZRef = useRef<HTMLSpanElement>(null);

  // Animate SVG rotation via CSS transform on the container (GPU-composited, no React re-renders)
  useEffect(() => {
    let raf: number;
    let angle = 0;
    const tick = () => {
      angle = (angle + 0.8) % 360;
      if (svgContainerRef.current) {
        svgContainerRef.current.style.transform = `rotate(${angle}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Update telemetry via direct DOM text (no React re-renders), slowed to 500ms
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      if (telXRef.current) telXRef.current.textContent = `TX.X: ${(2.0 + Math.sin(now / 400) * 0.4).toFixed(3)}`;
      if (telYRef.current) telYRef.current.textContent = `TX.Y: ${(1.0 + Math.cos(now / 300) * 0.2).toFixed(3)}`;
      if (telZRef.current) telZRef.current.textContent = `TX.Z: ${(9.5 + Math.sin(now / 800) * 0.3).toFixed(3)}`;
    }, 500);
    return () => clearInterval(t);
  }, []);

  // Static geometry at angle=0 — rotation is handled by CSS transform on container
  const w_geom = 110;
  const v = [
    [240, 80],       // 0: Top Vertex (0, -100, 0) projected
    [240, 240],      // 1: Bottom Vertex (0, 100, 0) projected
    [196, 140.75],   // 2: Mid Front Left
    [284, 140.75],   // 3: Mid Front Right
    [284, 179.25],   // 4: Mid Back Right
    [196, 179.25],   // 5: Mid Back Left
  ];

  const faces = [
    { verts: [0, 2, 3], fill: "rgba(6, 182, 212, 0.18)", stroke: "rgba(6, 182, 212, 0.65)" },
    { verts: [0, 3, 4], fill: "rgba(99, 102, 241, 0.15)", stroke: "rgba(99, 102, 241, 0.55)" },
    { verts: [0, 4, 5], fill: "rgba(168, 85, 247, 0.16)", stroke: "rgba(168, 85, 247, 0.60)" },
    { verts: [0, 5, 2], fill: "rgba(139, 92, 246, 0.12)", stroke: "rgba(139, 92, 246, 0.50)" },
    { verts: [1, 3, 2], fill: "rgba(6, 182, 212, 0.12)", stroke: "rgba(6, 182, 212, 0.50)" },
    { verts: [1, 4, 3], fill: "rgba(99, 102, 241, 0.10)", stroke: "rgba(99, 102, 241, 0.40)" },
    { verts: [1, 5, 4], fill: "rgba(168, 85, 247, 0.14)", stroke: "rgba(168, 85, 247, 0.55)" },
    { verts: [1, 2, 5], fill: "rgba(139, 92, 246, 0.10)", stroke: "rgba(139, 92, 246, 0.45)" },
  ];

  const edges = [
    [0, 2], [0, 3], [0, 4], [0, 5],
    [1, 2], [1, 3], [1, 4], [1, 5],
    [2, 3], [3, 4], [4, 5], [5, 2]
  ];

  const pt = (i: number) => `${v[i][0]},${v[i][1]}`;

  return (
    <div className="flex items-center justify-center p-6 h-full min-h-[340px] bg-gradient-to-b from-transparent to-cyan-950/5">
      <div className="flex flex-col md:flex-row items-center gap-8 w-full max-w-xl">
        {/* 3D SVG preview container */}
        <div className="flex-shrink-0 w-[200px] h-[200px] relative flex items-center justify-center border border-white/5 bg-black/40 rounded-2xl overflow-hidden shadow-inner">
          <div className="absolute inset-0 rounded-full bg-cyan-500/5 blur-2xl" style={{ opacity: 0.6 }} />
          
          {/* Neon scan-line sweep */}
          <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 animate-scan-line" style={{ top: 0 }} />

          <div ref={svgContainerRef} style={{ willChange: 'transform' }}>
            <svg width="200" height="200" viewBox="0 0 480 320">
              <defs>
                <radialGradient id="meshGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>
              </defs>
              
              {/* Background gridlines */}
              {[...Array(7)].map((_, i) => (
                <line key={i} x1={i*80} y1="0" x2={i*80} y2="320" stroke="#121829" strokeWidth="0.8" />
              ))}
              {[...Array(5)].map((_, i) => (
                <line key={i} x1="0" y1={i*80} x2="480" y2={i*80} stroke="#121829" strokeWidth="0.8" />
              ))}
              
              {/* Hologram rings */}
              <ellipse cx="240" cy="160" rx="140" ry="40" fill="url(#meshGlow)" stroke="rgba(6, 182, 212, 0.3)" strokeWidth="1" strokeDasharray="5, 8" />
              <ellipse cx="240" cy="160" rx="110" ry="25" fill="none" stroke="rgba(139, 92, 246, 0.2)" strokeWidth="0.8" />
              
              {/* Face fills & outlines */}
              {faces.map((f, i) => (
                <polygon key={i} points={f.verts.map(pt).join(" ")} fill={f.fill} stroke={f.stroke} strokeWidth="1.2" />
              ))}
              
              {/* Edge wireframes */}
              {edges.map(([a,b], i) => (
                <line key={i} x1={v[a][0]} y1={v[a][1]} x2={v[b][0]} y2={v[b][1]} stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
              ))}

              {/* Glowing vertices */}
              {v.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="3" fill={i < 2 ? "#22d3ee" : "#a855f7"} style={{ opacity: 0.8 }} />
              ))}
            </svg>
          </div>
        </div>

        {/* Info panel */}
        <div className="flex-1 flex flex-col gap-3 w-full">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-wide">mesh_model.glb</span>
            <span className="text-[9px] text-cyan-400 bg-cyan-950/30 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono">
              GENERATING
            </span>
          </div>

          <div className="rounded-xl border border-white/5 bg-black/45 p-3.5 flex flex-col gap-2.5">
            {[
              { label: "Vertices", val: "48,512", color: "text-cyan-400" },
              { label: "Format",   val: "GLB (Textured)", color: "text-emerald-400" },
              { label: "Engine",   val: "Stable Fast 3D", color: "text-indigo-400" },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-1 border-b border-white/[0.04] last:border-0">
                <span className="text-[10px] text-gray-500 font-mono">{item.label}</span>
                <span className={`text-[10px] font-bold font-mono ${item.color}`}>{item.val}</span>
              </div>
            ))}
          </div>

          {/* Holographic system metrics — updated via direct DOM, no React re-renders */}
          <div className="flex gap-4 px-1 text-[9px] text-gray-500 font-mono">
            <span ref={telXRef}>TX.X: 2.120</span>
            <span ref={telYRef}>TX.Y: 1.050</span>
            <span ref={telZRef}>TX.Z: 9.870</span>
          </div>

          <button className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-all duration-300 transform active:scale-95">
            <Download className="w-3.5 h-3.5" />
            Download GLB
          </button>
        </div>
      </div>
    </div>
  );
});

/* ── Demo screen 2: Image Generator (Optimized) ── */
const ImageDemoScreen = memo(function ImageDemoScreen({ progress }: DemoScreenProps) {
  const fullPrompt = "A glowing robotic owl with polished copper feathers and brass gears, game asset, isolated on dark background";
  // Stage boundaries: 0-30% typing, 30-70% neural connecting, 70-100% rendering final image
  const isTyping = progress < 30;
  const isGenerating = progress >= 30 && progress < 70;
  const isRevealed = progress >= 70;

  // Compute text substring
  const charsToShow = Math.floor((Math.min(progress, 30) / 30) * fullPrompt.length);
  const typedPrompt = fullPrompt.substring(0, charsToShow);

  return (
    <div className="flex items-center justify-center p-6 h-full min-h-[340px] bg-gradient-to-b from-transparent to-indigo-950/5">
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left config */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-xs font-semibold text-gray-300">Prompt Input</span>
              {isGenerating && (
                <span className="ml-auto text-[9px] text-cyan-400 font-mono animate-pulse bg-cyan-950/30 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                  DIFFUSING
                </span>
              )}
            </div>
            
            <div className="rounded-xl bg-black/60 border border-white/5 p-4 min-h-[170px] flex flex-col justify-between shadow-inner">
              <div className="font-mono text-[11px] leading-relaxed text-indigo-200">
                <span className="text-gray-500 font-bold mr-1.5">[PROMPT]</span>
                {typedPrompt}
                {isTyping && <span className="w-1.5 h-3.5 bg-indigo-400 inline-block animate-blink-cursor ml-0.5" />}
              </div>
              <div className="mt-3 text-[9px] text-gray-500 flex gap-3.5 font-mono border-t border-white/[0.04] pt-2">
                <span>Aspect: 1:1</span>
                <span>•</span>
                <span>Preset: Cyberpunk Render</span>
              </div>
            </div>
          </div>

          <div className="w-full mt-4 h-1.5 rounded-full bg-gray-900 overflow-hidden relative border border-white/5">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-100" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Right Preview */}
        <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-black/40 relative overflow-hidden min-h-[220px]">
          {/* Animated stages based on progress percentage */}
          {isTyping && (
            <div className="flex flex-col items-center justify-center text-center text-gray-600 gap-2 font-mono">
              <span className="w-6 h-6 rounded-full border border-gray-800 border-t-indigo-500 animate-spin" />
              <span className="text-[10px] uppercase tracking-wider">Awaiting Prompt...</span>
            </div>
          )}

          {isGenerating && (
            <div className="w-full h-full flex flex-col items-center justify-center relative">
              <svg width="120" height="120" className="opacity-80 drop-shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                <line x1="20" y1="20" x2="60" y2="60" stroke="rgba(99,102,241,0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1="100" y1="20" x2="60" y2="60" stroke="rgba(168,85,247,0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1="20" y1="100" x2="60" y2="60" stroke="rgba(6,182,212,0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1="100" y1="100" x2="60" y2="60" stroke="rgba(236,72,153,0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
                
                <circle cx="20" cy="20" r="4" fill="#6366f1" className="animate-pulse" />
                <circle cx="100" cy="20" r="4" fill="#a855f7" className="animate-pulse" />
                <circle cx="60" cy="60" r="6" fill="#22d3ee" className="animate-ping" />
                <circle cx="60" cy="60" r="5" fill="#22d3ee" />
                <circle cx="20" cy="100" r="4" fill="#ec4899" className="animate-pulse" />
                <circle cx="100" cy="100" r="4" fill="#3b82f6" className="animate-pulse" />
              </svg>
              <span className="mt-2 text-[9px] font-mono text-indigo-400 tracking-wider animate-pulse">GENERATING CHANNELS...</span>
            </div>
          )}

          {isRevealed && (
            <div className="w-full h-full flex flex-col items-center justify-center animate-scale-in">
              <div className="w-32 h-32 relative rounded-xl border border-indigo-500/20 shadow-2xl shadow-indigo-500/10 flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-950/40 to-purple-950/40 group">
                <div className="absolute inset-0 bg-indigo-500/5 mix-blend-overlay" />
                
                {/* Neon scan line sweep */}
                <div className="absolute left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70 animate-scan-line" style={{ top: 0 }} />

                <svg width="64" height="64" viewBox="0 0 64 64" className="text-cyan-400 animate-float drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]">
                  <circle cx="32" cy="34" r="20" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 30 C8 38, 12 46, 18 42" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M52 30 C56 38, 52 46, 46 42" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="24" cy="26" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="24" cy="26" r="2" fill="#22d3ee" className="animate-pulse" />
                  <circle cx="40" cy="26" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="40" cy="26" r="2" fill="#22d3ee" className="animate-pulse" />
                  <polygon points="32,31 29,36 35,36" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="32" cy="46" r="5" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3, 2" />
                </svg>
                <div className="absolute inset-x-0 bottom-0 bg-black/80 py-1.5 text-center text-[8px] font-mono text-cyan-400 border-t border-white/5">
                  Generated Art
                </div>
              </div>
              <span className="mt-3.5 text-[9px] font-mono text-indigo-400 tracking-widest uppercase animate-pulse">Rendering complete</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

/* ── Demo screen 3: Text to Diagram (Optimized) ── */
const DiagramDemoScreen = memo(function DiagramDemoScreen({ progress }: DemoScreenProps) {
  const fullMermaid = `flowchart TD
  Client[Web Client] --> DB{Query DB}
  DB -- Found --> Log[Session Init]
  DB -- Error --> Alert[Show Error]`;

  const isTyping = progress < 45;
  const isCompiling = progress >= 45 && progress < 60;
  const isCompiled = progress >= 60;

  // Compute text substring
  const charsToShow = Math.floor((Math.min(progress, 45) / 45) * fullMermaid.length);
  const typedMermaid = fullMermaid.substring(0, charsToShow);

  return (
    <div className="flex items-center justify-center p-6 h-full min-h-[340px] bg-gradient-to-b from-transparent to-violet-950/5">
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left description */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-violet-950/60 border border-violet-500/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-violet-400" />
              </div>
              <span className="text-xs font-semibold text-gray-300">Mermaid compiler</span>
              {isCompiling && (
                <span className="ml-auto text-[9px] text-violet-400 font-mono animate-pulse bg-violet-950/30 border border-violet-500/20 px-2 py-0.5 rounded-full">
                  COMPILING
                </span>
              )}
            </div>
            
            <div className="rounded-xl bg-black/60 border border-white/5 p-4 min-h-[170px] flex flex-col justify-between font-mono shadow-inner">
              <div className="text-[11px] text-violet-200 leading-relaxed">
                <span className="text-gray-500 font-bold mr-1.5">[MERMAID]</span>
                <pre className="mt-2 text-cyan-400/90 text-[10px] overflow-x-auto whitespace-pre-wrap">
                  {typedMermaid}
                  {isTyping && <span className="w-1.5 h-3.5 bg-cyan-400 inline-block animate-blink-cursor ml-0.5" />}
                </pre>
              </div>
              {isCompiled && (
                <span className="text-[9px] text-emerald-400 bg-emerald-950/35 border border-emerald-500/20 px-2.5 py-0.5 rounded-md self-start mt-2">
                  ✓ Compiled successfully
                </span>
              )}
            </div>
          </div>
          
          <div className="w-full mt-4 h-1.5 rounded-full bg-gray-900 overflow-hidden relative border border-white/5">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-100" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Right preview SVG */}
        <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-black/40 relative overflow-hidden min-h-[220px]">
          {isTyping && (
            <div className="flex flex-col items-center justify-center text-center text-gray-600 gap-2 font-mono">
              <span className="w-6 h-6 rounded-full border border-gray-800 border-t-violet-500 animate-spin" />
              <span className="text-[10px] uppercase tracking-wider">Awaiting Script...</span>
            </div>
          )}

          {isCompiling && (
            <div className="flex flex-col items-center justify-center text-center text-violet-400/80 gap-2 font-mono">
              <span className="w-6 h-6 rounded-full border border-transparent border-t-violet-400 border-r-violet-400 animate-spin" />
              <span className="text-[10px] uppercase tracking-wider animate-pulse">Parsing AST nodes...</span>
            </div>
          )}

          {isCompiled && (
            <div className="w-full max-w-xs flex flex-col items-center gap-4 font-mono text-[9.5px] p-4 bg-black/35 rounded-xl border border-violet-500/10 shadow-lg animate-scale-in">
              {/* Box 1 */}
              <div className="px-3.5 py-2 rounded-lg bg-violet-950/45 border border-violet-500/30 text-violet-300 font-bold shadow-[0_2px_10px_rgba(139,92,246,0.1)]">
                👤 Web Client
              </div>
              
              {/* Glowing Arrow Path */}
              <svg width="10" height="20" viewBox="0 0 10 20" className="text-violet-400">
                <path d="M5 0 L5 20 M1 15 L5 20 L9 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 3" className="animate-pulse" />
              </svg>
              
              {/* Box 2 (Decision Diamond) */}
              <div 
                className="px-2 py-2 border border-cyan-500/40 text-cyan-300 bg-cyan-950/20 font-bold relative flex items-center justify-center shadow-[0_2px_10px_rgba(6,182,212,0.1)]" 
                style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)", width: 80, height: 48 }}
              >
                <span className="text-[8px] text-center leading-tight">Query DB?</span>
              </div>

              {/* Split Arrows */}
              <div className="flex justify-between w-44 text-gray-500 text-[8px] px-2 -my-2 font-bold">
                <span className="text-emerald-400">Found</span>
                <span className="text-rose-400">Error</span>
              </div>

              {/* Twin End Nodes */}
              <div className="flex gap-4">
                <div className="px-2.5 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/25 text-emerald-400 font-semibold shadow-[0_2px_10px_rgba(16,185,129,0.08)]">
                  🟢 Session Init
                </div>
                <div className="px-2.5 py-1.5 rounded-lg bg-rose-950/30 border border-rose-500/25 text-rose-400 font-semibold shadow-[0_2px_10px_rgba(239,68,68,0.08)]">
                  🔴 Show Error
                </div>
              </div>
            </div>
          )}
          
          {isCompiled && (
            <span className="mt-4 text-[9px] font-mono text-violet-400 tracking-widest uppercase animate-pulse">Interactive Node Graph</span>
          )}
        </div>
      </div>
    </div>
  );
});

/* ─────────────────────────────────────────────
   Feature card Component with Spotlight effect
   ───────────────────────────────────────────── */
interface FeatureCardProps {
  f: typeof FEATURES[0];
  i: number;
  inView: boolean;
}

const FeatureCard = memo(function FeatureCard({ f, i, inView }: FeatureCardProps) {
  const spotlightRef = useRef<HTMLDivElement>(null);
  const coordsRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);
  const Icon = f.icon;

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    coordsRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (spotlightRef.current) {
          spotlightRef.current.style.background =
            `radial-gradient(350px circle at ${coordsRef.current.x}px ${coordsRef.current.y}px, rgba(99, 102, 241, 0.08), transparent 80%)`;
        }
        rafRef.current = 0;
      });
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className={`glass-card glass-card-hover p-8 rounded-2xl relative overflow-hidden group cursor-default ${inView ? "animate-fade-in-up" : "opacity-0"}`}
      style={{
        animationDelay: `${(i + 1) * 120}ms`
      }}
    >
      {/* Spotlight glow mask */}
      <div 
        ref={spotlightRef}
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
      />
      
      <div className={`w-12 h-12 rounded-2xl ${f.bg} bg-gradient-to-br ${f.color} p-[1px] mb-6 group-hover:scale-105 transition-transform duration-300 relative`}>
        <div className="w-full h-full rounded-2xl bg-gray-950/90 flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      
      <h3 className="text-base font-bold text-white mb-2.5 flex items-center gap-2">
        {f.title}
        <Zap className="w-3.5 h-3.5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </h3>
      <p className="text-gray-400 text-sm leading-relaxed">{f.body}</p>
    </div>
  );
});

/* ─────────────────────────────────────────────
   Feature cards data
   ───────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Box,
    color: "from-cyan-500 to-sky-500",
    bg: "bg-cyan-950/40",
    border: "hover:border-cyan-500/30",
    title: "AI 3D Reconstructor",
    body: "Powered by TripoSR, Microsoft Trellis, and Stable Fast 3D models. Upload any 2D image and reconstruct fully-textured 3D GLB assets in seconds.",
  },
  {
    icon: ImageIcon,
    color: "from-indigo-500 to-violet-500",
    bg: "bg-indigo-950/40",
    border: "hover:border-indigo-500/30",
    title: "AI Image Generator",
    body: "Create visual references or high-fidelity artwork directly from text prompts. Connects instantly with the 3D generator workstation.",
  },
  {
    icon: Sparkles,
    color: "from-violet-500 to-fuchsia-500",
    bg: "bg-violet-950/40",
    border: "hover:border-violet-500/30",
    title: "Text to Diagram",
    body: "Auto-translate text descriptions into responsive system architectures, flowcharts, mindmaps, and state machines with live zoom & pan viewport.",
  },
  {
    icon: Cpu,
    color: "from-fuchsia-500 to-pink-500",
    bg: "bg-fuchsia-950/40",
    border: "hover:border-fuchsia-500/30",
    title: "Local GPU Priority",
    body: "Fully optimized for local NVIDIA CUDA setups. Runs inference offline. Falls back to free Hugging Face endpoints if keys or hardware are missing.",
  },
];

/* ─────────────────────────────────────────────
   Main Page
   ───────────────────────────────────────────── */
export default function LandingPage() {
  const heroSection  = useInView(0.08);
  const featSection  = useInView(0.08);
  const aboutSection = useInView(0.08);

  const rootRef = useRef<HTMLDivElement>(null);
  const mousePosRef = useRef({ x: 50, y: 50 });
  const rafMouseRef = useRef(0);
  const [stars] = useState(() =>
    [...Array(20)].map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 8}s`,
      duration: `${6 + Math.random() * 8}s`,
    }))
  );

  // Pause all animations when the tab is hidden
  useEffect(() => {
    const handleVisibility = () => {
      const el = rootRef.current;
      if (!el) return;
      if (document.hidden) {
        el.classList.add('animations-paused');
      } else {
        el.classList.remove('animations-paused');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    mousePosRef.current = { x, y };
    if (!rafMouseRef.current) {
      rafMouseRef.current = requestAnimationFrame(() => {
        const el = rootRef.current;
        if (el) {
          el.style.setProperty('--mouse-x', `${mousePosRef.current.x}%`);
          el.style.setProperty('--mouse-y', `${mousePosRef.current.y}%`);
        }
        rafMouseRef.current = 0;
      });
    }
  };

  return (
    <div
      ref={rootRef}
      onMouseMove={handleMouseMove}
      style={{
        "--mouse-x": "50%",
        "--mouse-y": "50%",
      } as React.CSSProperties}
      className="relative min-h-screen flex flex-col bg-[#030014] overflow-x-hidden interactive-mesh-bg"
    >
      
      {/* Parallax moving grid background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-50 z-0">
        <div className="absolute inset-0 grid-overlay-parallax opacity-[0.4]" />
      </div>

      {/* Volumetric background lights — static blur, animate only opacity+scale */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-cyan-500/6 animate-glow-pulse" style={{ filter: 'blur(90px)' }} />
        <div className="absolute top-[25%] right-[-10%] w-[550px] h-[550px] rounded-full bg-indigo-500/6 animate-glow-pulse delay-400" style={{ filter: 'blur(90px)' }} />
        <div className="absolute bottom-[-15%] left-[25%] w-[500px] h-[500px] rounded-full bg-violet-500/5 animate-glow-pulse delay-200" style={{ filter: 'blur(90px)' }} />
      </div>

      {/* ══════════════════════════════
          NAV
         ══════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-white/[0.04] bg-[#030014]/70 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <Box className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[18px] tracking-tight">
                <span className="text-shimmer">Toms Workspace</span>
              </span>
              <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                BETA
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1.5">
            {["How it Works", "Features", "About"].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase().replace(/\s+/g, "-")}`}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-all duration-300"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <span className="hidden sm:flex items-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-950/20 border border-emerald-500/10 px-2.5 py-0.5 rounded-full">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              Live Status
            </span>
            <MagneticButton
              href="/dashboard"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-white text-gray-900 hover:bg-gray-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] shadow-lg transition-all duration-300"
            >
              Open App
              <ArrowRight className="w-3.5 h-3.5" />
            </MagneticButton>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════
          HERO SECTION (2 COLUMNS)
         ══════════════════════════════ */}
      <section
        id="how-it-works"
        ref={heroSection.ref}
        className="relative z-10 max-w-7xl mx-auto px-6 pt-10 lg:pt-16 pb-16 w-full flex-1 flex flex-col justify-center"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Title & Info */}
          <div className="lg:col-span-5 flex flex-col items-start text-left relative z-10">
            {/* Animated particles container inside the hero */}
            <div className="starfield pointer-events-none">
              {stars.map((s) => (
                <div
                  key={s.id}
                  className="starfield-particle"
                  style={{
                    top: s.top,
                    left: s.left,
                    animationDelay: s.delay,
                    animationDuration: s.duration,
                  }}
                />
              ))}
            </div>

            <div className={`flex flex-wrap items-center gap-2 mb-6 ${heroSection.inView ? "animate-fade-in-up" : "opacity-0"}`}>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[9px] font-extrabold tracking-widest uppercase">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                LIVE
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/30 border border-cyan-500/20 text-cyan-300 text-[9px] font-bold">
                <Box className="w-3 h-3" />
                3D Reconstruction
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/30 border border-indigo-500/20 text-indigo-300 text-[9px] font-bold">
                <ImageIcon className="w-3 h-3" />
                Image AI
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-950/30 border border-violet-500/20 text-violet-300 text-[9px] font-bold">
                <Sparkles className="w-3 h-3" />
                Diagram compilation
              </span>
            </div>

            {/* Headline */}
            <h1 className={`text-4xl md:text-5xl lg:text-[54px] font-extrabold tracking-tight leading-[1.12] text-white mb-6 ${heroSection.inView ? "animate-fade-in-up delay-100" : "opacity-0"}`}>
              Supercharge your creations with <span className="text-shimmer">AI Workspaces</span>
            </h1>

            {/* Sub */}
            <p className={`text-gray-400 text-[15px] leading-relaxed mb-8 max-w-lg ${heroSection.inView ? "animate-fade-in-up delay-200" : "opacity-0"}`}>
              From 2D-to-3D asset model reconstruction, prompt-to-image art generation, to real-time SVG flowchart compiler. Generate visual assets and map your architecture in one dashboard.
            </p>

            {/* CTA buttons */}
            <div className={`flex flex-row items-center gap-4 w-full mb-8 ${heroSection.inView ? "animate-fade-in-up delay-300" : "opacity-0"}`}>
              <MagneticButton
                href="/dashboard"
                className="group relative flex items-center gap-2 px-6 py-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500 shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all duration-300"
              >
                <span>Launch Workstation</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                <span className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </span>
              </MagneticButton>
              <a
                href="#features"
                className="flex items-center gap-1.5 px-5 py-4 rounded-xl font-bold text-xs text-gray-400 border border-white/5 hover:border-white/10 hover:text-white hover:bg-white/5 transition-all duration-300"
              >
                Explore Features
              </a>
            </div>
          </div>

          {/* Right Column: Motion Design Demo */}
          <div className="lg:col-span-7 w-full relative z-10">
            {/* Background 3D Image reflections surrounding hero */}
            <div className="absolute -top-12 -left-12 w-64 h-64 opacity-5 blur-[1.5px] animate-float pointer-events-none select-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/wireframe_mesh_3d.png" alt="3D Mesh" className="w-full h-full object-contain" loading="lazy" />
            </div>
            <div className="absolute -bottom-12 -right-12 w-72 h-72 opacity-[0.06] blur-[0.5px] animate-spin-slow pointer-events-none select-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/torus_knot_3d.png" alt="3D Torus" className="w-full h-full object-contain" loading="lazy" />
            </div>

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
        className="relative z-10 py-32 w-full bg-gradient-to-b from-transparent via-black/40 to-transparent"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="border-t border-white/[0.04] mb-32" />
        </div>

        <div className="max-w-7xl mx-auto px-6">
          <div className={`text-center mb-20 ${featSection.inView ? "animate-fade-in-up" : "opacity-0"}`}>
            <p className="text-xs font-extrabold tracking-widest text-violet-400 uppercase mb-4.5 font-mono">Features Workspace</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white max-w-2xl mx-auto leading-tight">
              Built for{" "}
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
                modern developers &amp; artists
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <FeatureCard key={i} f={f} i={i} inView={featSection.inView} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          ABOUT ME
         ══════════════════════════════ */}
      <section
        id="about"
        ref={aboutSection.ref}
        className="relative z-10 px-6 pb-32"
      >
        <div className="max-w-5xl mx-auto">
          <div className="border-t border-white/[0.04] mb-32" />

          <div className={`text-center mb-16 ${aboutSection.inView ? "animate-fade-in-up" : "opacity-0"}`}>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
              About the{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                Creator
              </span>
            </h2>
          </div>

          {/* Card */}
          <div className={`relative rounded-3xl overflow-hidden p-[1px] bg-gradient-to-br from-cyan-500/20 via-indigo-500/10 to-violet-500/20 ${aboutSection.inView ? "animate-fade-in-up delay-100" : "opacity-0"}`}>
            <div className="rounded-3xl bg-[#040212]/90 backdrop-blur-lg px-8 py-12 md:px-14 md:py-14 relative overflow-hidden border border-white/5">
              <div className="absolute top-0 right-0 w-[550px] h-[350px] rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-[450px] h-[300px] rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

              <div className="relative flex flex-col md:flex-row gap-12 items-start">

                {/* Left: Avatar + contact */}
                <div className="flex flex-col items-center md:items-start gap-6 md:w-60 flex-shrink-0">
                  {/* Avatar */}
                  <div className="relative group">
                    <div className="w-36 h-36 rounded-2xl overflow-hidden ring-2 ring-white/10 shadow-2xl shadow-violet-500/15 group-hover:ring-cyan-500/30 transition-all duration-300 relative">
                      {/* Cyber scanline overlay on avatar */}
                      <div className="absolute inset-x-0 h-[1.5px] bg-cyan-400 opacity-60 animate-scan-line pointer-events-none" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://creamypanda-coder.github.io/Porto/assets/cyberpunk_avatar.jpg"
                        alt="Muhamad Tomi Tobuhita"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold tracking-wide shadow-lg">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                      </span>
                      Available for work
                    </span>
                  </div>

                  {/* Name & title */}
                  <div className="text-center md:text-left mt-3">
                    <h3 className="text-[19px] font-extrabold text-white tracking-tight">Muhamad Tomi Tobuhita</h3>
                    <p className="text-xs text-cyan-400 font-bold mt-1 tracking-wide uppercase font-mono">IT Engineer · Network Specialist · QA</p>
                    <div className="flex items-center gap-1.5 mt-2.5 justify-center md:justify-start">
                      <MapPin className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-[11px] text-gray-500 font-mono">Maluku Ambon, Indonesia</span>
                    </div>
                  </div>

                  {/* Contact info */}
                  <div className="flex flex-col gap-2.5 w-full border-t border-white/[0.04] pt-4">
                    <a href="mailto:muhamadtomytobuhita@gmail.com" className="flex items-center gap-3.5 text-[11px] text-gray-400 hover:text-cyan-400 transition-colors group">
                      <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-cyan-950/60 group-hover:border-cyan-500/20 transition-all duration-300">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate font-mono">muhamadtomytobuhita@gmail.com</span>
                    </a>
                    <a href="https://wa.me/6282239638386" target="_blank" rel="noreferrer" className="flex items-center gap-3.5 text-[11px] text-gray-400 hover:text-emerald-400 transition-colors group">
                      <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-emerald-950/60 group-hover:border-emerald-500/20 transition-all duration-300">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-mono">+62 822-3963-8386</span>
                    </a>
                  </div>

                  {/* Social links */}
                  <div className="flex gap-2.5">
                    {[
                      { href: "https://github.com/Creamypanda-coder", icon: Code, color: "hover:text-white hover:bg-gray-800/80 hover:border-white/10", label: "GitHub" },
                      { href: "https://www.linkedin.com/in/muhamadtomitobuhita", icon: Link2, color: "hover:text-blue-400 hover:bg-blue-950/40 hover:border-blue-500/20", label: "LinkedIn" },
                      { href: "https://instagram.com/kreamypanda", icon: Globe, color: "hover:text-pink-400 hover:bg-pink-950/40 hover:border-pink-500/20", label: "Instagram" },
                      { href: "https://creamypanda-coder.github.io/Porto/", icon: ExternalLink, color: "hover:text-violet-400 hover:bg-violet-950/40 hover:border-violet-500/20", label: "Portfolio" },
                    ].map(({ href, icon: Icon, color, label }, i) => (
                      <a
                        key={i}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        title={label}
                        className={`w-9.5 h-9.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 transition-all duration-300 ${color}`}
                      >
                        <Icon className="w-4 h-4" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* Right: Bio + Skills */}
                <div className="flex-1 flex flex-col gap-8 w-full">
                  {/* Bio */}
                  <div>
                    <p className="text-xs font-extrabold tracking-widest text-violet-400 uppercase mb-3 font-mono">Overview</p>
                    <p className="text-gray-300 text-[14px] leading-relaxed font-sans">
                      IT Engineer &amp; QA Specialist focused on building secure network infrastructure, optimizing system stability, and developing modern web/mobile applications.
                    </p>
                  </div>

                  {/* Skills grid */}
                  <div>
                    <p className="text-xs font-extrabold tracking-widest text-violet-400 uppercase mb-4.5 font-mono">Skills & Expertise</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {[
                        { label: "Network Engineering", sub: "Routing, Switching & Protocols", color: "from-cyan-500 to-sky-500", bg: "bg-cyan-950/20" },
                        { label: "Systems & Servers", sub: "Linux, Windows & VM Management", color: "from-indigo-500 to-violet-500", bg: "bg-indigo-950/20" },
                        { label: "Quality Assurance", sub: "Manual, Automated & Stability Testing", color: "from-violet-500 to-fuchsia-500", bg: "bg-violet-950/20" },
                        { label: "IT Security & Support", sub: "Firewalls, Diagnostics & Monitoring", color: "from-fuchsia-500 to-pink-500", bg: "bg-fuchsia-950/20" },
                        { label: "Web Development", sub: "HTML5, CSS3, JavaScript & Frontend", color: "from-emerald-500 to-cyan-500", bg: "bg-emerald-950/20" },
                        { label: "App Development", sub: "Android Mobile & Desktop Apps", color: "from-amber-500 to-orange-500", bg: "bg-amber-950/20" },
                        { label: "UI/UX Design", sub: "Wireframing, Prototyping & Figma", color: "from-rose-500 to-pink-500", bg: "bg-rose-950/20" },
                        { label: "AI & 3D Integration", sub: "Image Diffusion · Mermaid API · GLB Viewers", color: "from-cyan-400 to-violet-500", bg: "bg-cyan-950/20" },
                      ].map((skill, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl border border-white/5 ${skill.bg} hover:border-white/10 hover:bg-white/[0.02] transition-all duration-300 group cursor-default`}
                        >
                          <div className={`w-[2.5px] h-9 rounded-full bg-gradient-to-b ${skill.color} flex-shrink-0 group-hover:scale-105 transition-transform duration-300`} />
                          <div>
                            <p className="text-xs font-bold text-white tracking-wide">{skill.label}</p>
                            <p className="text-[10px] text-gray-500 mt-1 font-mono leading-none">{skill.sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Portfolio link */}
                  <div className="flex flex-wrap items-center gap-4.5 border-t border-white/[0.04] pt-6">
                    <MagneticButton
                      href="https://creamypanda-coder.github.io/Porto/"
                      target="_blank"
                      rel="noreferrer"
                      className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500 shadow-xl shadow-indigo-500/15 hover:shadow-indigo-500/30 transition-all duration-300"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Full Portfolio
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </MagneticButton>
                    
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-xs text-gray-400 border border-white/5 hover:border-white/10 hover:text-white hover:bg-white/5 transition-all duration-300"
                    >
                      Try the App
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          FOOTER
         ══════════════════════════════ */}
      <footer className="border-t border-white/[0.04] py-10 z-10 relative bg-black/40">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <Box className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-400 font-mono tracking-wide">Toms AI Suite</span>
          </div>
          <p className="text-xs text-gray-600 font-mono">
            © 2026 · Built with Next.js, Three.js &amp; Stable Fast 3D · Created by Toms
          </p>
        </div>
      </footer>

    </div>
  );
}
