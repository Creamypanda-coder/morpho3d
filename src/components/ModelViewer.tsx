"use client";

import React, {
  useState, useRef, useEffect, Suspense, useCallback
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  Rotate3d, RefreshCw, Grid3X3, Eye, EyeOff,
  Maximize2, Minimize2, Activity, AlertTriangle, Download
} from "lucide-react";

/* ─── Error Boundary ─── */
class CanvasErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (e: string) => void },
  { hasError: boolean }
> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e: any) { this.props.onError(e?.message || "Failed to parse 3D model."); }
  render() { return this.state.hasError ? null : this.props.children; }
}

/* ─── Camera Framer ─── */
function CameraFramer({ modelBox, controlsRef }: { modelBox: THREE.Box3 | null; controlsRef: React.RefObject<any> }) {
  const { camera } = useThree();
  useEffect(() => {
    if (!modelBox || !controlsRef.current) return;
    const size = new THREE.Vector3(); const center = new THREE.Vector3();
    modelBox.getSize(size); modelBox.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    camera.position.set(0, center.y + maxDim * 0.6, maxDim * 2.5);
    controlsRef.current.target.set(center.x, center.y, center.z);
    controlsRef.current.update();
  }, [modelBox, camera, controlsRef]);
  return null;
}

/* ─── AutoStand ─── */
const AutoStand = ({
  url, wireframe, onLoad, onBoxReady, onSceneReady,
}: {
  url: string; wireframe: boolean;
  onLoad: () => void;
  onBoxReady: (box: THREE.Box3) => void;
  onSceneReady: (scene: THREE.Group) => void;
}) => {
  const { scene } = useGLTF(url);

  useEffect(() => {
    if (!scene) return;
    scene.scale.set(1, 1, 1); scene.position.set(0, 0, 0);
    scene.rotation.set(0, 0, 0); scene.updateMatrixWorld(true);

    const rawBox = new THREE.Box3().setFromObject(scene);
    const rawSize = new THREE.Vector3(); rawBox.getSize(rawSize);
    const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z);
    scene.scale.setScalar(maxDim > 0 ? 2.0 / maxDim : 1);
    scene.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(scene);
    const scaledCenter = new THREE.Vector3(); scaledBox.getCenter(scaledCenter);
    scene.position.set(-scaledCenter.x, -scaledBox.min.y, -scaledCenter.z);
    scene.updateMatrixWorld(true);

    const finalBox = new THREE.Box3().setFromObject(scene);
    onBoxReady(finalBox);
    onSceneReady(scene as unknown as THREE.Group);
    onLoad();
  }, [scene, url, onLoad, onBoxReady, onSceneReady]);

  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m: any) => { if (m) m.wireframe = wireframe; });
      }
    });
  }, [scene, wireframe]);

  return <primitive object={scene} dispose={null} />;
};

/* ─── Main ModelViewer ─── */
interface ModelViewerProps { modelPath: string; }

