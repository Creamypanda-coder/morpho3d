"use client";

import React, {
  useState, useRef, useEffect, Suspense, useCallback, useImperativeHandle, forwardRef
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  Rotate3d, RefreshCw, Grid3X3, Eye, EyeOff,
  Maximize2, Minimize2, Activity, AlertTriangle, Download
} from "lucide-react";
import ExportPanel, { type ExportHandlers } from "./ExportPanel";

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

/* ─── Export Bridge ─── */
// Lives inside Canvas so it can access useThree
export interface ExportBridgeHandle {
  captureFrame(w?: number, h?: number): string;
  getRenderer(): THREE.WebGLRenderer;
  getCamera(): THREE.Camera;
  getScene(): THREE.Scene;
}

const ExportBridge = forwardRef<ExportBridgeHandle>(function ExportBridge(_, ref) {
  const { gl, camera, scene } = useThree();
  useImperativeHandle(ref, () => ({
    captureFrame(w = 0, h = 0) {
      if (w && h) {
        gl.setSize(w, h);
        gl.render(scene, camera);
      }
      return gl.domElement.toDataURL("image/png");
    },
    getRenderer() { return gl; },
    getCamera() { return camera; },
    getScene() { return scene; },
  }));
  return null;
});

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

/* ─────────────────────────────────────────────────────
   Download helpers
   ───────────────────────────────────────────────────── */
