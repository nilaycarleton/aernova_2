"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from "three-mesh-bvh";
import { fitObjectToViewer } from "@/lib/viewer-fit";
import { buildFacetFillGeometry } from "@/lib/facet-overlay-geometry";
import { splitFacetPolygon } from "@/lib/facet-split";

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
} from "@/app/(dashboard)/projects/[projectId]/model-measurement-actions";
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
  projectId: string;
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

const LABEL_CLASS =
  "pointer-events-none rounded-md border border-white/15 bg-ground/85 px-1.5 py-0.5 text-xs font-medium text-ink-primary shadow";

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
  resolution: [number, number]
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
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), new THREE.MeshBasicMaterial({ color }));
    dot.position.copy(local[0]);
    group.add(dot);
  } else if (local.length >= 2) {
    for (const v of [local[0], local[local.length - 1]]) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), new THREE.MeshBasicMaterial({ color }));
      dot.position.copy(v);
      group.add(dot);
    }
    addOutline(local, 3);
  }

  const label = makeLabel(summarize(m, units), LABEL_CLASS);
  label.position.copy(local[Math.floor((local.length - 1) / 2)] ?? local[0]);
  group.add(label);
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
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose?.();
    const mat = mesh.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else if (mat instanceof THREE.Material) mat.dispose();
  });
  group.clear();
}

