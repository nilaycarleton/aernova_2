"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from "three-mesh-bvh";
import { fitObjectToViewer } from "@/lib/viewer-fit";
import { buildFacetFillGeometry } from "@/lib/facet-overlay-geometry";
import { splitFacetPolygon } from "@/lib/facet-split";
import { createSceneCore, observeContextLoss, DEFAULT_CAMERA_POSITION, DEFAULT_CAMERA_TARGET } from "@/components/viewer/scene-core";
import { detectWebglSupport } from "@/components/viewer/webgl-capability";
import { markFirstFrame, markModelLoaded, startViewerPerf } from "@/components/viewer/viewer-perf";
import type { ViewerAnimeController } from "@/components/viewer/anime-scene";
import { LayoutContent } from "@astryxdesign/core/Layout";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { SPLIT_INSPECTOR_BREAKPOINT_PX } from "@/lib/split-inspector";

// Accelerate raycasts against the full-res GLB (257k triangles): a BVH turns
// each pick/edit-drag from an O(n) triangle scan into ~O(log n). Patched onto
// THREE globally; acceleratedRaycast falls back to the default when a mesh has
// no boundsTree, so other viewers are unaffected.
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;
import {
  autoDetectRoofFacetsAction,
  classifyRoofEdgesAction,
  clearModelMeasurementsAction,
  deleteModelMeasurementAction,
  replaceModelMeasurementsAction,
  saveModelMeasurementAction,
  updateModelMeasurementCategoryAction,
  type LineCategory,
  type ModelMeasurementKind,
} from "@/app/(dashboard)/jobs/[jobId]/model-measurement-actions";
import {
  distance,
  formatArea,
  formatLength,
  pitchFromNormal,
  polygonArea3D,
  polygonNormal,
  polygonPerimeter,
  polygonProjectedArea,
  polylineLength,
  roofSquares,
  verticalDrop,
  type Pt,
  type Units,
} from "@/lib/measure-geometry";

type MeasureTool = "distance" | "area" | "height" | "marker";
// "detect" boxes a region and auto-fills facets; "edit" drags existing vertices;
// "split" cuts a facet in two along a drawn line.
type Tool = "orbit" | MeasureTool | "detect" | "edit" | "split";
type LoadState = "loading" | "ready" | "error" | "unsupported";
const SPLIT_COLOR = 0xffffff;

type Measurement = {
  id: string;
  type: MeasureTool;
  points: Pt[]; // model metres
  label?: string;
  category?: LineCategory | null;
  // Server-authoritative area (ft²) for auto-detected facets. When set, the label
  // uses it instead of recomputing from `points` (whose boundary loop can self-
  // intersect and collapse to ~0). Cleared when the shape is edited.
  areaSqft?: number | null;
};

const LINE_CATEGORIES: LineCategory[] = ["ridge", "hip", "valley", "eave", "rake"];
const DETECT_COLOR = 0xfacc15; // yellow ROI box
// Distinct hues so adjacent roof facets read as separate planes, not one blob.
const AREA_PALETTE = [0x34d399, 0x38bdf8, 0xa78bfa, 0xf472b6, 0xfbbf24, 0x22d3ee, 0x4ade80, 0xfb923c];

// Precision vertex markers — small enough that the roof feature underneath
// (a shingle edge, a ridge line) stays visible, instead of the old handles
// that were large enough to hide the exact point they marked. Sized in model
// metres, not pixels: these are simple world-space spheres, so they scale
// with the roof surface the way a physical survey pin would, never ballooning
// relative to the roof as the camera moves in. A saved vertex is a fixed dot;
// an edit-mode handle is the same dot slightly larger since it's the thing
// you're meant to grab (its actual pointer/touch target is far bigger still —
// see pickHandleScreen, a pure screen-space test unrelated to this radius).
const DOT_RADIUS = 0.045;
const HANDLE_RADIUS = 0.065;
const MARKER_OUTLINE_SCALE = 1.55;
const MARKER_OUTLINE_COLOR = 0x0a0f1a; // near-black ring so the dot reads on any roof color

export type SavedMeasurement = {
  id: string;
  kind: ModelMeasurementKind;
  points: Pt[];
  label?: string | null;
  category?: LineCategory | null;
  areaSqft?: number | null;
};

type Props = {
  glbUrl: string;
  jobId: string;
  modelImageryId: string;
  initialMeasurements?: SavedMeasurement[];
};

const TOOL_META: Record<MeasureTool, { name: string; color: number; min: number }> = {
  distance: { name: "Distance", color: 0x38bdf8, min: 2 },
  area: { name: "Area", color: 0x34d399, min: 3 },
  height: { name: "Height", color: 0xf59e0b, min: 2 },
  marker: { name: "Marker", color: 0xf43f5e, min: 1 },
};

const FT2_PER_M2 = 10.7639104167;

// Human-readable value(s) for a completed measurement, given a unit system.
function summarize(m: Measurement, units: Units): string {
  if (m.type === "distance") return formatLength(polylineLength(m.points), units);
  if (m.type === "height") return formatLength(verticalDrop(m.points[0], m.points[1]), units);
  if (m.type === "marker") return m.label || "Marker";
  // area — prefer the server's triangle-summed figures for auto-detected facets:
  // their boundary loop can self-intersect on noisy meshes, collapsing both the
  // recomputed area (→ ~0) and the recomputed pitch. The server area is carried on
  // areaSqft (ft²) and the pitch in the "Auto N/12" label.
  if (typeof m.areaSqft === "number") {
    const surface = m.areaSqft / FT2_PER_M2;
    const ratio = m.label?.match(/\d+\/12/)?.[0] ?? pitchFromNormal(polygonNormal(m.points)).ratio;
    return `${formatArea(surface, units)} · ${roofSquares(surface)} sq · ${ratio}`;
  }
  const surface = polygonArea3D(m.points);
  const pitch = pitchFromNormal(polygonNormal(m.points));
  return `${formatArea(surface, units)} · ${roofSquares(surface)} sq · ${pitch.ratio}`;
}

function makeLabel(text: string, className: string): CSS2DObject {
  const el = document.createElement("div");
  el.className = className;
  el.textContent = text;
  return new CSS2DObject(el);
}

// The measurement readout itself — Instrument Cyan per DESIGN.md's Readout
// Rule ("the colour of a number you can act on, nothing else"). This is the
// one text role in the viewer that's a confirmed reading, not UI chrome.
const LABEL_CLASS =
  "pointer-events-none rounded-md border border-hairline bg-ground/85 px-1.5 py-0.5 text-xs font-medium tabular-nums text-instrument-fg shadow";

/**
 * A precision vertex dot: a tiny core sphere in the tool/facet color, with a
 * thin dark outline sphere behind it so the center reads clearly against any
 * roof color (black, white, red, brown, grey, grass). Both spheres share the
 * marker's position exactly — there is no offset, so the visible center is
 * always the real measurement coordinate. depthTest is off so the dot never
 * disappears into the mesh it's sitting on.
 */
function makePrecisionDot(color: number, radius: number = DOT_RADIUS): THREE.Group {
  const group = new THREE.Group();
  const outline = new THREE.Mesh(
    new THREE.SphereGeometry(radius * MARKER_OUTLINE_SCALE, 10, 8),
    new THREE.MeshBasicMaterial({ color: MARKER_OUTLINE_COLOR, depthTest: false })
  );
  outline.renderOrder = 998;
  const core = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), new THREE.MeshBasicMaterial({ color, depthTest: false }));
  core.renderOrder = 999;
  group.add(outline, core);
  return group;
}

