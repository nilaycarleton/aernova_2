"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { fitObjectToViewer } from "@/lib/viewer-fit";

/**
 * The homeowner's own roof, in 3D — orbit, pan, zoom, and nothing else.
 *
 * Not `MeasureViewer` with the tools hidden. That component exists to *edit*
 * a model — draft points, BVH raycasting for picking, undo/redo, an
 * always-listening pointer pipeline for placing measurements — and every one
 * of those is attack surface and bundle weight this page has no use for. A
 * homeowner on a phone gets the same GLTFLoader/DRACOLoader/OrbitControls
 * core `MeasureViewer` uses and stops there.
 *
 * Stays dark regardless of the paper page around it, same reasoning
 * DESIGN.md's Dark-Instrument Rule gives `MeasureViewer` itself: a live 3D
 * surface is an instrument panel, not a document, and it reads as one
 * embedded object rather than fighting the page's own theme.
 */
export function HubModelViewer({ glbUrl }: { glbUrl: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.replaceChildren();
    setLoadState("loading");

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0b1418");
    const camera = new THREE.PerspectiveCamera(34, host.clientWidth / host.clientHeight, 0.1, 1000);
    camera.position.set(0, -44, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    // Let the canvas own touch gestures (orbit/pinch) instead of the browser
    // scrolling/zooming the page over it.
    renderer.domElement.style.touchAction = "none";
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 8;
    controls.maxDistance = 120;

    scene.add(new THREE.AmbientLight("#ffffff", 1.1));
    scene.add(new THREE.HemisphereLight("#ffffff", "#1e293b", 2.4));
    const sun = new THREE.DirectionalLight("#ffffff", 2.4);
    sun.position.set(-16, -20, 34);
    scene.add(sun);

    const group = new THREE.Group();
    scene.add(group);

    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath("/draco/");
    loader.setDRACOLoader(draco);
    loader.load(
      glbUrl,
      (gltf) => {
        gltf.scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial && material.map) {
              material.map.colorSpace = THREE.SRGBColorSpace;
            }
          });
        });
        group.add(gltf.scene);
        fitObjectToViewer(group);
        draco.dispose();
        setLoadState("ready");
      },
      undefined,
      () => {
        draco.dispose();
        setLoadState("error");
      }
    );

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
        if ("geometry" in object && object.geometry instanceof THREE.BufferGeometry) {
          object.geometry.dispose();
        }
        if ("material" in object) {
          const material = (object as THREE.Mesh).material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else if (material instanceof THREE.Material) material.dispose();
        }
      });
      host.replaceChildren();
    };
  }, [glbUrl]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-paper-rule">
      <div ref={hostRef} className="h-full w-full" />
      {loadState === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0b1418] text-sm text-white/70">
          Loading your roof…
        </div>
      ) : null}
      {loadState === "error" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0b1418] px-6 text-center text-sm text-white/70">
          Couldn&rsquo;t load the 3D model right now — everything else on this page still works.
        </div>
      ) : null}
    </div>
  );
}
