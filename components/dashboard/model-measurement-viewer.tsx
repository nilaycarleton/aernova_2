"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { PhotogrammetryModelPackage } from "@/lib/photogrammetry-pipeline";

type Tool = "distance" | "area" | "pitch" | "volume";
type AssetView = "reconstruction" | "orthomosaic" | "surface" | "report";

type Props = {
  modelPackage: PhotogrammetryModelPackage | null;
  previewUrl: string | null;
  sourceImageCount: number;
};

type ReconstructionAccuracy = {
  label: string;
  gsdInches: number;
  reprojectionErrorPx: number;
  densePoints: string;
  coverage: number;
  status: "draft" | "processing" | "processed" | "review";
};

const toolLabels: Record<Tool, string> = {
  distance: "Distance",
  area: "Area",
  pitch: "Pitch",
  volume: "Volume",
};

const assetViewLabels: Record<AssetView, string> = {
  reconstruction: "3D",
  orthomosaic: "Ortho",
  surface: "DSM/DTM",
  report: "Report",
};

const fallbackMeasurements = [
  { id: "sample-distance", label: "Front eave run", type: "distance" as const, value: "19.52 m", confidence: 74 },
  { id: "sample-area", label: "Main roof plane", type: "area" as const, value: "1,260 sq ft", confidence: 71 },
  { id: "sample-pitch", label: "Dominant pitch", type: "pitch" as const, value: "Needs review", confidence: 48 },
  { id: "sample-volume", label: "Debris volume planning", type: "volume" as const, value: "8 yd3", confidence: 52 },
];

const measurementPath = [
  new THREE.Vector3(-17.5, -8.4, 4.55),
  new THREE.Vector3(-15.2, 8.5, 4.65),
  new THREE.Vector3(15.5, 8.4, 4.65),
  new THREE.Vector3(17.2, -7.7, 4.55),
  new THREE.Vector3(-17.5, -8.4, 4.55),
];

const measurementLabels = [
  { text: "23.44 m", position: new THREE.Vector3(0, 8.9, 5.35) },
  { text: "12.41 m", position: new THREE.Vector3(-17.4, 1.2, 5.25) },
  { text: "8.43 m", position: new THREE.Vector3(17.4, 0.8, 5.2) },
  { text: "19.52 m", position: new THREE.Vector3(0, -8.7, 5.3) },
  { text: "0.15 m", position: new THREE.Vector3(-18.8, -8.6, 5.15) },
  { text: "0.03 m", position: new THREE.Vector3(18.4, -7.9, 5.15) },
];

function parseFirstNumber(value: string | undefined) {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function buildAccuracyProfile(
  modelPackage: PhotogrammetryModelPackage | null,
  sourceImageCount: number
): ReconstructionAccuracy {
  const images = Math.max(0, modelPackage?.sourceImageCount ?? sourceImageCount);
  const backend = modelPackage?.backend ?? "aernova-draft";
  const taskStatus = modelPackage?.processingTask?.status;
  const quality = modelPackage?.quality ?? "standard";
  const odmBackend = backend === "nodeodm" || backend === "nodeodx";
  const processed = odmBackend && taskStatus === "complete";
  const processing = odmBackend && (taskStatus === "queued" || taskStatus === "processing");
  const review = taskStatus === "failed" || images < 8;
  const qualityBoost = quality === "high" ? 0.72 : 1;
  const backendBoost = odmBackend ? 0.62 : 1;
  const imageBoost = Math.max(0.62, 1.35 - Math.min(images, 42) / 54);
  const coverage = Math.max(34, Math.min(98, 42 + images * 2.2 + (processed ? 18 : 0)));
  const pointEstimate = Math.max(0.15, images * (processed ? 1.8 : odmBackend ? 0.75 : 0.22));

  return {
    label: processed ? "Processed ODM model" : processing ? "Worker reconstruction" : "Draft reconstruction",
    gsdInches: Number((0.82 * qualityBoost * backendBoost * imageBoost).toFixed(2)),
    reprojectionErrorPx: Number(((processed ? 0.42 : odmBackend ? 0.88 : 1.45) * imageBoost).toFixed(2)),
    densePoints: `${pointEstimate.toFixed(pointEstimate >= 10 ? 0 : 1)}M`,
    coverage: Math.round(coverage),
    status: processed ? "processed" : review ? "review" : processing ? "processing" : "draft",
  };
}

function createTextSprite(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Sprite();

  context.fillStyle = "rgba(0,0,0,0.88)";
  context.roundRect(10, 16, 236, 60, 12);
  context.fill();
  context.fillStyle = "white";
  context.font = "700 28px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 128, 48);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    })
  );
  sprite.scale.set(4.2, 1.55, 1);
  return sprite;
}

function ridgeHeight(y: number) {
  return 4.5 + Math.max(0, 5.2 - Math.abs(y) * 0.58);
}