// Cached per-color "+" glyph textures for the active-drawing point marker —
// built once per color and reused across every redraw instead of allocating a
// canvas per click. A flat cross needs to face the camera to read as a "+"
// from any angle, so it's a camera-facing Sprite rather than world-space
// geometry (the precision dots above don't need this: a sphere already looks
// the same from every angle).
const plusTextureCache = new Map<number, THREE.CanvasTexture>();
function getPlusTexture(color: number): THREE.CanvasTexture {
  const cached = plusTextureCache.get(color);
  if (cached) return cached;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  const arm = size * 0.34;
  ctx.lineCap = "round";
  // Dark outline stroke first for contrast, then the tool-color stroke on top,
  // thinner — the same outline-then-core idea as the precision dot above.
  ctx.strokeStyle = "rgba(10, 15, 26, 0.85)";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(c - arm, c);
  ctx.lineTo(c + arm, c);
  ctx.moveTo(c, c - arm);
  ctx.lineTo(c, c + arm);
  ctx.stroke();
  ctx.strokeStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(c - arm, c);
  ctx.lineTo(c + arm, c);
  ctx.moveTo(c, c - arm);
  ctx.lineTo(c, c + arm);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  plusTextureCache.set(color, texture);
  return texture;
}

/**
 * The active-drawing point marker: a small camera-facing "+" whose exact
 * intersection is the point being placed. sizeAttenuation is off so it stays
 * a small, constant, legible mark on screen rather than ballooning as the
 * camera moves in close — the roof detail underneath should always win.
 */
function makePlusMarker(color: number): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: getPlusTexture(color),
    depthTest: false,
    sizeAttenuation: false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.05, 0.05, 1);
  sprite.renderOrder = 999;
  return sprite;
}

/**
 * Build the on-model graphics for one measurement (fill/outline/dots/label).
 * Shared by the committed render and the live edit-drag so a dragged shape
 * updates identically. Returns the group plus its LineMaterials (need viewport
 * resolution kept in sync).
 */
function buildMeasurementGraphics(
  m: Measurement,
  color: number,
  units: Units,
  resolution: [number, number],
  showLabel: boolean
): { group: THREE.Group; mats: LineMaterial[] } {
  const group = new THREE.Group();
  const mats: LineMaterial[] = [];
  const local = m.points.map((p) => new THREE.Vector3(...p));

  const addOutline = (pts: THREE.Vector3[], width: number) => {
    const geo = new LineGeometry();
    geo.setPositions(pts.flatMap((v) => [v.x, v.y, v.z]));
    const mat = new LineMaterial({ color, linewidth: width, transparent: true });
    mat.resolution.set(resolution[0], resolution[1]);
    mats.push(mat);
    group.add(new Line2(geo, mat));
  };

  if (m.type === "area" && local.length >= 3) {
    const fill = buildFacetFillGeometry(m.points, polygonNormal(m.points), 0.05);
    group.add(new THREE.Mesh(fill, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })));
    addOutline([...local, local[0]], 3);
  } else if (m.type === "marker") {
    const dot = makePrecisionDot(color);
    dot.position.copy(local[0]);
    group.add(dot);
  } else if (local.length >= 2) {
    for (const v of [local[0], local[local.length - 1]]) {
      const dot = makePrecisionDot(color);
      dot.position.copy(v);
      group.add(dot);
    }
    addOutline(local, 3);
  }

  if (showLabel) {
    const label = makeLabel(summarize(m, units), LABEL_CLASS);
    label.position.copy(local[Math.floor((local.length - 1) / 2)] ?? local[0]);
    group.add(label);
  }
  return { group, mats };
}

function colorForMeasurement(m: Measurement, areaIndex: number): number {
  return m.type === "area" ? AREA_PALETTE[areaIndex % AREA_PALETTE.length] : TOOL_META[m.type].color;
}

// Free a group's children (GPU geometry/materials + label DOM nodes), then empty
// it. THREE's group.clear() only detaches — it never releases these resources.
function disposeAndClear(group: THREE.Group) {
  group.traverse((o) => {
    if (o instanceof CSS2DObject) o.element.remove();
    if (o instanceof THREE.Sprite) {
      // Sprite.geometry is a single shared static instance reused by every
      // THREE.Sprite in the app — disposing it here would corrupt every other
      // sprite that gets created afterward. Only the material (unique per
      // marker) is ours to dispose; its cached "+" texture is deliberately
      // shared/reused too, so it isn't touched either.
      o.material.dispose();
      return;
    }
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose?.();
    const mat = mesh.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else if (mat instanceof THREE.Material) mat.dispose();
  });
  group.clear();
}