export function MeasureViewer({ glbUrl, projectId, modelImageryId, initialMeasurements = [] }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
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
  // Undo/redo: snapshots of the measurement list. historyVersion re-renders the buttons.
  const undoStackRef = useRef<Measurement[][]>([]);
  const redoStackRef = useRef<Measurement[][]>([]);
  const snapshotRef = useRef<() => void>(() => {});
  const hoveredRef = useRef(false);
  const [historyVersion, setHistoryVersion] = useState(0);

  // Imperative scene handles shared across effects/handlers.
  const groupRef = useRef<THREE.Group | null>(null);
  const committedRef = useRef<THREE.Group | null>(null);
  const draftRef = useRef<THREE.Group | null>(null);
  const pickTargetsRef = useRef<THREE.Mesh[]>([]);
  const draftPtsRef = useRef<Pt[]>([]);
  const toolRef = useRef<Tool>(tool);
  const unitsRef = useRef<Units>(units);
  const controlsRef = useRef<OrbitControls | null>(null);
  // Thick-line materials need the viewport size; track it and keep them in sync.
  const lineMatsRef = useRef<LineMaterial[]>([]);
  const sizeRef = useRef<[number, number]>([1, 1]);
  // Edit mode: draggable vertex handles + live-drag state.
  const handlesGroupRef = useRef<THREE.Group | null>(null);
  const dragDraftRef = useRef<THREE.Group | null>(null);
  const handleMeshesRef = useRef<THREE.Mesh[]>([]);
  const committedMapRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const colorMapRef = useRef<Map<string, number>>(new Map());
  const measurementsRef = useRef<Measurement[]>(measurements);
  const dragRef = useRef<{ id: string; index: number; handle: THREE.Mesh; point: Pt } | null>(null);
  toolRef.current = tool;
  unitsRef.current = units;
  measurementsRef.current = measurements;

  // ---- Scene lifecycle (mount once per model) -------------------------------
  useEffect(() => {
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
    renderer.domElement.setAttribute("data-testid", "measure-viewer");
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    // Let the canvas own all touch gestures (orbit/pinch/tap) instead of the
    // browser scrolling/zooming the page over it. OrbitControls also sets this,
    // but pin it explicitly so drawing taps aren't eaten on mobile.
    renderer.domElement.style.touchAction = "none";
    host.appendChild(renderer.domElement);
    sizeRef.current = [host.clientWidth, host.clientHeight];

    // Separate CSS2D layer for crisp HTML measurement labels.
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(host.clientWidth, host.clientHeight);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.inset = "0";
    labelRenderer.domElement.style.pointerEvents = "none";
    host.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = false;
    controls.minDistance = 8;
    controls.maxDistance = 120;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight("#ffffff", 1.1));
    scene.add(new THREE.HemisphereLight("#ffffff", "#1e293b", 2.4));
    const sun = new THREE.DirectionalLight("#ffffff", 2.4);
    sun.position.set(-16, -20, 34);
    scene.add(sun);

    const group = new THREE.Group();
    scene.add(group);
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
    const pickHandleScreen = (event: PointerEvent): THREE.Mesh | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      const ex = event.clientX - rect.left;
      const ey = event.clientY - rect.top;
      let bestD = event.pointerType === "touch" ? 44 : 14;
      let best: THREE.Mesh | null = null;
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

    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath("/draco/");
    loader.setDRACOLoader(draco);
    loader.load(
      glbUrl,
      (gltf) => {
        const root = gltf.scene;
        root.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.computeBoundsTree(); // build the BVH for fast raycasts
            pickTargetsRef.current.push(o);
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach((m) => {
              if (m instanceof THREE.MeshStandardMaterial && m.map) m.map.colorSpace = THREE.SRGBColorSpace;
            });
          }
        });
        group.add(root);
        // Keep measurement layers on top after the model defines the group bounds.
        fitObjectToViewer(group);
        draco.dispose();
        setLoadState("ready");
      },
      undefined,
      (err) => {
        draco.dispose();
        setLoadState("error");
        setError(err instanceof Error ? err.message : "Could not load the 3D model");
      }
    );

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
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), new THREE.MeshBasicMaterial({ color }));
        dot.position.copy(v);
        d.add(dot);
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
      saveModelMeasurementAction({ id, projectId, kind: active, points, label }).catch((e) => {
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
      deleteModelMeasurementAction({ projectId, id: removedId }).catch((e) => console.error("[measure] split delete failed", e));
      for (const half of [a, b]) {
        saveModelMeasurementAction({ id: half.id, projectId, kind: "area", points: half.points, label: null, category: null }).catch((e) =>
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
      dd.add(buildMeasurementGraphics(updated, color, unitsRef.current, sizeRef.current).group);
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
      saveModelMeasurementAction({ id: drag.id, projectId, kind: base.type, points, label: base.label, category: base.category, areaSqft: null }).catch(
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
          projectId,
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

    const resizeObserver = new ResizeObserver(() => {
      if (!host.clientWidth || !host.clientHeight) return;
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
      labelRenderer.setSize(host.clientWidth, host.clientHeight);
      sizeRef.current = [host.clientWidth, host.clientHeight];
      for (const mat of lineMatsRef.current) mat.resolution.set(host.clientWidth, host.clientHeight);
    });
    resizeObserver.observe(host);

    let frame = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("dblclick", onDblClick);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      controls.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        if ("geometry" in o && o.geometry instanceof THREE.BufferGeometry) o.geometry.dispose();
        if ("material" in o) {
          const m = (o as THREE.Mesh).material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else if (m instanceof THREE.Material) m.dispose();
        }
      });
      for (const mesh of pickTargetsRef.current) mesh.geometry.disposeBoundsTree?.();
      pickTargetsRef.current = [];
      draftPtsRef.current = [];
      handleMeshesRef.current = [];
      dragRef.current = null;
      groupRef.current = null;
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
      const { group: g, mats } = buildMeasurementGraphics(m, color, units, resolution);
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
  }, [measurements, units, loadState]);

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
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.7, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false })
        );
        mesh.position.set(p[0], p[1], p[2]);
        mesh.renderOrder = 999; // always grabbable, even behind the roof
        mesh.userData = { id: m.id, index };
        handles.add(mesh);
        handleMeshesRef.current.push(mesh);
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
      projectId,
      measurements: list.map((m) => ({ id: m.id, kind: m.type, points: m.points, label: m.label ?? null, category: m.category ?? null, areaSqft: m.areaSqft ?? null })),
    }).catch((e) => console.error("[measure] reconcile failed", e));
  };
  // Record the pre-change state so it can be undone. Call BEFORE mutating.
  const snapshot = () => {
    undoStackRef.current.push(measurementsRef.current);
    if (undoStackRef.current.length > 40) undoStackRef.current.shift();
    redoStackRef.current = [];
    setHistoryVersion((v) => v + 1);
  };
  snapshotRef.current = snapshot;
  const undo = () => {
    if (undoStackRef.current.length === 0) return;
    redoStackRef.current.push(measurementsRef.current);
    const prev = undoStackRef.current.pop()!;
    setMeasurements(prev);
    reconcile(prev);
    setHistoryVersion((v) => v + 1);
  };
  const redo = () => {
    if (redoStackRef.current.length === 0) return;
    undoStackRef.current.push(measurementsRef.current);
    const next = redoStackRef.current.pop()!;
    setMeasurements(next);
    reconcile(next);
    setHistoryVersion((v) => v + 1);
  };
  const canUndo = undoStackRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;
  void historyVersion; // canUndo/canRedo recompute when this bumps

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

  const startTool = (t: Tool) => {
    draftPtsRef.current = [];
    setDraftCount(0);
    setDetectError("");
    setSplitError("");
    (hostRef.current as (HTMLDivElement & { __redraw?: () => void }) | null)?.__redraw?.();
    setTool(t);
  };

  const hasAreas = measurements.filter((m) => m.type === "area").length >= 2;
  const runClassify = async () => {
    setClassifying(true);
    try {
      const lines = await classifyRoofEdgesAction({ projectId });
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

  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["orbit", "distance", "area", "height", "marker"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => startTool(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
              tool === t ? "bg-instrument text-ground" : "border border-hairline bg-ground/50 text-ink-strong hover:text-ink-primary"
            }`}
          >
            {t === "orbit" ? "Move" : TOOL_META[t].name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => startTool("detect")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            tool === "detect" ? "bg-yellow-400 text-ground" : "border border-yellow-300/30 bg-yellow-400/10 text-yellow-100 hover:bg-yellow-400/20"
          }`}
        >
          ✨ Auto-detect roof
        </button>
        <button
          type="button"
          onClick={() => startTool("edit")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            tool === "edit" ? "bg-violet-400 text-ground" : "border border-violet-300/30 bg-violet-400/10 text-violet-100 hover:bg-violet-400/20"
          }`}
        >
          Edit points
        </button>
        <button
          type="button"
          onClick={() => startTool("split")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            tool === "split" ? "bg-ink-strong text-ground" : "border border-white/15 bg-ground/50 text-ink-strong hover:text-ink-primary"
          }`}
        >
          Split facet
        </button>
        <button
          type="button"
          onClick={runClassify}
          disabled={!hasAreas || classifying}
          title={hasAreas ? "Find ridges, hips, valleys, eaves, and rakes from the facets" : "Draw or auto-detect at least two roof areas first"}
          className="rounded-lg border border-sky-300/30 bg-sky-accent/10 px-3 py-1.5 text-sm font-medium text-sky-100 transition hover:bg-sky-accent/20 disabled:opacity-40"
        >
          {classifying ? "Finding edges…" : "⚡ Find roof edges"}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-hairline text-sm">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (⌘Z / Ctrl+Z)"
              className="px-2.5 py-1.5 text-ink-strong transition hover:bg-surface-lifted disabled:opacity-30"
            >
              ↶ Undo
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (⌘⇧Z / Ctrl+Shift+Z)"
              className="border-l border-hairline px-2.5 py-1.5 text-ink-strong transition hover:bg-surface-lifted disabled:opacity-30"
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
                className={`px-3 py-1.5 ${units === u ? "bg-white/15 text-ink-primary" : "bg-ground/50 text-ink-secondary"}`}
              >
                {u === "imperial" ? "ft" : "m"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
        <div
          className="relative min-h-[480px] overflow-hidden rounded-2xl border border-hairline bg-[#0b1418] sm:min-h-[560px]"
          onPointerEnter={() => (hoveredRef.current = true)}
          onPointerLeave={() => (hoveredRef.current = false)}
        >
          <div ref={hostRef} className="absolute inset-0" />
          {loadState !== "ready" ? (
            <div className="pointer-events-none absolute inset-x-4 top-4 rounded-xl border border-hairline bg-ground/80 p-3 text-sm backdrop-blur">
              {loadState === "error" ? (
                <p className="text-rose-200">Couldn&apos;t load the 3D model. {error}</p>
              ) : (
                <p className="font-medium text-ink-primary">Loading your 3D model…</p>
              )}
            </div>
          ) : null}
          {tool === "detect" ? (
            <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-xl border border-yellow-300/25 bg-ground/85 px-3 py-2 text-sm backdrop-blur">
              <span className="text-ink-secondary">
                {detectError ? (
                  <span className="text-rose-200">{detectError}</span>
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
                className="rounded-lg bg-yellow-400 px-3 py-1 font-medium text-ground disabled:opacity-40"
              >
                {detecting ? "Detecting…" : "Detect roof areas"}
              </button>
            </div>
          ) : tool === "edit" ? (
            <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-xl border border-violet-300/25 bg-ground/85 px-3 py-2 text-sm backdrop-blur">
              <span className="text-ink-secondary">
                {measurements.length === 0
                  ? "Nothing to edit yet — draw a measurement first."
                  : "Drag the white handles to move a point. Drag empty space to rotate."}
              </span>
            </div>
          ) : tool === "split" ? (
            <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-xl border border-white/20 bg-ground/85 px-3 py-2 text-sm backdrop-blur">
              <span className="text-ink-secondary">
                {splitError ? (
                  <span className="text-rose-200">{splitError}</span>
                ) : (
                  `Click two points across a facet to cut it in two (${draftCount}/2).`
                )}
              </span>
            </div>
          ) : tool !== "orbit" ? (
            <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-xl border border-hairline bg-ground/85 px-3 py-2 text-sm backdrop-blur">
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
                  className="rounded-lg bg-instrument px-3 py-1 font-medium text-ground disabled:opacity-40"
                >
                  Finish
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-hairline bg-ground/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h5 className="text-sm font-semibold text-ink-primary">Measurements</h5>
            {measurements.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  snapshot();
                  setMeasurements([]);
                  clearModelMeasurementsAction({ projectId }).catch((e) => console.error("[measure] clear failed", e));
                }}
                className="text-xs text-ink-muted hover:text-rose-300"
              >
                Clear all
              </button>
            ) : null}
          </div>
          {measurements.length === 0 ? (
            <p className="text-xs text-ink-muted">Pick a tool and click the model to measure.</p>
          ) : (
            <ul className="space-y-1.5">
              {measurements.map((m) => (
                <li key={m.id} className="rounded-lg bg-surface-raised px-2 py-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="capitalize text-ink-muted">{m.type}</span>{" "}
                      <span className="font-medium text-ink-primary">{summarize(m, units)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        snapshot();
                        setMeasurements((prev) => prev.filter((x) => x.id !== m.id));
                        deleteModelMeasurementAction({ projectId, id: m.id }).catch((e) =>
                          console.error("[measure] delete failed", e)
                        );
                      }}
                      className="shrink-0 text-ink-muted hover:text-rose-300"
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
                        updateModelMeasurementCategoryAction({ projectId, id: m.id, category }).catch((err) =>
                          console.error("[measure] category failed", err)
                        );
                      }}
                      className="mt-1.5 w-full rounded bg-slate-900 px-1.5 py-1 text-xs capitalize text-ink-strong"
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
      </div>

      <p className="mt-2 text-xs text-ink-muted">
        {tool === "orbit"
          ? "Drag to rotate · scroll to zoom. Pick a tool to measure directly on the model."
          : "Measurements read in real-world units off the 3D model."}
      </p>
    </div>
  );
}