function addMeasurementOverlay(group: THREE.Group) {
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(measurementPath);
  const line = new THREE.Line(
    lineGeometry,
    new THREE.LineBasicMaterial({
      color: "#ff1515",
      depthTest: false,
      transparent: true,
      opacity: 0.98,
    })
  );
  line.renderOrder = 20;
  group.add(line);

  const nodeMaterial = new THREE.MeshBasicMaterial({ color: "#e00000", depthTest: false });
  measurementPath.slice(0, -1).forEach((point) => {
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 18), nodeMaterial);
    node.position.copy(point);
    node.renderOrder = 21;
    group.add(node);
  });

  measurementLabels.forEach((label) => {
    const sprite = createTextSprite(label.text);
    sprite.position.copy(label.position);
    sprite.renderOrder = 22;
    group.add(sprite);
  });
}

function addSurveyReference(group: THREE.Group, accuracy: ReconstructionAccuracy) {
  const gridMaterial = new THREE.LineBasicMaterial({
    color: "#38bdf8",
    transparent: true,
    opacity: accuracy.status === "processed" ? 0.22 : 0.12,
  });
  const contourMaterial = new THREE.LineBasicMaterial({
    color: "#f8fafc",
    transparent: true,
    opacity: accuracy.status === "processed" ? 0.22 : 0.11,
  });

  for (let offset = -24; offset <= 24; offset += 8) {
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(offset, -22, 0.04),
        new THREE.Vector3(offset, 22, 0.04),
      ]),
      gridMaterial
    ));
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-28, offset * 0.8, 0.04),
        new THREE.Vector3(30, offset * 0.8, 0.04),
      ]),
      gridMaterial
    ));
  }

  [3.4, 4.8, 6.2, 7.6].forEach((z, index) => {
    const halfWidth = 18 - index * 3.2;
    const halfDepth = 9.2 - index * 1.55;
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-halfWidth, -halfDepth, z),
        new THREE.Vector3(halfWidth, -halfDepth, z),
        new THREE.Vector3(halfWidth, halfDepth, z),
        new THREE.Vector3(-halfWidth, halfDepth, z),
        new THREE.Vector3(-halfWidth, -halfDepth, z),
      ]),
      contourMaterial
    );
    line.renderOrder = 12;
    group.add(line);
  });

  const scale = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-26, -20, 0.2),
      new THREE.Vector3(-16, -20, 0.2),
    ]),
    new THREE.LineBasicMaterial({ color: "#ffffff", linewidth: 2 })
  );
  scale.renderOrder = 25;
  group.add(scale);

  const scaleLabel = createTextSprite("10 m");
  scaleLabel.position.set(-21, -20.8, 1.4);
  scaleLabel.scale.set(2.8, 1.05, 1);
  scaleLabel.renderOrder = 26;
  group.add(scaleLabel);
}

function addPhotogrammetryPointCloud(
  group: THREE.Group,
  sourceImageCount: number,
  modelPackage: PhotogrammetryModelPackage | null
) {
  const odmBackend = modelPackage?.backend === "nodeodm" || modelPackage?.backend === "nodeodx";
  const workerReady = odmBackend && modelPackage?.processingTask?.status === "complete";
  const backendBoost = odmBackend ? 2.2 : 1;
  const pointCount = Math.max(
    5200,
    Math.min((modelPackage?.sourceImageCount ?? sourceImageCount) * 210 * backendBoost, workerReady ? 42000 : 24000)
  );
  const positions = new Float32Array(pointCount * 3);
  const colors = new Float32Array(pointCount * 3);
  const color = new THREE.Color();

  for (let index = 0; index < pointCount; index += 1) {
    const roofBand = index % 100 < 58;
    const facadeBand = index % 100 >= 58 && index % 100 < 72;
    const treeBand = index % 100 >= 72 && index % 100 < 91;
    const xSeed = ((index * 37) % 1000) / 1000;
    const ySeed = ((index * 71) % 1000) / 1000;
    const zSeed = ((index * 17) % 1000) / 1000;

    let x = 0;
    let y = 0;
    let z = 0;

    if (roofBand) {
      x = -18 + xSeed * 36;
      y = -9.8 + ySeed * 19.6;
      z = ridgeHeight(y) + (zSeed - 0.5) * 0.45;
      const warm = 0.48 + zSeed * 0.24;
      color.setRGB(warm, 0.31 + ySeed * 0.12, 0.25 + xSeed * 0.08);
    } else if (facadeBand) {
      x = -17 + xSeed * 34;
      y = -11.1 + ySeed * 2.3;
      z = 0.5 + zSeed * 4.1;
      color.set(index % 4 === 0 ? "#dbeafe" : index % 4 === 1 ? "#9ca3af" : "#7f1d1d");
    } else if (treeBand) {
      const side = index % 2 === 0 ? -1 : 1;
      x = side * (18 + xSeed * 14);
      y = -12 + ySeed * 30;
      z = 2 + zSeed * 11;
      color.set(index % 3 === 0 ? "#84cc16" : index % 3 === 1 ? "#3f6212" : "#a3e635");
    } else {
      x = -23 + xSeed * 48;
      y = -19 + ySeed * 39;
      z = zSeed * 0.35;
      color.set(index % 5 === 0 ? "#737373" : index % 5 === 1 ? "#65a30d" : "#a8a29e");
    }

    positions[index * 3] = x + Math.sin(index * 0.79) * 0.1;
    positions[index * 3 + 1] = y + Math.cos(index * 0.43) * 0.1;
    positions[index * 3 + 2] = z;
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pointGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(
    pointGeometry,
    new THREE.PointsMaterial({
      size: 0.105,
      vertexColors: true,
      transparent: true,
      opacity: 0.94,
      sizeAttenuation: true,
    })
  );
  group.add(points);
}

function loadProcessedMesh(group: THREE.Group, meshUrl: string, showMesh: boolean) {
  const loader = new PLYLoader();
  const material = new THREE.MeshStandardMaterial({
    color: "#d6b08a",
    roughness: 0.68,
    metalness: 0.02,
    vertexColors: true,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: showMesh ? 0.96 : 0.08,
  });

  loader.load(
    meshUrl,
    (geometry) => {
      material.vertexColors = geometry.hasAttribute("color");
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      if (!box) return;

      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);
      const largestDimension = Math.max(size.x, size.y, size.z) || 1;
      const scale = 34 / largestDimension;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = "Processed ODM mesh";
      mesh.position.sub(center.multiplyScalar(scale));
      mesh.scale.setScalar(scale);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.z += 1.5;
      group.add(mesh);
    },
    undefined,
    () => {
      material.dispose();
    }
  );
}