export function MeasureViewer({ glbUrl, jobId, modelImageryId, initialMeasurements = [] }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Full-screen overlay + its auto-hiding chrome (toolbar + measurements list).
  const outerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const hoveringChromeRef = useRef(false);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [contextLost, setContextLost] = useState(false);
  const [tool, setTool] = useState<Tool>("orbit");
  const [units, setUnits] = useState<Units>("imperial");
  const [measurements, setMeasurements] = useState<Measurement[]>(() =>
    initialMeasurements.map((m) => ({
      id: m.id,
      type: m.kind,
      points: m.points,
      label: m.label ?? undefined,
      category: m.category ?? null,
      areaSqft: m.areaSqft ?? null,
    }))
  );
  const [draftCount, setDraftCount] = useState(0);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState("");
  const [classifying, setClassifying] = useState(false);
  const [splitError, setSplitError] = useState("");
  // Hand-measuring tools wait behind "More tools" so Auto-detect + Edit points —
  // the path a roofer actually follows — lead. See the scan-tab redesign.
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Per-face value labels ("381 ft² · 3.8 sq · 4/12") can crowd a busy roof, so
  // they can be hidden — but always come back while editing points, when you need
  // to see what a nudge does to the number.
  const [hideLabels, setHideLabels] = useState(false);
  // Fill-the-browser mode for close viewing/editing. A CSS overlay (not the native
  // Fullscreen API) keeps the canvas mounted and the toolbar usable; Esc exits.
  const [fullscreen, setFullscreen] = useState(false);
  // In full screen the chrome auto-hides (YouTube-style): visible on mouse move,
  // gone after a short idle so the model owns the screen.
  const [controlsVisible, setControlsVisible] = useState(true);
  // Non-fullscreen inspector (Measurements panel): a stable side panel at/above
  // the SplitInspector breakpoint, a bottom sheet below it (Phase 7 Step 31-33).
  // Starts open on desktop-class viewports (matches the pre-Phase-7 always-
  // visible sidebar) and closed on mobile/tablet, where a sheet permanently
  // covering the canvas on first paint would fight Step 32's "canvas remains
  // visible enough to maintain context." Full-screen mode keeps its own
  // existing floating overlay panel instead — untouched by this.
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  // Composed from Astryx `Layout`/`Dialog` directly rather than through
  // `components/ui/split-inspector.tsx`'s `SplitInspector` wrapper — a real
  // bug found live in this phase, not a style preference. `SplitInspector`
  // starts its internal `isSplit` at `false` and flips it to `true` after
  // its own mount effect reads `matchMedia`; that flip switches its return
  // between a bare `<>{main}...` fragment and `<Layout content={main}>`,
  // two structurally different parents for the same `main` element. React
  // remounts `main`'s entire DOM subtree across that swap — fine for
  // ordinary content, but fatal here: the canvas host div this component's
  // own mount effect (below) attached a `WebGLRenderer` to gets silently
  // replaced with a fresh, empty node, and nothing re-runs the effect
  // (its `[glbUrl]` dependency never changed) to reattach to it. Observed
  // live: the toolbar renders, the loading banner never clears, and the
  // orphaned renderer + RAF loop keeps running against a detached canvas
  // forever — a real memory/GPU leak on every mount, invisible until you
  // check `document.querySelectorAll('canvas')`. Composing `Layout` here
  // directly keeps the canvas panel inside the exact same `content` slot
  // regardless of `isSplit`, so its DOM node never moves. Zero new Astryx
  // swizzles — this reaches for the same underlying primitives
  // `SplitInspector` itself wraps, not a patched copy of the component.
  const [isSplit, setIsSplit] = useState(false);
  // Phase 8: "Clear all" wipes every measurement in one irreversible-feeling
  // action with no confirmation — an Impeccable P2 from Phase 7. Undo already
  // exists, but it's not surfaced at the point of the action, so a mis-tap
  // still reads as data loss. Astryx AlertDialog is the established
  // destructive-confirmation pattern (see DESIGN.md); this is the first real
  // feature consumer of it outside the internal design-system showcase.
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  // Undo/redo: snapshots of the measurement list, pushed/popped imperatively
  // (not via setState — a full history array doesn't need to be render state).
  // canUndo/canRedo are real state, set at the same call sites the stacks are
  // mutated at, rather than derived by reading the refs' `.length` during
  // render — the compiler can't verify a ref read during render stays safe
  // across a phantom/interrupted render, even though these particular refs
  // are only ever touched from event handlers.
  const undoStackRef = useRef<Measurement[][]>([]);
  const redoStackRef = useRef<Measurement[][]>([]);
  const snapshotRef = useRef<() => void>(() => {});
  const hoveredRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Imperative scene handles shared across effects/handlers.
  const groupRef = useRef<THREE.Group | null>(null);
  const committedRef = useRef<THREE.Group | null>(null);
  const draftRef = useRef<THREE.Group | null>(null);
  const pickTargetsRef = useRef<THREE.Mesh[]>([]);
  const draftPtsRef = useRef<Pt[]>([]);
  const toolRef = useRef<Tool>(tool);
  const unitsRef = useRef<Units>(units);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animeControllerRef = useRef<ViewerAnimeController | null>(null);
  // Thick-line materials need the viewport size; track it and keep them in sync.
  const lineMatsRef = useRef<LineMaterial[]>([]);
  const sizeRef = useRef<[number, number]>([1, 1]);
  // Edit mode: draggable vertex handles + live-drag state.
  const handlesGroupRef = useRef<THREE.Group | null>(null);
  const dragDraftRef = useRef<THREE.Group | null>(null);
  const handleMeshesRef = useRef<THREE.Object3D[]>([]);
  const committedMapRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const colorMapRef = useRef<Map<string, number>>(new Map());
  const measurementsRef = useRef<Measurement[]>(measurements);
  const dragRef = useRef<{ id: string; index: number; handle: THREE.Object3D; point: Pt } | null>(null);

  // Kept in sync after every commit (not during render) so the Three.js
  // pointer handlers set up once in the mount effect below can read the
  // latest tool/units/measurements without stale closures or needing to be
  // torn down and rebuilt on every render.
  useEffect(() => {
    toolRef.current = tool;
    unitsRef.current = units;
    measurementsRef.current = measurements;
  });

  // Labels show when not hidden, and always while editing (you need the number
  // to judge a nudge). Derived so the commit effect rebuilds only when it flips.
  const labelsVisible = hideLabels ? tool === "edit" : true;

  // Live split-viewport tracking (same source of truth SplitInspector uses,
  // lib/split-inspector.ts's isSplitViewport). Split state changes the
  // `end`/`Dialog` slots only, never the canvas panel's position in the tree
  // — see the isSplit comment above. The inspector's default open state is
  // set once from the same first reading, then left to the user's own
  // toggle — resizing across the breakpoint later shouldn't silently
  // reopen/close a panel the user already set.
  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${SPLIT_INSPECTOR_BREAKPOINT_PX}px)`);
    const applyState = () => setIsSplit(query.matches);
    const applyDefaultOpenState = () => setIsInspectorOpen(query.matches);
    applyState();
    applyDefaultOpenState();
    query.addEventListener("change", applyState);
    return () => query.removeEventListener("change", applyState);
  }, []);

  // ---- Scene lifecycle (mount once per model) -------------------------------
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !glbUrl) return;
    host.replaceChildren();
    setContextLost(false);

    const reportUnsupported = () => setLoadState("unsupported");
    if (detectWebglSupport() === "unsupported") {
      reportUnsupported();
      return;
    }

    const perf = startViewerPerf("measure-viewer");
    const core = createSceneCore(host);
    const { scene, camera, renderer, controls, group } = core;
    cameraRef.current = camera;
    controlsRef.current = controls;
    sizeRef.current = [host.clientWidth, host.clientHeight];
    renderer.domElement.setAttribute("data-testid", "measure-viewer");

    // Separate CSS2D layer for crisp HTML measurement labels.
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(host.clientWidth, host.clientHeight);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.inset = "0";
    labelRenderer.domElement.style.pointerEvents = "none";
    host.appendChild(labelRenderer.domElement);

    groupRef.current = group;
    const committed = new THREE.Group();
    const draft = new THREE.Group();
    const handles = new THREE.Group();
    const dragDraft = new THREE.Group();
    group.add(committed, draft, handles, dragDraft);
    committedRef.current = committed;
    draftRef.current = draft;
    handlesGroupRef.current = handles;
    dragDraftRef.current = dragDraft;

    // Any real user-driven orbit/pan/zoom takes precedence over a
    // programmatic camera flight in progress — Phase 7 Step 20/60. Three.js
    // OrbitControls fires "start" only for genuine pointer/wheel interaction,
    // not for the frame-by-frame recompute `controls.update()` already does
    // in the render loop, so this can't false-cancel a flight that's simply
    // playing out on its own.
    const onControlsStart = () => animeControllerRef.current?.cancelCameraMove();
    controls.addEventListener("start", onControlsStart);

    // Anime.js is viewer-local and dynamically imported (Phase 7 Step 14) —
    // never a static import here, so it never reaches a non-viewer route
    // chunk. Skipped entirely under prefers-reduced-motion: the reduced-
    // motion path applies final states directly instead (Phase 7 Step 59).
    let cancelled = false;
    import("@/components/viewer/anime-scene").then(({ createViewerAnimeController, prefersReducedMotion }) => {
      if (cancelled) return;
      if (!prefersReducedMotion()) animeControllerRef.current = createViewerAnimeController(host);
    });

    const raycaster = new THREE.Raycaster();
    raycaster.firstHitOnly = true; // three-mesh-bvh: return only the closest hit
    // Screen coords -> normalized device coords for this canvas.
    const ndcFrom = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
    };
    // Raycast the model surface; returns the hit point in model-metre coords.
    const pickSurface = (event: MouseEvent): Pt | null => {
      if (pickTargetsRef.current.length === 0) return null;
      raycaster.setFromCamera(ndcFrom(event), camera);
      const hit = raycaster.intersectObjects(pickTargetsRef.current, true)[0];
      if (!hit) return null;
      const p = group.worldToLocal(hit.point.clone());
      return [p.x, p.y, p.z];
    };

    // ---- Touch / pointer gesture state -------------------------------------
    // One finger tap = place point / grab handle; a second finger means the user
    // is navigating (orbit/pinch), so we cancel any pending tap or handle drag.
    const activePointers = new Set<number>();
    let lastPointerType = "mouse";
    let tapCandidate: { x: number; y: number; t: number } | null = null;
    const TAP_MOVE_PX = 10; // a touch that moves more than this is a drag, not a tap
    const TAP_MS = 600;
    // Grab the nearest edit handle within a finger-friendly screen radius, so a
    // fat-finger tap near a small handle still catches it (and stays easy at any zoom).
    const handleScreenTmp = new THREE.Vector3();
    const pickHandleScreen = (event: PointerEvent): THREE.Object3D | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      const ex = event.clientX - rect.left;
      const ey = event.clientY - rect.top;
      // Independent of the visible marker's tiny on-screen size — this is a
      // screen-space proximity test, not a raycast against the mesh, so the
      // grab target stays comfortably large even though the dot itself is small.
      let bestD = event.pointerType === "touch" ? 44 : 22;
      let best: THREE.Object3D | null = null;
      for (const h of handleMeshesRef.current) {
        h.getWorldPosition(handleScreenTmp).project(camera);
        if (handleScreenTmp.z > 1) continue; // behind the camera
        const hx = (handleScreenTmp.x * 0.5 + 0.5) * rect.width;
        const hy = (-handleScreenTmp.y * 0.5 + 0.5) * rect.height;
        const d = Math.hypot(hx - ex, hy - ey);
        if (d < bestD) { bestD = d; best = h; }
      }
      return best;
    };

    core.loadModel(glbUrl, {
      // Guarded by `cancelled`: React/StrictMode dev double-invokes this
      // effect (mount → cleanup → mount again), and `loadModel` has no way
      // to abort an in-flight GLTFLoader fetch/parse. Without this guard,
      // BOTH the torn-down first mount's load AND the live second mount's
      // load complete and run these side effects — and because
      // `animeControllerRef` is a single ref shared across both effect
      // invocations, whichever resolves second can call `revealModel` on
      // the FIRST mount's (already-disposed) `group` through the SECOND
      // mount's Anime scope, or vice versa, leaving the live group's
      // transform in whatever partial state the interleaved calls left it
      // — observed live as the model rendering at the correct spot only by
      // coincidence, then "Reset view" appearing to do nothing because the
      // camera math was correct but the model itself was sitting far off
      // origin at a fraction of its fitted scale.
      onLoaded: (root) => {
        if (cancelled) return;
        root.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.computeBoundsTree(); // build the BVH for fast raycasts
            pickTargetsRef.current.push(o);
          }
        });
        group.add(root);
        // Keep measurement layers on top after the model defines the group bounds.
        fitObjectToViewer(group);
        markModelLoaded(perf);
        setLoadState("ready");
        animeControllerRef.current?.revealModel(group);
      },
      onError: (err) => {
        if (cancelled) return;
        setLoadState("error");
        setError(err instanceof Error ? err.message : "Could not load the 3D model");
      },
    });

    // ---- Picking: screen -> surface hit -> model metres --------------------
    const redrawDraft = () => {
      const d = draftRef.current;
      if (!d) return;
      disposeAndClear(d);
      const active = toolRef.current;
      if (active === "orbit" || active === "edit") return;
      const color = active === "detect" ? DETECT_COLOR : active === "split" ? SPLIT_COLOR : TOOL_META[active].color;
      // Points are stored in group-local metres and draft is a child of group.
      const local = draftPtsRef.current.map((p) => new THREE.Vector3(...p));
      for (const v of local) {
        const plus = makePlusMarker(color);
        plus.position.copy(v);
        d.add(plus);
      }
      if (local.length >= 2) {
        // The detect ROI draws as a closed box; measurements draw open while drafting.
        const line = active === "detect" && local.length >= 3 ? [...local, local[0]] : local;
        d.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(line), new THREE.LineBasicMaterial({ color })));
      }
      if (active !== "detect" && active !== "split" && draftPtsRef.current.length >= TOOL_META[active].min) {
        const preview: Measurement = { id: "draft", type: active, points: draftPtsRef.current };
        const label = makeLabel(summarize(preview, unitsRef.current), LABEL_CLASS);
        label.position.copy(local[local.length - 1]);
        d.add(label);
      }
    };

    const finishDraft = () => {
      const active = toolRef.current;
      if (active === "orbit" || active === "detect" || active === "edit" || active === "split") return;
      const pts = draftPtsRef.current;
      if (pts.length < TOOL_META[active].min) return;
      let label: string | undefined;
      if (active === "marker") label = window.prompt("Marker label", "Note") || "Note";
      const id = crypto.randomUUID();
      const points = pts.slice(0, active === "height" ? 2 : pts.length);
      snapshotRef.current();
      setMeasurements((prev) => [...prev, { id, type: active, points, label }]);
      // Persist optimistically; drop the row again if the server rejects it.
      saveModelMeasurementAction({ id, jobId, kind: active, points, label }).catch((e) => {
        console.error("[measure] save failed", e);
        setMeasurements((prev) => prev.filter((m) => m.id !== id));
      });
      draftPtsRef.current = [];
      setDraftCount(0);
      redrawDraft();
    };

    // Split: the two drawn points define a cut line; slice whichever facet it crosses.
    const runSplit = () => {
      const [cutA, cutB] = draftPtsRef.current;
      let target: Measurement | undefined;
      let halves: [Pt[], Pt[]] | null = null;
      for (const m of measurementsRef.current) {
        if (m.type !== "area") continue;
        const res = splitFacetPolygon(m.points, cutA, cutB);
        if (res) {
          target = m;
          halves = res;
          break;
        }
      }
      draftPtsRef.current = [];
      setDraftCount(0);
      redrawDraft();
      if (!target || !halves) {
        setSplitError("Draw the line all the way across one facet, then it splits.");
        return;
      }
      setSplitError("");
      setTool("orbit");
      const removedId = target.id;
      const a: Measurement = { id: crypto.randomUUID(), type: "area", points: halves[0] };
      const b: Measurement = { id: crypto.randomUUID(), type: "area", points: halves[1] };
      snapshotRef.current();
      setMeasurements((prev) => [...prev.filter((x) => x.id !== removedId), a, b]);
      deleteModelMeasurementAction({ jobId, id: removedId }).catch((e) => console.error("[measure] split delete failed", e));
      for (const half of [a, b]) {
        saveModelMeasurementAction({ id: half.id, jobId, kind: "area", points: half.points, label: null, category: null }).catch((e) =>
          console.error("[measure] split save failed", e)
        );
      }
    };

    // Place one draft point at the event location (shared by mouse click and a
    // single-finger touch tap).
    const drawPlace = (event: { clientX: number; clientY: number }) => {
      const active = toolRef.current;
      // Orbit and edit do not place points (edit uses drag).
      if (active === "orbit" || active === "edit") return;
      const point = pickSurface(event as MouseEvent);
      if (!point) return;
      draftPtsRef.current.push(point);
      setDraftCount(draftPtsRef.current.length);
      redrawDraft();
      // Single-shot tools complete themselves.
      if (active === "split" && draftPtsRef.current.length === 2) runSplit();
      if (active === "height" && draftPtsRef.current.length === 2) finishDraft();
      if (active === "marker") finishDraft();
    };
    const onClick = (event: MouseEvent) => {
      // Touch taps are placed on pointerup; ignore the synthetic click they emit.
      if (lastPointerType === "touch") return;
      drawPlace(event);
    };

    // ---- Edit mode: drag a vertex handle across the surface -----------------
    // Abort an in-progress handle drag without committing (e.g. a second finger
    // lands and the gesture becomes a two-finger navigation).
    const abortDrag = () => {
      const drag = dragRef.current;
      controls.enabled = true;
      if (dragDraftRef.current) disposeAndClear(dragDraftRef.current);
      if (drag) {
        const existing = committedMapRef.current.get(drag.id);
        if (existing) existing.visible = true;
      }
      dragRef.current = null;
    };
    const onPointerDown = (event: PointerEvent) => {
      lastPointerType = event.pointerType;
      activePointers.add(event.pointerId);
      // A second finger => navigation (orbit/pinch): drop any pending tap or drag.
      if (activePointers.size > 1) {
        tapCandidate = null;
        abortDrag();
        return;
      }
      tapCandidate = { x: event.clientX, y: event.clientY, t: performance.now() };
      if (toolRef.current !== "edit" || handleMeshesRef.current.length === 0) return;
      const handle = pickHandleScreen(event);
      if (!handle) return; // missed a handle -> let OrbitControls orbit
      const { id, index } = handle.userData as { id: string; index: number };
      const m = measurementsRef.current.find((x) => x.id === id);
      if (!m) return;
      dragRef.current = { id, index, handle, point: m.points[index] };
      controls.enabled = false; // OrbitControls checks this each move -> no orbit
      const existing = committedMapRef.current.get(id);
      if (existing) existing.visible = false; // hide the static copy; draft shows live
    };
    const onPointerMove = (event: PointerEvent) => {
      // A touch that travels is a drag/navigation, not a tap.
      if (tapCandidate && Math.hypot(event.clientX - tapCandidate.x, event.clientY - tapCandidate.y) > TAP_MOVE_PX) {
        tapCandidate = null;
      }
      const drag = dragRef.current;
      if (!drag || activePointers.size > 1) return; // >1 pointer -> navigating, not dragging
      const point = pickSurface(event);
      if (!point) return;
      drag.point = point;
      drag.handle.position.set(point[0], point[1], point[2]);
      // Rebuild just the dragged measurement live in the draft layer.
      const base = measurementsRef.current.find((x) => x.id === drag.id);
      const dd = dragDraftRef.current;
      if (!base || !dd) return;
      disposeAndClear(dd);
      const updated: Measurement = { ...base, points: base.points.map((p, i) => (i === drag.index ? point : p)) };
      const color = colorMapRef.current.get(drag.id) ?? TOOL_META.area.color;
      dd.add(buildMeasurementGraphics(updated, color, unitsRef.current, sizeRef.current, true).group);
    };
    const onPointerUp = (event: PointerEvent) => {
      activePointers.delete(event.pointerId);
      const drag = dragRef.current;
      controls.enabled = true;
      if (dragDraftRef.current) disposeAndClear(dragDraftRef.current);
      if (!drag) {
        // A single-finger touch that didn't travel and released alone = a tap:
        // place a draft point (the synthetic click is suppressed for touch).
        if (tapCandidate && event.pointerType === "touch" && activePointers.size === 0 && performance.now() - tapCandidate.t < TAP_MS) {
          drawPlace(event);
        }
        tapCandidate = null;
        return;
      }
      tapCandidate = null;
      dragRef.current = null;
      const base = measurementsRef.current.find((x) => x.id === drag.id);
      if (!base) return;
      const orig = base.points[drag.index];
      // Skip a no-op (clicked a handle, or a drag that never hit the surface): no
      // spurious undo step, no needless DB write.
      if (drag.point[0] === orig[0] && drag.point[1] === orig[1] && drag.point[2] === orig[2]) return;
      const points = base.points.map((p, i) => (i === drag.index ? drag.point : p));
      snapshotRef.current();
      // Editing the geometry invalidates the server's cached area — clear it so the
      // label recomputes from the (now hand-edited, simple) polygon.
      setMeasurements((prev) => prev.map((m) => (m.id === drag.id ? { ...m, points, areaSqft: null } : m)));
      saveModelMeasurementAction({ id: drag.id, jobId, kind: base.type, points, label: base.label, category: base.category, areaSqft: null }).catch(
        (e) => console.error("[measure] edit save failed", e)
      );
    };
    const onDblClick = () => finishDraft();

    // Run auto-detect on the boxed ROI, adding the detected facets as area measurements.
    const runDetect = async () => {
      if (toolRef.current !== "detect") return;
      const roi = draftPtsRef.current;
      if (roi.length < 3) return;
      setDetecting(true);
      setDetectError("");
      try {
        const facets = await autoDetectRoofFacetsAction({
          jobId,
          imageryId: modelImageryId,
          roiPolygon: roi.map((p) => ({ x: p[0], y: p[1] })),
        });
        snapshotRef.current();
        setMeasurements((prev) => [
          ...prev,
          ...facets.map((f) => ({ id: f.id, type: "area" as const, points: f.points as Pt[], label: f.label ?? undefined, category: null, areaSqft: f.areaSqft })),
        ]);
        draftPtsRef.current = [];
        setDraftCount(0);
        setTool("orbit");
        redrawDraft();
      } catch (e) {
        setDetectError(e instanceof Error ? e.message : "Auto-detect failed");
      } finally {
        setDetecting(false);
      }
    };

    renderer.domElement.addEventListener("click", onClick);
    renderer.domElement.addEventListener("dblclick", onDblClick);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    // Expose finish/detect for the toolbar buttons.
    (host as HTMLDivElement & { __finish?: () => void }).__finish = finishDraft;
    (host as HTMLDivElement & { __redraw?: () => void }).__redraw = redrawDraft;
    (host as HTMLDivElement & { __detect?: () => void }).__detect = runDetect;

    core.observeResize(host, (width, height) => {
      labelRenderer.setSize(width, height);
      sizeRef.current = [width, height];
      for (const mat of lineMatsRef.current) mat.resolution.set(width, height);
    });

    const disconnectContextLoss = observeContextLoss(renderer, {
      onLost: () => setContextLost(true),
      onRestored: () => setContextLost(false),
    });

    core.startLoop(() => {
      labelRenderer.render(scene, camera);
      markFirstFrame(perf, renderer);
    });

    return () => {
      cancelled = true;
      animeControllerRef.current?.revert();
      animeControllerRef.current = null;
      controls.removeEventListener("start", onControlsStart);
      core.stopLoop();
      core.disconnectResize();
      disconnectContextLoss();
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("dblclick", onDblClick);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      core.disposeCore();
      for (const mesh of pickTargetsRef.current) mesh.geometry.disposeBoundsTree?.();
      pickTargetsRef.current = [];
      draftPtsRef.current = [];
      handleMeshesRef.current = [];
      dragRef.current = null;
      groupRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      host.replaceChildren();
    };
  }, [glbUrl]);

  // ---- Rebuild committed measurement graphics when state/units change -------
  useEffect(() => {
    const committed = committedRef.current;
    const group = groupRef.current;
    if (!committed || !group) return;
    committed.clear();
    lineMatsRef.current = [];
    committedMapRef.current = new Map();
    colorMapRef.current = new Map();
    const resolution = sizeRef.current;

    let areaIndex = 0;
    for (const m of measurements) {
      const color = colorForMeasurement(m, m.type === "area" ? areaIndex++ : 0);
      colorMapRef.current.set(m.id, color);
      const { group: g, mats } = buildMeasurementGraphics(m, color, units, resolution, labelsVisible);
      committed.add(g);
      committedMapRef.current.set(m.id, g);
      lineMatsRef.current.push(...mats);
    }

    return () => {
      committed.traverse((o) => {
        if (o instanceof CSS2DObject) o.element.remove();
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose?.();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat instanceof THREE.Material) mat.dispose();
      });
      lineMatsRef.current = [];
    };
  }, [measurements, units, loadState, labelsVisible]);

  // Keep the imperative draft readout in sync when units toggle mid-draw.
  useEffect(() => {
    (hostRef.current as (HTMLDivElement & { __redraw?: () => void }) | null)?.__redraw?.();
  }, [units, draftCount]);

  // Map camera gestures per tool, keeping mouse and touch independent:
  //  - orbit/edit: one finger / left-drag rotates (edit still grabs a handle first),
  //    two fingers dolly+pan.
  //  - drawing/detect: one finger / left-drag is reserved for placing points, so the
  //    camera moves only with two fingers (orbit + pinch-zoom). This is why a draw
  //    tool doesn't accidentally spin the model when you tap corners.
  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    const drawing = tool !== "orbit" && tool !== "edit";
    c.enableRotate = true;
    c.enableZoom = true;
    c.enablePan = true;
    if (drawing) {
      c.mouseButtons.LEFT = null; // left-drag places points, never orbits
      c.touches.ONE = null; // one finger is for tapping points
      c.touches.TWO = THREE.TOUCH.DOLLY_ROTATE; // two fingers orbit + pinch-zoom
    } else {
      c.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
      c.touches.ONE = THREE.TOUCH.ROTATE;
      c.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    }
  }, [tool]);

  // Show draggable vertex handles only in edit mode.
  useEffect(() => {
    const handles = handlesGroupRef.current;
    if (!handles) return;
    handles.clear();
    handleMeshesRef.current = [];
    if (tool !== "edit" || loadState !== "ready") return;
    for (const m of measurements) {
      m.points.forEach((p, index) => {
        // Same small precision dot as a saved vertex, just slightly larger
        // since this is the thing you're meant to grab — the actual grab
        // target is the much bigger screen-space radius in pickHandleScreen,
        // not this mesh's size.
        // depthTest is already off inside makePrecisionDot, so this stays
        // grabbable even when it sits behind the roof from the current angle.
        const handle = makePrecisionDot(0xffffff, HANDLE_RADIUS);
        handle.position.set(p[0], p[1], p[2]);
        handle.userData = { id: m.id, index };
        handles.add(handle);
        handleMeshesRef.current.push(handle);
      });
    }
    return () => {
      handles.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose?.();
        if (mesh.material instanceof THREE.Material) mesh.material.dispose();
      });
      handles.clear();
      handleMeshesRef.current = [];
    };
  }, [measurements, tool, loadState]);

  const activeMin = tool !== "orbit" && tool !== "detect" && tool !== "edit" && tool !== "split" ? TOOL_META[tool].min : 0;

  // ---- Undo/redo -----------------------------------------------------------
  const reconcile = (list: Measurement[]) => {
    replaceModelMeasurementsAction({
      jobId,
      measurements: list.map((m) => ({ id: m.id, kind: m.type, points: m.points, label: m.label ?? null, category: m.category ?? null, areaSqft: m.areaSqft ?? null })),
    }).catch((e) => console.error("[measure] reconcile failed", e));
  };
  // Record the pre-change state so it can be undone. Call BEFORE mutating.
  const snapshot = () => {
    undoStackRef.current.push(measurementsRef.current);
    if (undoStackRef.current.length > 40) undoStackRef.current.shift();
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  };
  useEffect(() => {
    snapshotRef.current = snapshot;
  });
  const undo = () => {
    if (undoStackRef.current.length === 0) return;
    redoStackRef.current.push(measurementsRef.current);
    const prev = undoStackRef.current.pop()!;
    setMeasurements(prev);
    reconcile(prev);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
  };
  const redo = () => {
    if (redoStackRef.current.length === 0) return;
    undoStackRef.current.push(measurementsRef.current);
    const next = redoStackRef.current.pop()!;
    setMeasurements(next);
    reconcile(next);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
  };

  // ⌘Z / ⌘⇧Z (Ctrl on Windows) while the viewer is hovered.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!hoveredRef.current || !(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Esc leaves full screen.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const scheduleHideControls = () => {
    if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = window.setTimeout(() => {
      // Never hide out from under a pointer that's parked on the controls.
      if (!hoveringChromeRef.current) setControlsVisible(false);
    }, 2500);
  };
  const revealControls = () => {
    setControlsVisible(true);
    scheduleHideControls();
  };

  // Reveal chrome on mouse move OR keyboard focus while full screen; idle
  // hides it. `focusin` matters on its own — a keyboard-only user tabbing
  // through the toolbar generates no mousemove at all, and without this the
  // chrome could hide itself out from under a control the user is actively
  // tabbed onto (Phase 7 accessibility pass). (Visibility is reset when the
  // toggle runs, so this effect only wires up the listener/timer.)
  useEffect(() => {
    if (!fullscreen) return;
    scheduleHideControls();
    const el = outerRef.current;
    const onMove = () => revealControls();
    el?.addEventListener("mousemove", onMove);
    el?.addEventListener("focusin", onMove);
    return () => {
      el?.removeEventListener("mousemove", onMove);
      el?.removeEventListener("focusin", onMove);
      if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen]);

  const toggleFullscreen = () => {
    setControlsVisible(true);
    setFullscreen((open) => !open);
  };

  // Flies the camera back to the initial framing shot — a real, bounded "fit
  // model" affordance (Phase 7 Step 19), not a per-facet camera-focus system.
  // Reduced motion jumps directly; a running flight is cancelled the instant
  // the user touches the canvas (the `controls` "start" listener above).
  const resetView = () => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const anime = animeControllerRef.current;
    if (anime) {
      anime.flyCameraTo(camera, controls, DEFAULT_CAMERA_POSITION, DEFAULT_CAMERA_TARGET);
    } else {
      camera.position.copy(DEFAULT_CAMERA_POSITION);
      controls.target.copy(DEFAULT_CAMERA_TARGET);
    }
  };

  // A measurement row's own "select" affordance — a single non-repeating scene
  // pulse, not a camera move (Phase 7 Step 17's "selected roof section
  // emphasis" candidate, kept deliberately small: this app has no existing
  // per-object camera-focus interaction to extend safely within this phase).
  const emphasizeMeasurement = (id: string) => {
    const target = committedMapRef.current.get(id);
    if (target) animeControllerRef.current?.emphasizeSelection(target);
  };

  const chromeHidden = fullscreen && !controlsVisible;
  const keepChrome = {
    onMouseEnter: () => {
      hoveringChromeRef.current = true;
      setControlsVisible(true);
    },
    onMouseLeave: () => {
      hoveringChromeRef.current = false;
      scheduleHideControls();
    },
    // Keyboard-focus equivalent of the hover pair above — a control that has
    // focus must not schedule itself invisible out from under the user.
    onFocus: () => {
      hoveringChromeRef.current = true;
      setControlsVisible(true);
    },
    onBlur: () => {
      hoveringChromeRef.current = false;
      scheduleHideControls();
    },
  };

  const startTool = (t: Tool) => {
    draftPtsRef.current = [];
    setDraftCount(0);
    setDetectError("");
    setSplitError("");
    (hostRef.current as (HTMLDivElement & { __redraw?: () => void }) | null)?.__redraw?.();
    setTool(t);
  };

  // Collapsing "More tools" while a hand tool is active would strand its bottom
  // overlay, so fall back to Move first.
  const ADVANCED_TOOLS: Tool[] = ["distance", "area", "height", "marker", "split"];
  const toggleAdvanced = () => {
    setShowAdvanced((open) => {
      if (open && ADVANCED_TOOLS.includes(toolRef.current)) startTool("orbit");
      return !open;
    });
  };

  const hasAreas = measurements.filter((m) => m.type === "area").length >= 2;
  const runClassify = async () => {
    setClassifying(true);
    try {
      const lines = await classifyRoofEdgesAction({ jobId });
      snapshotRef.current();
      // Drop any prior auto-classified edges from view, then add the fresh set.
      setMeasurements((prev) => [
        ...prev.filter((m) => !m.label?.startsWith("Auto edge:")),
        ...lines.map((l) => ({ id: l.id, type: "distance" as const, points: l.points as Pt[], label: l.label, category: l.category })),
      ]);
    } catch (e) {
      console.error("[measure] classify edges failed", e);
    } finally {
      setClassifying(false);
    }
  };

  // Tool-select buttons: never Instrument Cyan (that's reserved for readings —
  // docs/DESIGN.md's Readout Rule) and never color-only (aria-pressed carries
  // the state for assistive tech and anyone who can't rely on color alone).
  const toolButtonClass = (active: boolean) =>
    `min-h-11 rounded-lg px-3 py-2 text-sm font-medium transition ${
      active ? "bg-action text-on-action" : "border border-hairline bg-ground/50 text-ink-strong hover:text-ink-primary"
    }`;

  const inspectorPanel = (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <h5 className="text-sm font-semibold text-ink-primary">Measurements</h5>
        {measurements.length > 0 ? (
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="text-xs text-ink-muted hover:text-danger-fg"
          >
            Clear all
          </button>
        ) : null}
      </div>
      {measurements.length === 0 ? (
        <p className="text-xs text-ink-muted">
          Your roof faces show up here. Start with ✨ Auto-detect roof above.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {measurements.map((m) => (
            <li key={m.id} className="rounded-lg bg-surface-raised px-2 py-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => emphasizeMeasurement(m.id)}
                  className="min-w-0 flex-1 text-left"
                  title="Highlight this on the model"
                >
                  <span className="capitalize text-ink-muted">{m.type}</span>{" "}
                  <span className="font-medium tabular-nums text-instrument-fg">{summarize(m, units)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    snapshot();
                    setMeasurements((prev) => prev.filter((x) => x.id !== m.id));
                    deleteModelMeasurementAction({ jobId, id: m.id }).catch((e) =>
                      console.error("[measure] delete failed", e)
                    );
                  }}
                  className="min-h-11 min-w-11 shrink-0 text-ink-muted hover:text-danger-fg"
                  aria-label="Delete measurement"
                >
                  ✕
                </button>
              </div>
              {m.type === "distance" ? (
                <select
                  value={m.category ?? ""}
                  onChange={(e) => {
                    const category = (e.target.value || null) as LineCategory | null;
                    snapshot();
                    setMeasurements((prev) => prev.map((x) => (x.id === m.id ? { ...x, category } : x)));
                    updateModelMeasurementCategoryAction({ jobId, id: m.id, category }).catch((err) =>
                      console.error("[measure] category failed", err)
                    );
                  }}
                  className="mt-1.5 w-full rounded bg-surface-lifted px-1.5 py-1 text-xs capitalize text-ink-strong"
                >
                  <option value="">— roof line type (for estimate) —</option>
                  {LINE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    // Signature instrument surface: stays dark in both app themes — see
    // `.surface-dark` in globals.css. `.surface-dark` only re-forces the
    // *tokens* (--color-ground etc.), so it needs an element that actually
    // paints with one — `bg-ground` here, always, not just in full screen.
    // Without it the toolbar had nothing behind it in light mode, and the
    // tool-identity buttons below (raw yellow/violet, not token-based, so
    // .surface-dark can't touch them either) read as invisible pale-on-pale.
    // In full screen it becomes a fixed overlay filling the browser; the
    // canvas stays mounted and the ResizeObserver resizes the renderer to
    // match. Phase 7: the non-fullscreen wrapper no longer adds its own
    // rounded border — the canvas panel below is the stage's only boundary,
    // so the workspace region reads as one unframed instrument, not a card
    // nested inside the Scan tab's own step-card border (Step 6).
    <div ref={outerRef} className={`surface-dark min-w-0 bg-ground ${fullscreen ? "fixed inset-0 z-50" : ""}`}>
      <div
        {...(fullscreen ? keepChrome : {})}
        // Hidden fullscreen chrome is unreachable, not just invisible — inert
        // removes it from tab order and assistive-tech traversal entirely,
        // rather than leaving focusable controls behind an opacity fade.
        inert={chromeHidden || undefined}
        className={
          fullscreen
            ? `absolute inset-x-0 top-0 z-30 space-y-2 bg-gradient-to-b from-ground/95 via-ground/70 to-transparent p-3 transition-all duration-300 ${
                chromeHidden ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"
              }`
            : "mb-3 space-y-2"
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => startTool("orbit")} aria-pressed={tool === "orbit"} className={toolButtonClass(tool === "orbit")}>
            Move
          </button>
          <button
            type="button"
            onClick={() => startTool("detect")}
            aria-pressed={tool === "detect"}
            className={toolButtonClass(tool === "detect")}
          >
            ✨ Auto-detect roof
          </button>
          <button
            type="button"
            onClick={() => startTool("edit")}
            aria-pressed={tool === "edit"}
            className={toolButtonClass(tool === "edit")}
          >
            Edit points
          </button>
          <button
            type="button"
            onClick={resetView}
            disabled={loadState !== "ready"}
            title="Fly the camera back to the starting view"
            className="min-h-11 rounded-lg border border-hairline bg-ground/50 px-3 py-2 text-sm font-medium text-ink-secondary transition hover:text-ink-primary disabled:opacity-40"
          >
            Reset view
          </button>
          <button
            type="button"
            onClick={toggleAdvanced}
            aria-expanded={showAdvanced}
            className="min-h-11 rounded-lg border border-hairline bg-ground/50 px-3 py-2 text-sm font-medium text-ink-secondary transition hover:text-ink-primary"
          >
            {showAdvanced ? "Hide tools" : "More tools"}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsInspectorOpen((v) => !v)}
              aria-pressed={isInspectorOpen}
              className="min-h-11 rounded-lg border border-hairline bg-ground/50 px-3 py-2 text-sm font-medium text-ink-secondary transition hover:text-ink-primary"
            >
              Measurements{measurements.length > 0 ? ` (${measurements.length})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setHideLabels((v) => !v)}
              aria-pressed={hideLabels}
              title={hideLabels ? "Show the value on each roof face" : "Hide the value labels (they return while editing)"}
              className="min-h-11 rounded-lg border border-hairline bg-ground/50 px-3 py-2 text-sm font-medium text-ink-secondary transition hover:text-ink-primary"
            >
              {hideLabels ? "Show labels" : "Hide labels"}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-pressed={fullscreen}
              title={fullscreen ? "Exit full screen (Esc)" : "Fill the browser for close viewing and editing"}
              className="min-h-11 rounded-lg border border-hairline bg-ground/50 px-3 py-2 text-sm font-medium text-ink-secondary transition hover:text-ink-primary"
            >
              {fullscreen ? "Exit full screen" : "Full screen"}
            </button>
            <div className="inline-flex overflow-hidden rounded-lg border border-hairline text-sm">
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                title="Undo (⌘Z / Ctrl+Z)"
                className="min-h-11 px-2.5 py-2 text-ink-strong transition hover:bg-surface-lifted disabled:opacity-30"
              >
                ↶ Undo
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                title="Redo (⌘⇧Z / Ctrl+Shift+Z)"
                className="min-h-11 border-l border-hairline px-2.5 py-2 text-ink-strong transition hover:bg-surface-lifted disabled:opacity-30"
              >
                Redo ↷
              </button>
            </div>
            <div className="inline-flex overflow-hidden rounded-lg border border-hairline text-sm">
              {(["imperial", "metric"] as Units[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnits(u)}
                  aria-pressed={units === u}
                  className={`min-h-11 px-3 py-2 ${units === u ? "bg-surface-lifted text-ink-primary" : "bg-ground/50 text-ink-secondary"}`}
                >
                  {u === "imperial" ? "ft" : "m"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {showAdvanced ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-hairline bg-ground/40 p-2">
            <span className="px-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Measure by hand
            </span>
            {(["distance", "area", "height", "marker"] as const).map((t) => (
              <button key={t} type="button" onClick={() => startTool(t)} aria-pressed={tool === t} className={toolButtonClass(tool === t)}>
                {TOOL_META[t].name}
              </button>
            ))}
            <button type="button" onClick={() => startTool("split")} aria-pressed={tool === "split"} className={toolButtonClass(tool === "split")}>
              Split roof face
            </button>
            <button
              type="button"
              onClick={runClassify}
              disabled={!hasAreas || classifying}
              title={hasAreas ? "Find ridges, hips, valleys, eaves, and rakes from the roof faces" : "Auto-detect or draw at least two roof faces first"}
              className="min-h-11 rounded-lg border border-hairline bg-ground/50 px-3 py-2 text-sm font-medium text-ink-strong transition hover:text-ink-primary disabled:opacity-40"
            >
              {classifying ? "Finding edges…" : "⚡ Find roof edges"}
            </button>
          </div>
        ) : null}
      </div>

      {/*
        Canvas panel: ONE div, always in the same tree position — only its
        className and conditionally-rendered SIBLINGS change. This is the
        fix for the remount hazard documented at the isSplit state above:
        as long as `<div ref={hostRef}>`'s ancestor chain never changes
        shape between renders, the mount effect's WebGLRenderer/RAF loop
        stays attached to a DOM node that's actually still on screen.
      */}
      <div className={fullscreen ? "" : `grid gap-3 ${isSplit ? "lg:grid-cols-[1fr_260px]" : ""}`}>
        <div
          className={
            fullscreen
              ? "absolute inset-0 overflow-hidden bg-[#0b1418]"
              : "relative min-h-[480px] overflow-hidden rounded-lg border border-hairline bg-[#0b1418] sm:min-h-[560px]"
          }
          onPointerEnter={() => (hoveredRef.current = true)}
          onPointerLeave={() => (hoveredRef.current = false)}
        >
          <div
            ref={hostRef}
            className="absolute inset-0"
            role="img"
            aria-label="Interactive 3D roof model. Drag to rotate, scroll to zoom. Use the toolbar above to measure or edit the roof; every measurement value is also listed as text in the Measurements panel."
          />
          {loadState !== "ready" ? <ViewerStateBanner loadState={loadState} error={error} /> : null}
          <ToolHint tool={tool} draftCount={draftCount} activeMin={activeMin} detectError={detectError} detecting={detecting} splitError={splitError} measurementsCount={measurements.length} hostRef={hostRef} />
        </div>

        {!fullscreen && isSplit && isInspectorOpen ? (
          <div className="rounded-lg border border-hairline bg-ground/40">{inspectorPanel}</div>
        ) : null}
      </div>

      {fullscreen ? (
        <div
          {...keepChrome}
          inert={chromeHidden || undefined}
          className={`absolute right-3 top-20 z-30 max-h-[70vh] w-64 overflow-auto rounded-lg border border-hairline bg-ground/85 backdrop-blur transition-all duration-300 ${
            chromeHidden ? "translate-x-4 opacity-0" : "translate-x-0 opacity-100"
          }`}
        >
          {inspectorPanel}
        </div>
      ) : null}

      {!fullscreen && !isSplit ? (
        <Dialog isOpen={isInspectorOpen} onOpenChange={setIsInspectorOpen} purpose="info" width="100%" maxHeight="85vh" position={{ bottom: 0 }}>
          <DialogHeader title="Measurements" onOpenChange={setIsInspectorOpen} />
          <LayoutContent>{inspectorPanel}</LayoutContent>
        </Dialog>
      ) : null}

      {contextLost ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-30 rounded-lg border border-hairline bg-ground/85 p-3 text-center text-sm text-ink-secondary backdrop-blur">
          The 3D view paused to save graphics memory. It will pick back up shortly.
        </div>
      ) : null}

      <p className={`mt-2 text-xs text-ink-muted ${fullscreen ? "hidden" : ""}`}>
        {tool === "orbit"
          ? "Start with ✨ Auto-detect roof — box your roof and it finds the faces for you. Then Edit points to nudge any that look off. Drag to rotate · scroll to zoom."
          : "Measurements read in real-world units straight off the 3D roof."}
      </p>

      {/* Rendered once at the top level, not inside `inspectorPanel` — that
          value is referenced from two places (fullscreen floating panel,
          non-fullscreen split/sheet), and a Dialog-based overlay must exist
          exactly once regardless of which of those is currently mounted. */}
      <AlertDialog
        isOpen={confirmClearOpen}
        onOpenChange={setConfirmClearOpen}
        title="Clear all measurements?"
        description={`This removes all ${measurements.length} measurement${measurements.length === 1 ? "" : "s"} from this roof. You can undo it with ⌘Z right after, but it won't warn you again once you leave this page.`}
        actionLabel="Clear all"
        actionVariant="destructive"
        onAction={() => {
          snapshot();
          setMeasurements([]);
          clearModelMeasurementsAction({ jobId }).catch((e) => console.error("[measure] clear failed", e));
          setConfirmClearOpen(false);
        }}
      />
    </div>
  );
}

