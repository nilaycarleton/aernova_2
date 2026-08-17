/**
 * Shared low-level Three.js scene bootstrap for Aernova's two viewers
 * (`MeasureViewer`, `HubModelViewer`) — the part that was byte-for-byte
 * duplicated between them before Phase 7: scene/camera/renderer/lights,
 * GLTF+DRACO loading, resize handling, the render loop, and disposal.
 *
 * Deliberately does NOT own: CSS2D labels, raycasting/picking, pointer
 * gesture handling, or measurement graphics — those stay in
 * `measure-viewer.tsx` because they exist only for the authenticated
 * editing instrument, not the read-only Hub viewer (Phase 7 Step 89: this
 * module sits *below* both viewers, neither viewer sits inside the other).
 *
 * Everything here is DOM/THREE side-effecting setup, not pure logic — per
 * Phase 7 Step 91 that's expected; the pure decisions it depends on
 * (DPR clamp, WebGL capability) live in `webgl-capability.ts` and are
 * unit-tested there instead.
 */
"use client";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { computeDpr } from "@/components/viewer/webgl-capability";

export const INSTRUMENT_BACKGROUND = "#0b1418";

/** The viewer's starting framing shot — shared by initial camera setup and the "Reset view" camera flight, so the two can never silently drift apart. */
export const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, -44, 30);
export const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

export type SceneCore = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  group: THREE.Group;
  /** Starts the RAF loop. `extraRender` runs after the main scene render each frame (e.g. a CSS2DRenderer pass) — kept as a hook rather than a second owner of the loop (Step 41: no duplicate RAF loops per scene). */
  startLoop: (extraRender?: () => void) => void;
  stopLoop: () => void;
  /** Wires one ResizeObserver on `host`. `onResize` runs after the core keeps camera/renderer in sync, for viewer-local extras (label renderer size, line-material resolution). */
  observeResize: (host: HTMLElement, onResize?: (width: number, height: number) => void) => void;
  disconnectResize: () => void;
  loadModel: (
    url: string,
    handlers: {
      onLoaded: (root: THREE.Group) => void;
      onError: (error: unknown) => void;
    }
  ) => void;
  /** Disposes renderer/controls/scene resources this module owns. Does not touch caller-owned resources (BVH bounds trees, CSS2D DOM nodes, event listeners) — those are the owning viewer's responsibility. */
  disposeCore: () => void;
};

/**
 * Builds and mounts the renderer into `host`, wires standard lighting and
 * `OrbitControls`, and returns handles + lifecycle helpers. Call once per
 * mount effect; the caller's cleanup must call `stopLoop`, `disconnectResize`,
 * and `disposeCore` (in that order, same as both viewers already did before
 * extraction).
 */
export function createSceneCore(host: HTMLElement): SceneCore {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(INSTRUMENT_BACKGROUND);
  const camera = new THREE.PerspectiveCamera(34, host.clientWidth / host.clientHeight, 0.1, 1000);
  camera.position.copy(DEFAULT_CAMERA_POSITION);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(computeDpr(window.devicePixelRatio));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  // The canvas owns touch gestures (orbit/pinch/tap) instead of the browser
  // scrolling/zooming the page over it.
  renderer.domElement.style.touchAction = "none";
  host.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = false;
  controls.minDistance = 8;
  controls.maxDistance = 120;

  scene.add(new THREE.AmbientLight("#ffffff", 1.1));
  scene.add(new THREE.HemisphereLight("#ffffff", "#1e293b", 2.4));
  const sun = new THREE.DirectionalLight("#ffffff", 2.4);
  sun.position.set(-16, -20, 34);
  scene.add(sun);

  const group = new THREE.Group();
  scene.add(group);

  let frame = 0;
  let looping = false;
  const startLoop: SceneCore["startLoop"] = (extraRender) => {
    if (looping) return; // guard against StrictMode double-invoke starting a second loop
    looping = true;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      extraRender?.();
      frame = requestAnimationFrame(animate);
    };
    animate();
  };
  const stopLoop: SceneCore["stopLoop"] = () => {
    looping = false;
    cancelAnimationFrame(frame);
  };

  let resizeObserver: ResizeObserver | null = null;
  const observeResize: SceneCore["observeResize"] = (observedHost, onResize) => {
    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver(() => {
      if (!observedHost.clientWidth || !observedHost.clientHeight) return;
      camera.aspect = observedHost.clientWidth / observedHost.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(observedHost.clientWidth, observedHost.clientHeight);
      onResize?.(observedHost.clientWidth, observedHost.clientHeight);
    });
    resizeObserver.observe(observedHost);
  };
  const disconnectResize: SceneCore["disconnectResize"] = () => {
    resizeObserver?.disconnect();
    resizeObserver = null;
  };

  const loadModel: SceneCore["loadModel"] = (url, { onLoaded, onError }) => {
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath("/draco/");
    loader.setDRACOLoader(draco);
    loader.load(
      url,
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
        draco.dispose();
        onLoaded(gltf.scene);
      },
      undefined,
      (err) => {
        draco.dispose();
        onError(err);
      }
    );
  };

  const disposeCore: SceneCore["disposeCore"] = () => {
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
  };

  return { scene, camera, renderer, controls, group, startLoop, stopLoop, observeResize, disconnectResize, loadModel, disposeCore };
}

/**
 * `webglcontextlost`/`webglcontextrestored` are rare but must not strand the
 * user on a frozen canvas (Phase 7 Step 40). Returns an unsubscribe function.
 * The RAF loop keeps running harmlessly while lost (WebGL no-ops draw calls),
 * so this only needs to notify the caller to show/hide the transient banner —
 * it does not itself pause/resume the loop or rebuild the renderer.
 */
export function observeContextLoss(
  renderer: THREE.WebGLRenderer,
  handlers: { onLost: () => void; onRestored: () => void }
): () => void {
  const canvas = renderer.domElement;
  const onLost = (event: Event) => {
    event.preventDefault(); // tells the browser we intend to handle recovery
    handlers.onLost();
  };
  const onRestored = () => handlers.onRestored();
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  return () => {
    canvas.removeEventListener("webglcontextlost", onLost);
    canvas.removeEventListener("webglcontextrestored", onRestored);
  };
}