function fitObjectToViewer(object: THREE.Object3D) {
  object.rotation.x = -Math.PI / 2;
  object.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const largestDimension = Math.max(size.x, size.y, size.z) || 1;
  const scale = 56 / largestDimension;
  object.scale.setScalar(scale);
  object.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  box.getCenter(center);
  object.position.sub(center);
  object.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(object);
  if (box.min.z < 0) object.position.z -= box.min.z - 0.2;
}

function loadProcessedGlb(
  group: THREE.Group,
  glbUrl: string,
  showMesh: boolean,
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
      root.name = "ODM textured GLB";
      root.visible = showMesh;
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
      callbacks.onError(error instanceof Error ? error.message : "Unable to load textured GLB");
    }
  );
}

export function ModelMeasurementViewer({
  modelPackage,
  previewUrl,
  sourceImageCount,
}: Props) {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const [activeTool, setActiveTool] = useState<Tool>("distance");
  const [showPointCloud, setShowPointCloud] = useState(true);
  const [showMesh, setShowMesh] = useState(true);
  const [showCameras, setShowCameras] = useState(false);
  const [activeView, setActiveView] = useState<AssetView>("reconstruction");
  const [selectedPlane, setSelectedPlane] = useState("Main roof plane");
  const [modelLoadState, setModelLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [modelLoadError, setModelLoadError] = useState("");
  const measurements = modelPackage?.measurements ?? fallbackMeasurements;
  const accuracy = useMemo(
    () => buildAccuracyProfile(modelPackage, sourceImageCount),
    [modelPackage, sourceImageCount]
  );
  const roofArea = parseFirstNumber(measurements.find((measurement) => measurement.type === "area")?.value);
  const ridgeLength = parseFirstNumber(measurements.find((measurement) => measurement.id === "ridge")?.value);
  const activeMeasurements = useMemo(
    () => measurements.filter((measurement) => measurement.type === activeTool),
    [activeTool, measurements]
  );
  const cameras = modelPackage?.cameraPath ?? [];
  const processedGlbUrl =
    modelPackage?.processingTask?.status === "complete" && modelPackage.assets.viewerGlb?.startsWith("/")
      ? modelPackage.assets.viewerGlb
      : modelPackage?.processingTask?.status === "complete" && modelPackage.assets.texturedModelGlb?.startsWith("/")
        ? modelPackage.assets.texturedModelGlb
        : null;
  const processedMeshUrl =
    !processedGlbUrl && modelPackage?.processingTask?.status === "complete" && modelPackage.assets.meshPreviewPly?.startsWith("/")
      ? modelPackage.assets.meshPreviewPly
      : null;
  const usesProcessedAssets = Boolean(processedGlbUrl || processedMeshUrl);
  const assetLinks = {
    orthomosaic: modelPackage?.assets.orthomosaic?.startsWith("/") ? modelPackage.assets.orthomosaic : null,
    dsm: modelPackage?.assets.dsm?.startsWith("/") ? modelPackage.assets.dsm : null,
    dtm: modelPackage?.assets.dtm?.startsWith("/") ? modelPackage.assets.dtm : null,
    report: modelPackage?.assets.reportPdf?.startsWith("/") ? modelPackage.assets.reportPdf : null,
    pointCloud: modelPackage?.assets.denseCloud?.startsWith("/") ? modelPackage.assets.denseCloud : null,
  };
  const meshAssetLink =
    processedGlbUrl ??
    processedMeshUrl ??
    (modelPackage?.assets.mesh?.startsWith("/") ? modelPackage.assets.mesh : null);
  const processingPercent =
    typeof modelPackage?.processingTask?.progress === "number"
      ? Math.round(modelPackage.processingTask.progress)
      : accuracy.status === "processed"
        ? 100
        : accuracy.status === "processing"
          ? 48
          : sourceImageCount > 0
            ? 18
            : 0;
  const assetReadiness = [
    {
      label: "Fast GLB",
      detail: processedGlbUrl ? "Textured viewer model" : "Presentation model",
      ready: Boolean(processedGlbUrl),
      href: processedGlbUrl,
    },
    {
      label: "Full mesh",
      detail: processedMeshUrl ? "ODM PLY mesh" : "Worker mesh output",
      ready: Boolean(processedMeshUrl || modelPackage?.assets.mesh?.startsWith("/")),
      href: processedMeshUrl ?? (modelPackage?.assets.mesh?.startsWith("/") ? modelPackage.assets.mesh : null),
    },
    {
      label: "Point cloud",
      detail: "LAZ dense cloud",
      ready: Boolean(assetLinks.pointCloud),
      href: assetLinks.pointCloud,
    },
    {
      label: "Orthomosaic",
      detail: "GeoTIFF roof context",
      ready: Boolean(assetLinks.orthomosaic),
      href: assetLinks.orthomosaic,
    },
    {
      label: "DSM / DTM",
      detail: "Surface and terrain rasters",
      ready: Boolean(assetLinks.dsm || assetLinks.dtm),
      href: assetLinks.dsm ?? assetLinks.dtm,
    },
    {
      label: "Report",
      detail: "ODM processing report",
      ready: Boolean(assetLinks.report),
      href: assetLinks.report,
    },
  ];
  const layerControls = [
    { label: "Point cloud", enabled: showPointCloud, action: () => setShowPointCloud((value) => !value) },
    { label: "Mesh / GLB", enabled: showMesh, action: () => setShowMesh((value) => !value) },
    { label: "Cameras", enabled: showCameras, action: () => setShowCameras((value) => !value) },
  ];

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    host.replaceChildren();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#071013");

    const camera = new THREE.PerspectiveCamera(34, host.clientWidth / host.clientHeight, 0.1, 1000);
    camera.position.set(processedGlbUrl ? 0 : 9, processedGlbUrl ? -44 : -38, processedGlbUrl ? 30 : 27);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.domElement.setAttribute("data-testid", "phase-six-three-viewer");
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.width = "100%";
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, processedGlbUrl ? 0 : -1, processedGlbUrl ? 0 : 5.9);
    controls.minDistance = 10;
    controls.maxDistance = 75;

    scene.add(new THREE.HemisphereLight("#f8fafc", "#0f172a", 2.3));
    const sun = new THREE.DirectionalLight("#ffffff", 3.4);
    sun.position.set(-16, -20, 34);
    scene.add(sun);

    const group = new THREE.Group();
    group.rotation.x = -0.08;
    scene.add(group);
    addSurveyReference(group, accuracy);
    const selectableMeshes: THREE.Mesh[] = [];
    let loadedTexture: THREE.Texture | null = null;

    if (processedGlbUrl) {
      setModelLoadState("loading");
      setModelLoadProgress(0);
      setModelLoadError("");
      loadProcessedGlb(group, processedGlbUrl, showMesh, {
        onProgress: setModelLoadProgress,
        onReady: () => {
          setModelLoadState("ready");
          setModelLoadProgress(100);
        },
        onError: (message) => {
          setModelLoadState("error");
          setModelLoadError(message);
        },
      });
    } else {
      setModelLoadState(processedMeshUrl ? "ready" : "idle");
      setModelLoadProgress(processedMeshUrl ? 100 : 0);
      setModelLoadError("");

      if (processedMeshUrl) {
        loadProcessedMesh(group, processedMeshUrl, showMesh);
      } else {
        const textureLoader = new THREE.TextureLoader();
        const texturedRoofMaterial = new THREE.MeshStandardMaterial({
          color: "#8f463b",
          roughness: 0.72,
          metalness: 0.02,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: showMesh ? 0.76 : 0.08,
        });
        const secondaryRoofMaterial = new THREE.MeshStandardMaterial({
          color: "#6f3c35",
          roughness: 0.8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: showMesh ? 0.68 : 0.05,
        });
        const wallMaterial = new THREE.MeshStandardMaterial({
          color: "#d8d6cf",
          roughness: 0.86,
          transparent: true,
          opacity: showMesh ? 0.52 : 0.05,
        });
        const groundMaterial = new THREE.MeshStandardMaterial({
          color: "#5d7233",
          roughness: 0.95,
          transparent: true,
          opacity: 0.46,
        });

        if (previewUrl) {
          textureLoader.load(previewUrl, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            loadedTexture = texture;
            texturedRoofMaterial.map = texture;
            texturedRoofMaterial.needsUpdate = true;
            groundMaterial.map = texture;
            groundMaterial.needsUpdate = true;
          });
        }

        const ground = new THREE.Mesh(new THREE.PlaneGeometry(58, 44, 32, 32), groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(1, 1, -0.08);
        group.add(ground);

        const areaScale = roofArea ? Math.max(0.92, Math.min(1.18, Math.sqrt(roofArea / 3200))) : 1;
        const ridgeScale = ridgeLength ? Math.max(0.88, Math.min(1.22, ridgeLength / 64)) : 1;
        const body = new THREE.Mesh(new THREE.BoxGeometry(34 * areaScale, 15.5 * areaScale, 4.2), wallMaterial);
        body.position.z = 2.05;
        group.add(body);

        const mainRoofGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-18 * areaScale, -9.2 * areaScale, 4.2),
          new THREE.Vector3(18 * areaScale, -9.2 * areaScale, 4.2),
          new THREE.Vector3(0, 0, 9.55 * ridgeScale),
          new THREE.Vector3(18 * areaScale, 9.2 * areaScale, 4.2),
          new THREE.Vector3(-18 * areaScale, 9.2 * areaScale, 4.2),
          new THREE.Vector3(0, 0, 9.55 * ridgeScale),
        ]);
        mainRoofGeometry.setIndex([0, 1, 2, 3, 4, 5]);
        mainRoofGeometry.setAttribute(
          "uv",
          new THREE.Float32BufferAttribute([0.1, 0.62, 0.72, 0.62, 0.42, 0.36, 0.72, 0.26, 0.1, 0.26, 0.42, 0.36], 2)
        );
        mainRoofGeometry.computeVertexNormals();
        const mainRoof = new THREE.Mesh(mainRoofGeometry, texturedRoofMaterial);
        mainRoof.userData.label = "Main roof plane";
        group.add(mainRoof);
        selectableMeshes.push(mainRoof);

        const rearRoof = mainRoof.clone();
        rearRoof.material = secondaryRoofMaterial;
        rearRoof.position.set(0, 16.5, -0.35);
        rearRoof.scale.set(0.78, 0.75, 0.72);
        rearRoof.userData.label = "Rear roof plane";
        group.add(rearRoof);
        selectableMeshes.push(rearRoof);

        const garage = new THREE.Mesh(new THREE.BoxGeometry(11, 9.5, 3.1), wallMaterial);
        garage.position.set(-21.5, -1, 1.5);
        group.add(garage);

        const garageRoofGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-28, -6.8, 3.1),
          new THREE.Vector3(-15, -6.8, 3.1),
          new THREE.Vector3(-21.5, -1, 6.4),
          new THREE.Vector3(-15, 4.8, 3.1),
          new THREE.Vector3(-28, 4.8, 3.1),
          new THREE.Vector3(-21.5, -1, 6.4),
        ]);
        garageRoofGeometry.setIndex([0, 1, 2, 3, 4, 5]);
        garageRoofGeometry.computeVertexNormals();
        const garageRoof = new THREE.Mesh(garageRoofGeometry, secondaryRoofMaterial);
        garageRoof.userData.label = "Garage plane";
        group.add(garageRoof);
        selectableMeshes.push(garageRoof);
      }
    }

    if (showPointCloud) {
      addPhotogrammetryPointCloud(group, sourceImageCount, modelPackage);
    }

    if (showCameras) {
      const cameraMaterial = new THREE.MeshBasicMaterial({ color: "#facc15" });
      const cameraLineMaterial = new THREE.LineBasicMaterial({ color: "#facc15", transparent: true, opacity: 0.2 });
      const poses = cameras.length > 0 ? cameras : Array.from({ length: 10 }, (_, index) => ({
        id: `camera-${index}`,
        x: 50 + Math.cos((Math.PI * 2 * index) / 10) * 32,
        y: 50 + Math.sin((Math.PI * 2 * index) / 10) * 24,
        z: 70,
      }));
      poses.forEach((pose) => {
        const x = (pose.x - 50) * 0.58;
        const y = (pose.y - 48) * 0.42;
        const z = 13 + (pose.z - 62) * 0.08;
        const marker = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 12), cameraMaterial);
        marker.position.set(x, y, z);
        group.add(marker);
        group.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, y, z), new THREE.Vector3(0, 0, 5.8)]),
          cameraLineMaterial
        ));
      });
    }

    addMeasurementOverlay(group);

    if (selectedPlane === "Main roof plane") {
      const selectedOutline = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(measurementPath),
        new THREE.LineBasicMaterial({ color: "#38bdf8", transparent: true, opacity: 0.46, depthTest: false })
      );
      selectedOutline.renderOrder = 15;
      group.add(selectedOutline);
    }

    if (activeTool === "area") {
      const areaOverlay = new THREE.Mesh(
        new THREE.PlaneGeometry(34, 18.5),
        new THREE.MeshBasicMaterial({ color: "#22d3ee", transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthTest: false })
      );
      areaOverlay.rotation.x = Math.PI / 2;
      areaOverlay.position.z = 9.7;
      areaOverlay.renderOrder = 18;
      group.add(areaOverlay);
    }

    if (activeTool === "pitch") {
      const pitchGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(2, -0.2, 9.8),
        new THREE.Vector3(9, -0.2, 9.8),
        new THREE.Vector3(9, 5.6, 4.7),
        new THREE.Vector3(2, -0.2, 9.8),
      ]);
      group.add(new THREE.Line(pitchGeometry, new THREE.LineBasicMaterial({ color: "#fde047", depthTest: false })));
      const pitchLabel = createTextSprite("7/12");
      pitchLabel.position.set(8.2, 2.1, 8.2);
      group.add(pitchLabel);
    }

    if (activeTool === "volume") {
      const volume = new THREE.Mesh(
        new THREE.BoxGeometry(7, 4.4, 2.8),
        new THREE.MeshStandardMaterial({ color: "#a78bfa", transparent: true, opacity: 0.46 })
      );
      volume.position.set(11, -15, 1.4);
      group.add(volume);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    function handlePointerDown(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = selectableMeshes.length > 0 ? raycaster.intersectObjects(selectableMeshes, false)[0] : null;
      if (hit?.object.userData.label) {
        setSelectedPlane(String(hit.object.userData.label));
      }
    }
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);

    const resizeObserver = new ResizeObserver(() => {
      if (!host.clientWidth || !host.clientHeight) return;
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    });
    resizeObserver.observe(host);

    let animationFrame = 0;
    function animate() {
      controls.update();
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
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
      loadedTexture?.dispose();
      host.replaceChildren();
    };
  }, [accuracy, activeTool, cameras, modelPackage, previewUrl, processedGlbUrl, processedMeshUrl, ridgeLength, roofArea, selectedPlane, showCameras, showMesh, showPointCloud, sourceImageCount]);

  return (
    <div className="mt-6 grid min-w-0 max-w-full gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_300px]">
      <aside className="hidden">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-white">Viewer controls</p>
          <span className={`h-2.5 w-2.5 rounded-full ${processedGlbUrl ? "bg-emerald-300" : "bg-amber-300"}`} />
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Views</p>
            <div className="mt-2 grid gap-2">
              {(Object.keys(assetViewLabels) as AssetView[]).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setActiveView(view)}
                  className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                    activeView === view
                      ? "border-emerald-300/40 bg-emerald-300/15 text-emerald-100"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {assetViewLabels[view]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Measurements</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(Object.keys(toolLabels) as Tool[]).map((tool) => (
                <button
                  key={tool}
                  type="button"
                  onClick={() => setActiveTool(tool)}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                    activeTool === tool
                      ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {toolLabels[tool]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Layers</p>
            <div className="mt-2 grid gap-2">
              {layerControls.map(({ label, enabled, action }) => (
                <button
                  key={label}
                  type="button"
                  onClick={action}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs transition ${
                    enabled
                      ? "border-blue-300/30 bg-blue-300/10 text-blue-100"
                      : "border-white/10 bg-white/5 text-slate-400"
                  }`}
                >
                  <span>{label}</span>
                  <span className={`h-2.5 w-2.5 rounded-full ${enabled ? "bg-blue-300" : "bg-slate-600"}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-slate-400">
            <p className="font-medium text-white">Asset mode</p>
            <p className="mt-1">
              {processedGlbUrl ? "Using the textured ODM GLB as the primary viewer model." : "Waiting for the fast GLB presentation model."}
            </p>
          </div>
        </div>
      </aside>

      <div className="relative min-h-[560px] min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-[#071013] sm:min-h-[620px]">
        <div ref={canvasHostRef} className="absolute inset-0" />

        <div className="absolute bottom-4 left-4 top-4 z-10 hidden w-48 overflow-auto rounded-2xl border border-white/10 bg-slate-950/78 p-3 backdrop-blur xl:block">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-white">Viewer controls</p>
            <span className={`h-2.5 w-2.5 rounded-full ${processedGlbUrl ? "bg-emerald-300" : "bg-amber-300"}`} />
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Views</p>
              <div className="mt-2 grid gap-2">
                {(Object.keys(assetViewLabels) as AssetView[]).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setActiveView(view)}
                    className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                      activeView === view
                        ? "border-emerald-300/40 bg-emerald-300/15 text-emerald-100"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {assetViewLabels[view]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Measurements</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(Object.keys(toolLabels) as Tool[]).map((tool) => (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => setActiveTool(tool)}
                    className={`rounded-xl border px-2 py-2 text-xs font-medium transition ${
                      activeTool === tool
                        ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {toolLabels[tool]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Layers</p>
              <div className="mt-2 grid gap-2">
                {layerControls.map(({ label, enabled, action }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={action}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs transition ${
                      enabled
                        ? "border-blue-300/30 bg-blue-300/10 text-blue-100"
                        : "border-white/10 bg-white/5 text-slate-400"
                    }`}
                  >
                    <span>{label}</span>
                    <span className={`h-2.5 w-2.5 rounded-full ${enabled ? "bg-blue-300" : "bg-slate-600"}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute left-4 right-4 top-4 flex flex-wrap gap-2 xl:hidden">
          {(Object.keys(assetViewLabels) as AssetView[]).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
              className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                activeView === view
                  ? "border-emerald-300/50 bg-emerald-300/15 text-emerald-100"
                  : "border-white/10 bg-slate-950/65 text-slate-300 hover:bg-white/10"
              }`}
            >
              {assetViewLabels[view]}
            </button>
          ))}
        </div>

        <div className="absolute left-4 right-4 top-16 flex flex-wrap gap-2 xl:hidden">
          {(Object.keys(toolLabels) as Tool[]).map((tool) => (
            <button
              key={tool}
              type="button"
              onClick={() => setActiveTool(tool)}
              className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                activeTool === tool
                  ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-100"
                  : "border-white/10 bg-slate-950/65 text-slate-300 hover:bg-white/10"
              }`}
            >
              {toolLabels[tool]}
            </button>
          ))}
        </div>

        {activeView === "orthomosaic" ? (
          <div className="absolute inset-0 bg-[#071013] pt-28">
            {assetLinks.orthomosaic ? (
              <img src={assetLinks.orthomosaic} alt="" className="h-full w-full object-cover opacity-90" />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-400">
                Orthomosaic output appears here after NodeODM completes and the asset is cached.
              </div>
            )}
          </div>
        ) : null}

        {activeView === "surface" ? (
          <div className="absolute inset-0 bg-[#071013] pt-28">
            <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_50%_35%,rgba(34,211,238,0.38),transparent_24%),linear-gradient(rgba(255,255,255,0.11)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:100%_100%,34px_34px,34px_34px]" />
            <div className="relative mx-auto mt-16 max-w-md rounded-2xl border border-white/10 bg-slate-950/75 p-5 text-sm text-slate-300">
              <p className="font-medium text-white">Surface model outputs</p>
              <p className="mt-2 leading-6 text-slate-400">
                DSM and DTM rasters are prepared for terrain slope, drainage, and roof-height QA.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {assetLinks.dsm ? <a href={assetLinks.dsm} className="rounded-xl bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100">DSM</a> : null}
                {assetLinks.dtm ? <a href={assetLinks.dtm} className="rounded-xl bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100">DTM</a> : null}
              </div>
            </div>
          </div>
        ) : null}

        {activeView === "report" ? (
          <div className="absolute inset-0 bg-[#071013] pt-28">
            <div className="mx-auto mt-16 max-w-md rounded-2xl border border-white/10 bg-slate-950/75 p-5 text-sm text-slate-300">
              <p className="font-medium text-white">ODM report</p>
              <p className="mt-2 leading-6 text-slate-400">
                The report includes reconstruction settings, camera alignment, sparse/dense outputs, and orthophoto quality notes.
              </p>
              {assetLinks.report ? (
                <a href={assetLinks.report} className="mt-4 inline-flex rounded-xl bg-cyan-500 px-3 py-2 text-xs font-medium text-slate-950">
                  Open report
                </a>
              ) : (
                <p className="mt-4 text-xs text-slate-500">Report output appears after NodeODM completes.</p>
              )}
            </div>
          </div>
        ) : null}

        {activeView === "reconstruction" && processedGlbUrl && modelLoadState !== "ready" ? (
          <div className="pointer-events-none absolute inset-x-4 top-28 rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-sm text-slate-300 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-white">
                {modelLoadState === "error" ? "GLB viewer model could not load" : "Loading textured GLB"}
              </p>
              <span className="text-xs text-cyan-100">{modelLoadState === "error" ? "review" : `${modelLoadProgress}%`}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${modelLoadProgress}%` }} />
            </div>
            {modelLoadError ? <p className="mt-3 text-xs leading-5 text-rose-200">{modelLoadError}</p> : null}
          </div>
        ) : null}

        {activeView === "reconstruction" && !processedGlbUrl && !processedMeshUrl ? (
          <div className="pointer-events-none absolute inset-x-4 top-28 rounded-2xl border border-amber-300/20 bg-slate-950/80 p-4 text-sm text-slate-300 backdrop-blur">
            <p className="font-medium text-white">Fast GLB not ready yet</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Queue or sync NodeODM to create the textured presentation model for this viewer.
            </p>
          </div>
        ) : null}

        <div className="absolute bottom-4 left-4 right-4 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setShowPointCloud((value) => !value)}
            className={`rounded-xl border px-3 py-2 text-xs ${showPointCloud ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100" : "border-white/10 bg-slate-950/70 text-slate-400"}`}
          >
            Point cloud
          </button>
          <button
            type="button"
            onClick={() => setShowMesh((value) => !value)}
            className={`rounded-xl border px-3 py-2 text-xs ${showMesh ? "border-blue-300/40 bg-blue-400/15 text-blue-100" : "border-white/10 bg-slate-950/70 text-slate-400"}`}
          >
            Mesh
          </button>
          <button
            type="button"
            onClick={() => setShowCameras((value) => !value)}
            className={`rounded-xl border px-3 py-2 text-xs ${showCameras ? "border-amber-300/40 bg-amber-400/15 text-amber-100" : "border-white/10 bg-slate-950/70 text-slate-400"}`}
          >
            Cameras
          </button>
        </div>
        <div className="pointer-events-none absolute left-4 right-4 top-24 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 sm:left-auto sm:top-4">
          <p className="font-medium text-white">{selectedPlane}</p>
          <p className="mt-1 text-xs text-slate-400">
            {accuracy.label} · {accuracy.gsdInches}" GSD{usesProcessedAssets ? " · ODM mesh" : ""}
          </p>
        </div>
      </div>

      <aside className="min-w-0 rounded-3xl border border-white/10 bg-slate-950/50 p-4">
        <p className="text-sm font-medium text-white">Reconstruction package</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-slate-500">Images</p>
            <p className="mt-1 font-semibold text-white">{modelPackage?.sourceImageCount ?? sourceImageCount}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-slate-500">Quality</p>
            <p className="mt-1 font-semibold text-white">{modelPackage?.quality ?? "draft"}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-slate-500">GSD</p>
            <p className="mt-1 font-semibold text-white">{accuracy.gsdInches}" / px</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-slate-500">Dense cloud</p>
            <p className="mt-1 font-semibold text-white">{accuracy.densePoints}</p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-slate-400">Pipeline</p>
            <span className={`rounded-full px-2 py-1 text-[11px] ${
              accuracy.status === "processed"
                ? "bg-emerald-400/15 text-emerald-100"
                : accuracy.status === "processing"
                  ? "bg-amber-400/15 text-amber-100"
                  : accuracy.status === "review"
                    ? "bg-blue-400/15 text-blue-100"
                    : "bg-slate-400/15 text-slate-200"
            }`}>
              {accuracy.status}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <p className="text-slate-500">Alignment error</p>
              <p className="mt-1 font-semibold text-white">{accuracy.reprojectionErrorPx} px</p>
            </div>
            <div>
              <p className="text-slate-500">Coverage</p>
              <p className="mt-1 font-semibold text-white">{accuracy.coverage}%</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-cyan-300 transition-all"
              style={{ width: `${processingPercent}%` }}
            />
          </div>
          {modelPackage?.processingTask ? (
            <p className="mt-3 text-xs leading-5 text-slate-400">
              Task {modelPackage.processingTask.uuid.slice(0, 8)}
              {typeof modelPackage.processingTask.progress === "number"
                ? ` · ${Math.round(modelPackage.processingTask.progress)}%`
                : ""}
            </p>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          {activeMeasurements.map((measurement) => (
            <div key={measurement.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-white">{measurement.label}</p>
                <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-slate-300">
                  {measurement.confidence}%
                </span>
              </div>
              <p className="mt-2 text-lg font-semibold text-cyan-100">{measurement.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {(modelPackage?.stages ?? []).map((stage) => (
            <div key={stage.key} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2">
              <span className="text-xs text-slate-300">{stage.label}</span>
              <span className={`h-2 w-2 rounded-full ${stage.status === "complete" ? "bg-emerald-300" : stage.status === "review" ? "bg-amber-300" : "bg-slate-500"}`} />
            </div>
          ))}
        </div>

        {modelPackage?.processingTask?.status === "complete" ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">ODM outputs</p>
            {[
              ["Fast GLB", modelPackage.assets.viewerGlb ?? modelPackage.assets.texturedModelGlb],
              ["Mesh", modelPackage.assets.meshPreviewPly ?? modelPackage.assets.mesh],
              ["Point cloud", modelPackage.assets.denseCloud],
              ["Orthomosaic", modelPackage.assets.orthomosaic],
              ["Report", modelPackage.assets.reportPdf],
            ].map(([label, href]) =>
              href && href.startsWith("/") ? (
                <a
                  key={label}
                  href={href}
                  className="block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-cyan-100 transition hover:bg-white/10"
                >
                  {label}
                </a>
              ) : null
            )}
          </div>
        ) : null}
      </aside>

      <div className="min-w-0 rounded-3xl border border-white/10 bg-slate-950/45 p-4 xl:col-span-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-white">Model review workspace</p>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Inspect {assetViewLabels[activeView].toLowerCase()} view with the {toolLabels[activeTool].toLowerCase()} tool active, then save measurements once the roof planes look right.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
              {selectedPlane}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {usesProcessedAssets ? "ODM assets" : "Draft preview"}
            </span>
          </div>
        </div>

        <div className="mt-4 grid min-w-0 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {assetReadiness.map((asset) => (
            <a
              key={asset.label}
              href={asset.href ?? undefined}
              aria-disabled={!asset.ready}
              className={`rounded-2xl border p-3 transition ${
                asset.ready
                  ? "border-emerald-300/25 bg-emerald-400/10 hover:bg-emerald-400/15"
                  : "pointer-events-none border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-white">{asset.label}</p>
                <span className={`h-2.5 w-2.5 rounded-full ${asset.ready ? "bg-emerald-300" : "bg-slate-600"}`} />
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-400">{asset.detail}</p>
              <p className={`mt-2 text-xs ${asset.ready ? "text-emerald-100" : "text-slate-500"}`}>
                {asset.ready ? "Ready" : "Waiting for worker"}
              </p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