function downloadBlob(data: BlobPart, filename: string, mime: string) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
function downloadDataURL(dataURL: string, filename: string) {
  const a = document.createElement("a"); a.href = dataURL; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

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
  const [showExport,    setShowExport]    = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  const containerRef   = useRef<HTMLDivElement>(null);
  const controlsRef    = useRef<any>(null);
  const exportBridgeRef = useRef<ExportBridgeHandle>(null);
  const modelSceneRef  = useRef<THREE.Group | null>(null);

  /* fullscreen sync */
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /* model path change → reset */
  useEffect(() => {
    setLoading(true); setLoadingError(null); setModelBox(null); setShowExport(false);
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

  /* ────────────────────────────────────────────
     EXPORT HANDLERS
     ──────────────────────────────────────────── */

  /* 3-D mesh exports via Three.js exporters */
  const exportGLB = async () => {
    const scene = modelSceneRef.current; if (!scene) throw new Error("No model loaded");
    const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js" as any);
    return new Promise<void>((res, rej) => {
      new GLTFExporter().parse(scene, (buf: ArrayBuffer) => {
        downloadBlob(buf, "model.glb", "model/gltf-binary"); res();
      }, rej, { binary: true });
    });
  };

  const exportGLTF = async () => {
    const scene = modelSceneRef.current; if (!scene) throw new Error("No model loaded");
    const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js" as any);
    return new Promise<void>((res, rej) => {
      new GLTFExporter().parse(scene, (json: object) => {
        downloadBlob(JSON.stringify(json, null, 2), "model.gltf", "model/gltf+json"); res();
      }, rej, { binary: false });
    });
  };

  const exportOBJ = async () => {
    const scene = modelSceneRef.current; if (!scene) throw new Error("No model loaded");
    const { OBJExporter } = await import("three/examples/jsm/exporters/OBJExporter.js" as any);
    const obj = new OBJExporter().parse(scene);
    downloadBlob(obj, "model.obj", "text/plain");
  };

  const exportSTL = async () => {
    const scene = modelSceneRef.current; if (!scene) throw new Error("No model loaded");
    const { STLExporter } = await import("three/examples/jsm/exporters/STLExporter.js" as any);
    const stl = new STLExporter().parse(scene, { binary: true });
    downloadBlob(stl, "model.stl", "application/octet-stream");
  };

  const exportPLY = async () => {
    const scene = modelSceneRef.current; if (!scene) throw new Error("No model loaded");
    const { PLYExporter } = await import("three/examples/jsm/exporters/PLYExporter.js" as any);
    return new Promise<void>((res) => {
      new PLYExporter().parse(scene, (result: ArrayBuffer | string) => {
        downloadBlob(result, "model.ply", "application/octet-stream"); res();
      }, { binary: true });
    });
  };

  const exportUSDZ = async () => {
    const scene = modelSceneRef.current;
    const bridge = exportBridgeRef.current;
    if (!scene || !bridge) throw new Error("No model loaded");
    const { USDZExporter } = await import("three/examples/jsm/exporters/USDZExporter.js" as any);
    const renderer = bridge.getRenderer();
    const exporter = new USDZExporter();
    const usdz = await exporter.parseAsync(scene, { ar: { anchoring: { type: "plane" } } });
    downloadBlob(usdz, "model.usdz", "model/vnd.usdz+zip");
  };

  /* Image exports */
  const exportPNG = () => {
    const bridge = exportBridgeRef.current; if (!bridge) throw new Error("Bridge not ready");
    const dataURL = bridge.captureFrame();
    downloadDataURL(dataURL, "model-render.png");
  };

  const exportJPEG = () => {
    const bridge = exportBridgeRef.current; if (!bridge) throw new Error("Bridge not ready");
    const renderer = bridge.getRenderer();
    const camera = bridge.getCamera();
    const scene = bridge.getScene();
    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL("image/jpeg", 0.95);
    downloadDataURL(dataURL, "model-render.jpg");
  };

  const exportPNG4K = async () => {
    const bridge = exportBridgeRef.current; if (!bridge) throw new Error("Bridge not ready");
    const renderer = bridge.getRenderer();
    const camera   = bridge.getCamera() as THREE.PerspectiveCamera;
    const scene    = bridge.getScene();
    const origW = renderer.domElement.width;
    const origH = renderer.domElement.height;
    const target = 2048;
    renderer.setSize(target, target);
    camera.aspect = 1; camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL("image/png");
    renderer.setSize(origW, origH);
    camera.aspect = origW / origH; camera.updateProjectionMatrix();
    downloadDataURL(dataURL, "model-4k.png");
  };

  /* WebM turntable */
  const exportWebM = async () => {
    const bridge = exportBridgeRef.current; if (!bridge) throw new Error("Bridge not ready");
    const canvas = bridge.getRenderer().domElement;
    if (!(canvas as any).captureStream) throw new Error("captureStream not supported in this browser");

    const stream = (canvas as any).captureStream(30);
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9" : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    const chunks: BlobPart[] = [];

    return new Promise<void>((res, rej) => {
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onerror = rej;
      recorder.onstop = () => {
        downloadBlob(new Blob(chunks, { type: "video/webm" }), "turntable.webm", "video/webm");
        // restore autoRotate
        if (controlsRef.current) controlsRef.current.autoRotate = autoRotate;
        res();
      };

      // Force rotation for 5 seconds at 72°/sec
      if (controlsRef.current) {
        controlsRef.current.autoRotate = true;
        controlsRef.current.autoRotateSpeed = 3.0;
      }
      recorder.start();
      setTimeout(() => recorder.stop(), 5000);
    });
  };

  /* Animated GIF turntable */
  const exportGIF = async () => {
    const bridge = exportBridgeRef.current;
    const controls = controlsRef.current;
    if (!bridge || !controls) throw new Error("Bridge not ready");

    const renderer = bridge.getRenderer();
    const camera   = bridge.getCamera();
    const scene    = bridge.getScene();

    // @ts-ignore
    const GIF = (await import("gif.js")).default;

    const W = Math.min(renderer.domElement.width,  480);
    const H = Math.min(renderer.domElement.height, 480);

    const gif = new GIF({
      workers: 4,
      quality: 8,
      width: W,
      height: H,
      workerScript: "/gif.worker.js",
      repeat: 0, // loop forever
    });

    const FRAMES = 36;       // 360° / 10° per frame
    const DELAY  = 80;       // ms between frames (≈12 fps)
    const savedAR = controls.autoRotate;
    controls.autoRotate = false;

    // Save current azimuth
    const savedAzimuth = controls.getAzimuthalAngle?.() ?? 0;

    // Offscreen canvas for downscaling
    const offscreen = document.createElement("canvas");
    offscreen.width = W; offscreen.height = H;
    const ctx = offscreen.getContext("2d")!;

    for (let i = 0; i < FRAMES; i++) {
      // Rotate by one step
      if (controls.setAzimuthalAngle) {
        controls.setAzimuthalAngle(savedAzimuth + (i / FRAMES) * Math.PI * 2);
        controls.update();
      }

      renderer.render(scene, camera);

      // Downscale to offscreen canvas
      ctx.drawImage(renderer.domElement, 0, 0, W, H);
      gif.addFrame(ctx, { copy: true, delay: DELAY });
    }

    controls.autoRotate = savedAR;

    return new Promise<void>((res, rej) => {
      gif.on("finished", (blob: Blob) => {
        downloadBlob(blob, "turntable.gif", "image/gif");
        res();
      });
      gif.on("error", rej);
      gif.render();
    });
  };

  const exportHandlers: ExportHandlers = {
    exportGLB, exportGLTF, exportOBJ, exportSTL, exportPLY, exportUSDZ,
    exportPNG, exportJPEG, exportPNG4K, exportWebM, exportGIF,
  };

  /* ─────────────────────────────────────────────
     RENDER
     ───────────────────────────────────────────── */
  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-gradient-to-b from-gray-950 to-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col ${
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

      {/* Export Panel (overlay) */}
      {showExport && (
        <ExportPanel onClose={() => setShowExport(false)} handlers={exportHandlers} />
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
              <shadowMaterial opacity={0.3} />
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
            <ExportBridge ref={exportBridgeRef} />

            {showGrid && <gridHelper args={[30, 40, "#374151", "#1f2937"]} position={[0, 0, 0]} />}

            <OrbitControls
              ref={controlsRef}
              makeDefault
              autoRotate={autoRotate}
              autoRotateSpeed={1.5}
              enableDamping
              dampingFactor={0.05}
              minDistance={0.5}
              maxDistance={20}
              maxPolarAngle={Math.PI / 2.05}
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

        {/* Divider */}
        <div className="w-px h-5 bg-gray-700/60 mx-0.5" />

        {/* Export button */}
        <button
          onClick={() => setShowExport(!showExport)}
          title="Export Model"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all ${
            showExport
              ? "text-white bg-gradient-to-r from-cyan-500/30 to-violet-500/30 border border-cyan-500/30"
              : "text-gray-300 hover:text-white hover:bg-gray-800/80 border border-transparent"
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>

        <button onClick={handleToggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          className="p-2.5 rounded-full text-gray-400 hover:text-cyan-400 hover:bg-gray-800/80 transition-all border border-transparent">
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Help tip */}
      <div className="absolute top-4 left-4 pointer-events-none text-xs text-gray-500 bg-gray-950/40 border border-gray-900/40 backdrop-blur-md px-3 py-1.5 rounded-lg z-10 select-none">
        Drag to Rotate • Scroll to Zoom • Right-click to Pan
      </div>
    </div>
  );
}

try { useGLTF.preload = () => {}; } catch {}
