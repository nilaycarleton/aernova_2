"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PhotogrammetryModelPackage } from "@/lib/photogrammetry-pipeline";
import { fitObjectToViewer } from "@/lib/viewer-fit";

type Props = {
  modelPackage: PhotogrammetryModelPackage | null;
  previewUrl: string | null;
  sourceImageCount: number;
};

type ViewMode = "model" | "top";

function loadProcessedGlb(
  group: THREE.Group,
  glbUrl: string,
  callbacks: {
    onProgress: (percent: number) => void;
    onReady: () => void;
    onError: (message: string) => void;
  }
) {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");
  loader.setDRACOLoader(dracoLoader);
  loader.load(
    glbUrl,
    (gltf) => {
      const root = gltf.scene;
      root.traverse((object) => {
        if (!("material" in object)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (!(material instanceof THREE.MeshStandardMaterial) && !(material instanceof THREE.MeshPhysicalMaterial)) return;
          if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
          material.roughness = Math.max(material.roughness ?? 0.6, 0.55);
          material.needsUpdate = true;
        });
      });
      fitObjectToViewer(root);
      group.add(root);
      dracoLoader.dispose();
      callbacks.onReady();
    },
    (event) => {
      if (event.total > 0) callbacks.onProgress(Math.round((event.loaded / event.total) * 100));
    },
    (error) => {
      dracoLoader.dispose();
      callbacks.onError(error instanceof Error ? error.message : "Could not load the 3D model");
    }
  );
}

export function ModelMeasurementViewer({ modelPackage, previewUrl }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewMode>("model");
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const ready = modelPackage?.processingTask?.status === "complete";
  const glbUrl =
    ready && modelPackage?.assets.viewerGlb?.startsWith("/")
      ? modelPackage.assets.viewerGlb
      : ready && modelPackage?.assets.texturedModelGlb?.startsWith("/")
        ? modelPackage.assets.texturedModelGlb
        : null;
  const topDownUrl = modelPackage?.assets.orthomosaic?.startsWith("/") ? modelPackage.assets.orthomosaic : null;

  useEffect(() => {
    if (view !== "model") return;
    const host = hostRef.current;
    if (!host || !glbUrl) return;

    host.replaceChildren();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0b1418");

    const camera = new THREE.PerspectiveCamera(34, host.clientWidth / host.clientHeight, 0.1, 1000);
    camera.position.set(0, -44, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.setAttribute("data-testid", "roof-3d-viewer");
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = false;
    controls.minDistance = 10;
    controls.maxDistance = 90;

    // Bright, even lighting so the textured roof reads clearly from any angle.
    scene.add(new THREE.AmbientLight("#ffffff", 1.1));
    scene.add(new THREE.HemisphereLight("#ffffff", "#1e293b", 2.4));
    const sun = new THREE.DirectionalLight("#ffffff", 2.8);
    sun.position.set(-16, -20, 34);
    scene.add(sun);
    const fill = new THREE.DirectionalLight("#dbeafe", 1.4);
    fill.position.set(20, 18, 22);
    scene.add(fill);

    const group = new THREE.Group();
    scene.add(group);

    setLoadState("loading");
    setProgress(0);
    setError("");
    loadProcessedGlb(group, glbUrl, {
      onProgress: setProgress,
      onReady: () => {
        setLoadState("ready");
        setProgress(100);
      },
      onError: (message) => {
        setLoadState("error");
        setError(message);
      },
    });

    const resizeObserver = new ResizeObserver(() => {
      if (!host.clientWidth || !host.clientHeight) return;
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    });
    resizeObserver.observe(host);

    let frame = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        if ("geometry" in object && object.geometry instanceof THREE.BufferGeometry) object.geometry.dispose();
        if ("material" in object) {
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else if (material instanceof THREE.Material) material.dispose();
        }
      });
      host.replaceChildren();
    };
  }, [glbUrl, view]);

  return (
    <div className="min-w-0">
      {glbUrl && topDownUrl ? (
        <div className="mb-3 inline-flex rounded-xl border border-white/10 bg-slate-950/50 p-1 text-sm">
          <button
            type="button"
            onClick={() => setView("model")}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${view === "model" ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:text-white"}`}
          >
            3D model
          </button>
          <button
            type="button"
            onClick={() => setView("top")}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${view === "top" ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:text-white"}`}
          >
            Top-down photo
          </button>
        </div>
      ) : null}

      <div className="relative min-h-[480px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b1418] sm:min-h-[560px]">
        {view === "top" && topDownUrl ? (
          <img src={topDownUrl} alt="Top-down view of the roof" className="h-full w-full object-contain" />
        ) : glbUrl ? (
          <>
            <div ref={hostRef} className="absolute inset-0" />
            {loadState !== "ready" ? (
              <div className="pointer-events-none absolute inset-x-4 top-4 rounded-xl border border-white/10 bg-slate-950/80 p-3 text-sm text-slate-200 backdrop-blur">
                {loadState === "error" ? (
                  <p className="text-rose-200">Couldn&apos;t load the 3D model. {error}</p>
                ) : (
                  <>
                    <p className="font-medium text-white">Loading your 3D model… {progress}%</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center p-8 text-center">
            {/* Decorative backdrop behind the empty-state message; alt="" is intentional. */}
            {previewUrl ? (
              <img src={previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
            ) : null}
            <div className="relative">
              <p className="text-lg font-medium text-white">Your 3D roof model will appear here</p>
              <p className="mt-2 max-w-sm text-sm text-slate-400">
                Build the model in step 2, then come back to spin it around and measure the roof.
              </p>
            </div>
          </div>
        )}
      </div>

      {glbUrl && view === "model" ? (
        <p className="mt-2 text-xs text-ink-muted">
          Drag to rotate · scroll to zoom. Use the measurement tool below to measure the roof.
        </p>
      ) : null}
    </div>
  );
}
