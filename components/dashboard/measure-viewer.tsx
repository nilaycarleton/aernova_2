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
import { fitObjectToViewer } from "@/lib/viewer-fit";
import { buildFacetFillGeometry } from "@/lib/facet-overlay-geometry";
import {
  autoDetectRoofFacetsAction,
  clearModelMeasurementsAction,
  deleteModelMeasurementAction,
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
// "detect" boxes a region and auto-fills roof facets; it is not a measurement kind.
type Tool = "orbit" | MeasureTool | "detect";

type Measurement = {
  id: string;
  type: MeasureTool;
  points: Pt[]; // model metres
  label?: string;
  category?: LineCategory | null;
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

// Human-readable value(s) for a completed measurement, given a unit system.
function summarize(m: Measurement, units: Units): string {
  if (m.type === "distance") return formatLength(polylineLength(m.points), units);
  if (m.type === "height") return formatLength(verticalDrop(m.points[0], m.points[1]), units);
  if (m.type === "marker") return m.label || "Marker";
  // area
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
  "pointer-events-none rounded-md border border-white/15 bg-slate-950/85 px-1.5 py-0.5 text-[11px] font-medium text-white shadow";

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
    }))
  );
  const [draftCount, setDraftCount] = useState(0);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState("");

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
  toolRef.current = tool;
  unitsRef.current = units;

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
    group.add(committed, draft);
    committedRef.current = committed;
    draftRef.current = draft;

    const raycaster = new THREE.Raycaster();

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
      d.clear();
      const active = toolRef.current;
      if (active === "orbit") return;
      const color = active === "detect" ? DETECT_COLOR : TOOL_META[active].color;
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
      if (active !== "detect" && draftPtsRef.current.length >= TOOL_META[active].min) {
        const preview: Measurement = { id: "draft", type: active, points: draftPtsRef.current };
        const label = makeLabel(summarize(preview, unitsRef.current), LABEL_CLASS);
        label.position.copy(local[local.length - 1]);
        d.add(label);
      }
    };

    const finishDraft = () => {
      const active = toolRef.current;
      if (active === "orbit" || active === "detect") return;
      const pts = draftPtsRef.current;
      if (pts.length < TOOL_META[active].min) return;
      let label: string | undefined;
      if (active === "marker") label = window.prompt("Marker label", "Note") || "Note";
      const id = crypto.randomUUID();
      const points = pts.slice(0, active === "height" ? 2 : pts.length);
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

    const onClick = (event: MouseEvent) => {
      const active = toolRef.current;
      if (active === "orbit" || pickTargetsRef.current.length === 0) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(pickTargetsRef.current, true)[0];
      if (!hit) return;
      const local = group.worldToLocal(hit.point.clone());
      draftPtsRef.current.push([local.x, local.y, local.z]);
      setDraftCount(draftPtsRef.current.length);
      redrawDraft();
      // Single-shot tools complete themselves.
      if (active === "height" && draftPtsRef.current.length === 2) finishDraft();
      if (active === "marker") finishDraft();
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
        setMeasurements((prev) => [
          ...prev,
          ...facets.map((f) => ({ id: f.id, type: "area" as const, points: f.points as Pt[], label: f.label ?? undefined, category: null })),
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
      pickTargetsRef.current = [];
      draftPtsRef.current = [];
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
    const [rw, rh] = sizeRef.current;

    // Crisp, screen-space-thick outline that sits just above the surface.
    const outline = (points: THREE.Vector3[], color: number, width: number) => {
      const geo = new LineGeometry();
      geo.setPositions(points.flatMap((v) => [v.x, v.y, v.z]));
      const mat = new LineMaterial({ color, linewidth: width, transparent: true, depthTest: true });
      mat.resolution.set(rw, rh);
      lineMatsRef.current.push(mat);
      committed.add(new Line2(geo, mat));
    };

    let areaIndex = 0;
    for (const m of measurements) {
      const local = m.points.map((p) => new THREE.Vector3(...p));

      if (m.type === "area" && local.length >= 3) {
        // Each facet gets its own hue so neighbours stay distinguishable.
        const color = AREA_PALETTE[areaIndex++ % AREA_PALETTE.length];
        const fill = buildFacetFillGeometry(m.points, polygonNormal(m.points), 0.05);
        committed.add(
          new THREE.Mesh(
            fill,
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
          )
        );
        outline([...local, local[0]], color, 3);
      } else if (m.type === "marker") {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), new THREE.MeshBasicMaterial({ color: TOOL_META.marker.color }));
        dot.position.copy(local[0]);
        committed.add(dot);
      } else if (local.length >= 2) {
        const color = TOOL_META[m.type].color;
        // Small end-dots help read distance/height segments; no clutter dots on facets.
        for (const v of [local[0], local[local.length - 1]]) {
          const dot = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), new THREE.MeshBasicMaterial({ color }));
          dot.position.copy(v);
          committed.add(dot);
        }
        outline(local, color, 3);
      }

      const label = makeLabel(summarize(m, units), LABEL_CLASS);
      label.position.copy(local[Math.floor((local.length - 1) / 2)] ?? local[0]);
      committed.add(label);
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

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.enableRotate = tool === "orbit";
  }, [tool]);

  const activeMin = tool !== "orbit" && tool !== "detect" ? TOOL_META[tool].min : 0;

  const startTool = (t: Tool) => {
    draftPtsRef.current = [];
    setDraftCount(0);
    setDetectError("");
    (hostRef.current as (HTMLDivElement & { __redraw?: () => void }) | null)?.__redraw?.();
    setTool(t);
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
              tool === t ? "bg-cyan-400 text-slate-950" : "border border-white/10 bg-slate-950/50 text-slate-200 hover:text-white"
            }`}
          >
            {t === "orbit" ? "Move" : TOOL_META[t].name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => startTool("detect")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            tool === "detect" ? "bg-yellow-400 text-slate-950" : "border border-yellow-300/30 bg-yellow-400/10 text-yellow-100 hover:bg-yellow-400/20"
          }`}
        >
          ✨ Auto-detect roof
        </button>
        <div className="ml-auto inline-flex overflow-hidden rounded-lg border border-white/10 text-sm">
          {(["imperial", "metric"] as Units[]).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnits(u)}
              className={`px-3 py-1.5 ${units === u ? "bg-white/15 text-white" : "bg-slate-950/50 text-slate-300"}`}
            >
              {u === "imperial" ? "ft" : "m"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
        <div className="relative min-h-[480px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b1418] sm:min-h-[560px]">
          <div ref={hostRef} className="absolute inset-0" />
          {loadState !== "ready" ? (
            <div className="pointer-events-none absolute inset-x-4 top-4 rounded-xl border border-white/10 bg-slate-950/80 p-3 text-sm backdrop-blur">
              {loadState === "error" ? (
                <p className="text-rose-200">Couldn&apos;t load the 3D model. {error}</p>
              ) : (
                <p className="font-medium text-white">Loading your 3D model…</p>
              )}
            </div>
          ) : null}
          {tool === "detect" ? (
            <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-xl border border-yellow-300/25 bg-slate-950/85 px-3 py-2 text-sm backdrop-blur">
              <span className="text-slate-300">
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
                className="rounded-lg bg-yellow-400 px-3 py-1 font-medium text-slate-950 disabled:opacity-40"
              >
                {detecting ? "Detecting…" : "Detect roof areas"}
              </button>
            </div>
          ) : tool !== "orbit" ? (
            <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/85 px-3 py-2 text-sm backdrop-blur">
              <span className="text-slate-300">
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
                  className="rounded-lg bg-cyan-400 px-3 py-1 font-medium text-slate-950 disabled:opacity-40"
                >
                  Finish
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h5 className="text-sm font-semibold text-white">Measurements</h5>
            {measurements.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setMeasurements([]);
                  clearModelMeasurementsAction({ projectId }).catch((e) => console.error("[measure] clear failed", e));
                }}
                className="text-xs text-slate-400 hover:text-rose-300"
              >
                Clear all
              </button>
            ) : null}
          </div>
          {measurements.length === 0 ? (
            <p className="text-xs text-slate-500">Pick a tool and click the model to measure.</p>
          ) : (
            <ul className="space-y-1.5">
              {measurements.map((m) => (
                <li key={m.id} className="rounded-lg bg-white/5 px-2 py-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="capitalize text-slate-400">{m.type}</span>{" "}
                      <span className="font-medium text-white">{summarize(m, units)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMeasurements((prev) => prev.filter((x) => x.id !== m.id));
                        deleteModelMeasurementAction({ projectId, id: m.id }).catch((e) =>
                          console.error("[measure] delete failed", e)
                        );
                      }}
                      className="shrink-0 text-slate-500 hover:text-rose-300"
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
                        setMeasurements((prev) => prev.map((x) => (x.id === m.id ? { ...x, category } : x)));
                        updateModelMeasurementCategoryAction({ projectId, id: m.id, category }).catch((err) =>
                          console.error("[measure] category failed", err)
                        );
                      }}
                      className="mt-1.5 w-full rounded bg-slate-900 px-1.5 py-1 text-[11px] capitalize text-slate-200"
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

      <p className="mt-2 text-xs text-slate-500">
        {tool === "orbit"
          ? "Drag to rotate · scroll to zoom. Pick a tool to measure directly on the model."
          : "Measurements read in real-world units off the 3D model."}
      </p>
    </div>
  );
}