/** Loading / error / unsupported — the states MeasureViewer itself is responsible for (empty/processing are handled upstream by the Scan-tab step gating, which only mounts this component once a model exists — Phase 7 Step 35/36). */
function ViewerStateBanner({ loadState, error }: { loadState: LoadState; error: string }) {
  if (loadState === "ready") return null;
  return (
    <div className="pointer-events-none absolute inset-x-4 top-4 rounded-lg border border-hairline bg-ground/80 p-3 text-sm backdrop-blur">
      {loadState === "error" ? (
        <p className="text-danger-fg">Couldn&apos;t load the 3D model. {error}</p>
      ) : loadState === "unsupported" ? (
        <p className="text-ink-primary">
          Your browser can&apos;t show the 3D view here. Try a recent version of Chrome, Edge, or Safari — your
          measurements are still saved and available elsewhere on this job.
        </p>
      ) : (
        <p className="font-medium text-ink-primary">Loading your 3D model…</p>
      )}
    </div>
  );
}

function ToolHint({
  tool,
  draftCount,
  activeMin,
  detectError,
  detecting,
  splitError,
  measurementsCount,
  hostRef,
}: {
  tool: Tool;
  draftCount: number;
  activeMin: number;
  detectError: string;
  detecting: boolean;
  splitError: string;
  measurementsCount: number;
  hostRef: RefObject<HTMLDivElement | null>;
}) {
  if (tool === "detect") {
    return (
      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-lg border border-hairline bg-ground/85 px-3 py-2 text-sm backdrop-blur">
        <span className="text-ink-secondary">
          {detectError ? (
            <span className="text-danger-fg">{detectError}</span>
          ) : detecting ? (
            "Detecting roof planes…"
          ) : (
            `Click points around your roof to box it (${draftCount}). ${draftCount >= 3 ? "Then Detect." : "Need at least 3."}`
          )}
        </span>
        <button
          type="button"
          disabled={draftCount < 3 || detecting}
          onClick={() => (hostRef.current as (HTMLDivElement & { __detect?: () => void }) | null)?.__detect?.()}
          className="min-h-11 rounded-lg bg-action px-3 py-1 font-medium text-on-action disabled:opacity-40"
        >
          {detecting ? "Detecting…" : "Detect roof areas"}
        </button>
      </div>
    );
  }
  if (tool === "edit") {
    return (
      <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-lg border border-hairline bg-ground/85 px-3 py-2 text-sm backdrop-blur">
        <span className="text-ink-secondary">
          {measurementsCount === 0
            ? "Nothing to edit yet — draw a measurement first."
            : "Drag the white handles to move a point. Drag empty space to rotate."}
        </span>
      </div>
    );
  }
  if (tool === "split") {
    return (
      <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-lg border border-hairline bg-ground/85 px-3 py-2 text-sm backdrop-blur">
        <span className="text-ink-secondary">
          {splitError ? <span className="text-danger-fg">{splitError}</span> : `Click two points across a facet to cut it in two (${draftCount}/2).`}
        </span>
      </div>
    );
  }
  if (tool !== "orbit") {
    return (
      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-lg border border-hairline bg-ground/85 px-3 py-2 text-sm backdrop-blur">
        <span className="text-ink-secondary">
          {tool === "marker"
            ? "Click a point on the roof to drop a marker."
            : tool === "height"
              ? "Click two points to measure vertical height."
              : `Click to add points (${draftCount}). ${draftCount >= activeMin ? "Double-click or Finish to complete." : `Need ${activeMin}.`}`}
        </span>
        {tool !== "marker" && tool !== "height" ? (
          <button
            type="button"
            disabled={draftCount < activeMin}
            onClick={() => (hostRef.current as (HTMLDivElement & { __finish?: () => void }) | null)?.__finish?.()}
            className="min-h-11 rounded-lg bg-action px-3 py-1 font-medium text-on-action disabled:opacity-40"
          >
            Finish
          </button>
        ) : null}
      </div>
    );
  }
  return null;
}