export default function ModelViewer({ modelPath }: ModelViewerProps) {
  const [wireframe,     setWireframe]     = useState(false);
  const [autoRotate,    setAutoRotate]    = useState(false);
  const [showGrid,      setShowGrid]      = useState(true);
  const [isFullscreen,  setIsFullscreen]  = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [loadingError,  setLoadingError]  = useState<string | null>(null);
  const [modelBox,      setModelBox]      = useState<THREE.Box3 | null>(null);
  const [bgColor,       setBgColor]       = useState<"dark" | "black" | "gray" | "white">("dark");

  const containerRef   = useRef<HTMLDivElement>(null);
  const controlsRef    = useRef<any>(null);
  const modelSceneRef  = useRef<THREE.Group | null>(null);

  /* fullscreen sync */
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /* Force Canvas resize recalculation on fullscreen state toggle */
  useEffect(() => {
    window.dispatchEvent(new Event("resize"));
    // A small timeout ensures the container has fully finished CSS transitions
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 100);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  /* model path change → reset */
  useEffect(() => {
    setLoading(true); setLoadingError(null); setModelBox(null);
    try { useGLTF.clear(modelPath); } catch {}
  }, [modelPath]);

  const handleLoad       = useCallback(() => setLoading(false), []);
  const handleBoxReady   = useCallback((b: THREE.Box3) => setModelBox(b), []);
  const handleSceneReady = useCallback((s: THREE.Group) => { modelSceneRef.current = s; }, []);

  const handleResetCamera = () => {
    if (!controlsRef.current || !modelBox) return;
    const size = new THREE.Vector3(); const center = new THREE.Vector3();
    modelBox.getSize(size); modelBox.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    const cam = controlsRef.current.object;
    cam.position.set(0, center.y + maxDim * 0.6, maxDim * 2.5);
    controlsRef.current.target.set(center.x, center.y, center.z);
    controlsRef.current.update();
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    document.fullscreenElement ? document.exitFullscreen() : containerRef.current.requestFullscreen().catch(console.error);
  };

  const handleDownloadGLB = () => {
    if (!modelPath) return;
    const a = document.createElement("a");
    a.href = modelPath;
    a.download = "model.glb";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const bgClasses = {
    dark: "bg-gradient-to-b from-gray-950 to-gray-900 border-gray-800 text-gray-100",
    black: "bg-black border-gray-900 text-gray-100",
    gray: "bg-gray-800 border-gray-700 text-gray-100",
    white: "bg-white border-gray-200 text-gray-900",
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full rounded-2xl overflow-hidden border shadow-2xl flex flex-col transition-colors duration-350 ${bgClasses[bgColor]} ${
        isFullscreen ? "!h-screen !w-screen !rounded-none !border-none" : ""
      }`}
    >
      {/* Loading */}
      {loading && !loadingError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80 backdrop-blur-sm z-30">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <div className="absolute inset-2 rounded-full border-4 border-violet-500/10 border-t-violet-400 animate-spin [animation-duration:1.5s]" />
          </div>
          <p className="mt-4 text-cyan-400 font-medium text-xs tracking-wider animate-pulse flex items-center gap-2 font-mono">
            <Activity className="w-4 h-4 animate-bounce" /> RENDERING 3D MESH...
          </p>
        </div>
      )}

      {/* Error */}
      {loadingError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gray-950/90 z-30">
          <AlertTriangle className="w-10 h-10 text-rose-500 mb-3 animate-bounce" />
          <p className="text-rose-400 font-bold mb-2">Error Loading 3D Model</p>
          <p className="text-gray-400 text-xs max-w-md font-mono">{loadingError}</p>
          <button
            onClick={() => { setLoadingError(null); setLoading(true); try { useGLTF.clear(modelPath); } catch {} }}
            className="mt-4 px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs rounded-xl text-gray-300 font-semibold"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 w-full relative">
        <CanvasErrorBoundary onError={(e) => { setLoadingError(e); setLoading(false); }}>
          <Canvas shadows camera={{ position: [0, 3, 5], fov: 45 }} gl={{ preserveDrawingBuffer: true, antialias: true }}>
            <ambientLight intensity={0.55} />
            <directionalLight position={[4, 8, 4]} intensity={1.8} castShadow
              shadow-mapSize={[2048, 2048]} shadow-camera-near={0.1} shadow-camera-far={50}
              shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
            <directionalLight position={[-4, 4, -4]} intensity={0.45} />
            <pointLight position={[0, 5, 2]} intensity={0.5} />

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
              <planeGeometry args={[60, 60]} />
              <shadowMaterial opacity={bgColor === "white" ? 0.15 : 0.3} />
            </mesh>

            <Suspense fallback={null}>
              <AutoStand
                url={modelPath}
                wireframe={wireframe}
                onLoad={handleLoad}
                onBoxReady={handleBoxReady}
                onSceneReady={handleSceneReady}
              />
            </Suspense>

            <CameraFramer modelBox={modelBox} controlsRef={controlsRef} />

            {showGrid && (
              <gridHelper 
                args={
                  bgColor === "white" 
                    ? [30, 40, "#9ca3af", "#d1d5db"] 
                    : bgColor === "gray"
                    ? [30, 40, "#9ca3af", "#4b5563"]
                    : [30, 40, "#374151", "#1f2937"]
                } 
                position={[0, 0, 0]} 
              />
            )}

            <OrbitControls
              ref={controlsRef}
              makeDefault
              autoRotate={autoRotate}
              autoRotateSpeed={1.5}
              enableDamping
              dampingFactor={0.05}
              minDistance={0.5}
              maxDistance={20}
            />
          </Canvas>
        </CanvasErrorBoundary>
      </div>

      {/* Toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-gray-900/90 border border-gray-800/80 backdrop-blur-xl rounded-full shadow-2xl z-20">
        <button onClick={handleResetCamera} className="p-2.5 rounded-full text-gray-400 hover:text-cyan-400 hover:bg-gray-800/80 transition-all" title="Reset Camera">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button onClick={() => setWireframe(!wireframe)} title="Wireframe"
          className={`p-2.5 rounded-full transition-all ${wireframe ? "text-cyan-400 bg-cyan-950/40 border border-cyan-500/20" : "text-gray-400 hover:text-cyan-400 hover:bg-gray-800/80 border border-transparent"}`}>
          <Grid3X3 className="w-4 h-4" />
        </button>
        <button onClick={() => setAutoRotate(!autoRotate)} title="Auto Rotate"
          className={`p-2.5 rounded-full transition-all ${autoRotate ? "text-cyan-400 bg-cyan-950/40 border border-cyan-500/20" : "text-gray-400 hover:text-cyan-400 hover:bg-gray-800/80 border border-transparent"}`}>
          <Rotate3d className="w-4 h-4" />
        </button>
        <button onClick={() => setShowGrid(!showGrid)} title="Grid"
          className={`p-2.5 rounded-full transition-all ${showGrid ? "text-cyan-400 bg-cyan-950/40 border border-cyan-500/20" : "text-gray-400 hover:text-cyan-400 hover:bg-gray-800/80 border border-transparent"}`}>
          {showGrid ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>

        {/* Color Palette Inline */}
        <div className="flex items-center gap-1.5 px-2">
          <button
            onClick={() => setBgColor("dark")}
            title="Dark Background"
            className={`w-3.5 h-3.5 rounded-full border transition-all ${
              bgColor === "dark" ? "border-cyan-400 scale-110 shadow-lg" : "border-gray-700 hover:border-gray-500"
            }`}
            style={{ background: "linear-gradient(to bottom, #030712, #111827)" }}
          />
          <button
            onClick={() => setBgColor("black")}
            title="Black Background"
            className={`w-3.5 h-3.5 rounded-full border transition-all ${
              bgColor === "black" ? "border-cyan-400 scale-110 shadow-lg" : "border-gray-700 hover:border-gray-500"
            }`}
            style={{ backgroundColor: "#000000" }}
          />
          <button
            onClick={() => setBgColor("gray")}
            title="Gray Background"
            className={`w-3.5 h-3.5 rounded-full border transition-all ${
              bgColor === "gray" ? "border-cyan-400 scale-110 shadow-lg" : "border-gray-700 hover:border-gray-500"
            }`}
            style={{ backgroundColor: "#4b5563" }}
          />
          <button
            onClick={() => setBgColor("white")}
            title="White Background"
            className={`w-3.5 h-3.5 rounded-full border transition-all ${
              bgColor === "white" ? "border-cyan-400 scale-110 shadow-lg" : "border-gray-400 hover:border-gray-600"
            }`}
            style={{ backgroundColor: "#ffffff" }}
          />
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-700/60 mx-0.5" />

        {/* Download GLB button */}
        <button
          onClick={handleDownloadGLB}
          title="Download GLB"
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold text-gray-300 hover:text-white hover:bg-gray-800/80 border border-transparent transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          Download GLB
        </button>

        <button onClick={handleToggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          className="p-2.5 rounded-full text-gray-400 hover:text-cyan-400 hover:bg-gray-800/80 transition-all border border-transparent">
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Help tip */}
      <div className={`absolute top-4 left-4 pointer-events-none text-xs backdrop-blur-md px-3 py-1.5 rounded-lg z-10 select-none ${
        bgColor === "white" 
          ? "text-gray-600 bg-white/80 border border-gray-200 shadow-sm" 
          : "text-gray-500 bg-gray-950/40 border border-gray-900/40"
      }`}>
        Drag to Rotate • Scroll to Zoom • Right-click to Pan
      </div>
    </div>
  );
}

try { useGLTF.preload = () => {}; } catch {}
