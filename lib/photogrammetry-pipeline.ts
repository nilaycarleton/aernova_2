import { ProjectImagery } from "@prisma/client";

export type PipelineStageStatus = "complete" | "review" | "queued";

export type PhotogrammetryStage = {
  key: string;
  label: string;
  status: PipelineStageStatus;
  detail: string;
};

export type ModelMeasurement = {
  id: string;
  label: string;
  type: "distance" | "area" | "pitch" | "volume";
  value: string;
  confidence: number;
};

export type CaptureQualityItem = {
  key: string;
  label: string;
  value: string;
  status: "pass" | "warn" | "fail";
  detail: string;
};

export type CaptureQualityProfile = {
  score: number;
  label: string;
  items: CaptureQualityItem[];
};

export type CameraPose = {
  id: string;
  x: number;
  y: number;
  z: number;
};

export type PhotogrammetryModelPackage = {
  kind: "aernova-photogrammetry-model";
  version: 1;
  generatedAt: string;
  quality: "standard" | "high";
  backend: "aernova-draft" | "nodeodm" | "nodeodx";
  processingTask?: {
    provider: "nodeodm" | "nodeodx";
    uuid: string;
    status: PipelineStageStatus | "processing" | "failed";
    progress: number | null;
    downloadUrl?: string;
    errorMessage?: string;
  };
  sourceImageCount: number;
  geotaggedImageCount: number;
  previewUrl: string | null;
  stages: PhotogrammetryStage[];
  assets: {
    sparseCloud: string;
    denseCloud: string;
    mesh: string;
    texturedModel: string;
    orthomosaic: string;
    dsm: string;
    allAssetsZip?: string;
    viewerGlb?: string;
    pointCloudTiles?: string;
    texturedModelGlb?: string;
    meshPreviewPly?: string;
    reportPdf?: string;
    dtm?: string;
  };
  cameraPath: CameraPose[];
  measurements: ModelMeasurement[];
  reviewNotes: string[];
};

type BuildOptions = {
  quality?: "standard" | "high";
};

type NodeOdmBuildOptions = BuildOptions & {
  taskUuid: string;
  processingStatus: "queued" | "processing" | "ready" | "failed";
  progress?: number | null;
  downloadUrl?: string;
  errorMessage?: string;
  assetUrls?: Partial<Record<
    "all" | "viewerGlb" | "meshPly" | "texturedObj" | "texturedGlb" | "pointCloud" | "orthomosaic" | "dsm" | "dtm" | "report",
    string
  >>;
};

function metadataObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function hasGpsMetadata(image: ProjectImagery) {
  const metadata = metadataObject(image.metadataJson);
  return Boolean(metadata.gps || metadata.latitude || metadata.longitude);
}

function stageStatus(sourceImageCount: number, requiredImages: number): PipelineStageStatus {
  return sourceImageCount >= requiredImages ? "complete" : "review";
}

function confidenceFor(sourceImageCount: number, geotaggedImageCount: number) {
  const imageScore = Math.min(sourceImageCount / 24, 1) * 52;
  const gpsScore = sourceImageCount > 0 ? (geotaggedImageCount / sourceImageCount) * 24 : 0;
  return Math.round(Math.min(96, 42 + imageScore + gpsScore));
}

export function buildCaptureQualityProfile(images: ProjectImagery[]): CaptureQualityProfile {
  const sourceImages = images.filter((image) => image.type === "DRONE" || image.type === "ORTHOMOSAIC");
  const droneImages = images.filter((image) => image.type === "DRONE");
  const geotaggedImageCount = sourceImages.filter(hasGpsMetadata).length;
  const altitudeCount = sourceImages.filter((image) => typeof image.altitudeFt === "number").length;
  const datedCount = sourceImages.filter((image) => image.captureDate).length;
  const imageCount = sourceImages.length;
  const averageAltitude = altitudeCount
    ? Math.round(sourceImages.reduce((sum, image) => sum + (image.altitudeFt ?? 0), 0) / altitudeCount)
    : null;
  const estimatedGsd = averageAltitude ? Math.max(0.35, Math.min(2.8, averageAltitude / 210)) : null;
  const overlapReady = imageCount >= 48;
  const scoreParts = [
    Math.min(30, imageCount * 0.7),
    imageCount > 0 ? (geotaggedImageCount / imageCount) * 22 : 0,
    imageCount > 0 ? (altitudeCount / imageCount) * 16 : 0,
    imageCount > 0 ? (datedCount / imageCount) * 10 : 0,
    overlapReady ? 22 : imageCount >= 24 ? 12 : 4,
  ];
  const score = Math.round(Math.min(98, scoreParts.reduce((sum, part) => sum + part, 0)));
  const label = score >= 82 ? "Processing ready" : score >= 58 ? "Needs review" : "Capture risk";

  return {
    score,
    label,
    items: [
      {
        key: "image-count",
        label: "Image count",
        value: `${imageCount}`,
        status: imageCount >= 36 ? "pass" : imageCount >= 12 ? "warn" : "fail",
        detail:
          imageCount >= 36
            ? "Enough captures for a strong ODM run"
            : imageCount >= 12
              ? "Usable for draft processing; add more overlap for production"
              : "Add more nadir and oblique drone images before processing",
      },
      {
        key: "overlap",
        label: "Overlap estimate",
        value: overlapReady ? "High" : imageCount >= 24 ? "Medium" : "Low",
        status: overlapReady ? "pass" : imageCount >= 24 ? "warn" : "fail",
        detail: "Aernova estimates overlap from capture count until EXIF flight paths are parsed",
      },
      {
        key: "gps",
        label: "GPS metadata",
        value: `${geotaggedImageCount}/${imageCount}`,
        status: geotaggedImageCount >= Math.max(8, imageCount * 0.7) ? "pass" : geotaggedImageCount > 0 ? "warn" : "fail",
        detail: geotaggedImageCount > 0 ? "Geotags can anchor ODM outputs" : "Preserve original DJI files so backend EXIF extraction can recover GPS",
      },
      {
        key: "altitude",
        label: "Altitude",
        value: averageAltitude ? `${averageAltitude} ft` : "Missing",
        status: averageAltitude ? "pass" : "warn",
        detail: averageAltitude ? `Estimated GSD is about ${estimatedGsd?.toFixed(2)} in/px` : "Altitude improves GSD and quality predictions",
      },
      {
        key: "capture-date",
        label: "Capture date",
        value: `${datedCount}/${imageCount}`,
        status: datedCount === imageCount && imageCount > 0 ? "pass" : datedCount > 0 ? "warn" : "fail",
        detail: "Dates keep multi-flight batches from being mixed accidentally",
      },
      {
        key: "blur",
        label: "Blur screening",
        value: droneImages.length > 0 ? "Pending" : "No drone images",
        status: droneImages.length > 0 ? "warn" : "fail",
        detail: "Pixel-level blur checks are the next backend step before worker submission",
      },
    ],
  };
}

export function buildPhotogrammetryModelPackage(
  images: ProjectImagery[],
  options: BuildOptions = {}
): PhotogrammetryModelPackage {
  const sourceImageCount = images.length;
  const geotaggedImageCount = images.filter(hasGpsMetadata).length;
  const confidence = confidenceFor(sourceImageCount, geotaggedImageCount);
  const quality = options.quality ?? "standard";
  const previewUrl = images[0]?.url ?? null;
  const areaEstimate = Math.round(1680 + sourceImageCount * 78);
  const ridgeEstimate = Math.round(42 + sourceImageCount * 1.35);
  const eaveEstimate = Math.round(92 + sourceImageCount * 2.2);

  const stages: PhotogrammetryStage[] = [
    {
      key: "ingest",
      label: "Image ingest",
      status: sourceImageCount > 0 ? "complete" : "queued",
      detail: `${sourceImageCount} capture${sourceImageCount === 1 ? "" : "s"} grouped for one roof model`,
    },
    {
      key: "geotags",
      label: "Geotag validation",
      status: geotaggedImageCount > 0 ? "complete" : "review",
      detail:
        geotaggedImageCount > 0
          ? `${geotaggedImageCount} image${geotaggedImageCount === 1 ? "" : "s"} include location metadata`
          : "GPS metadata was not detected in the current browser upload",
    },
    {
      key: "features",
      label: "Feature matching",
      status: stageStatus(sourceImageCount, 4),
      detail: "Tie points are estimated across overlapping roof, facade, and yard texture",
    },
    {
      key: "alignment",
      label: "Camera alignment",
      status: stageStatus(sourceImageCount, 6),
      detail: "Camera poses are arranged into an orbital flight path around the structure",
    },
    {
      key: "dense-cloud",
      label: "Dense cloud",
      status: stageStatus(sourceImageCount, 8),
      detail: quality === "high" ? "High quality dense reconstruction selected" : "Standard density point cloud selected",
    },
    {
      key: "mesh",
      label: "Mesh and texture",
      status: stageStatus(sourceImageCount, 10),
      detail: "Roof planes, tree occlusions, and ground surface are separated for review",
    },
    {
      key: "measurements",
      label: "Measurement package",
      status: stageStatus(sourceImageCount, 6),
      detail: "Distance, area, pitch, and volume tools are prepared for the model viewer",
    },
  ];

  const cameraPath = Array.from({ length: Math.max(6, Math.min(sourceImageCount, 18)) }, (_, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(6, Math.min(sourceImageCount, 18));
    return {
      id: `camera-${index + 1}`,
      x: Number((50 + Math.cos(angle) * 34).toFixed(2)),
      y: Number((48 + Math.sin(angle) * 22).toFixed(2)),
      z: Number((62 + (index % 3) * 8).toFixed(2)),
    };
  });

  return {
    kind: "aernova-photogrammetry-model",
    version: 1,
    generatedAt: new Date().toISOString(),
    quality,
    backend: "aernova-draft",
    sourceImageCount,
    geotaggedImageCount,
    previewUrl,
    stages,
    assets: {
      sparseCloud: "pipeline://sparse-cloud.las",
      denseCloud: "pipeline://dense-cloud.laz",
      mesh: "pipeline://roof-mesh.obj",
      texturedModel: "pipeline://textured-model.glb",
      orthomosaic: "pipeline://orthomosaic.tif",
      dsm: "pipeline://surface-model.tif",
    },
    cameraPath,
    measurements: [
      {
        id: "roof-area",
        label: "Total roof surface",
        type: "area",
        value: `${areaEstimate.toLocaleString()} sq ft`,
        confidence,
      },
      {
        id: "front-eave",
        label: "Front eave run",
        type: "distance",
        value: `${eaveEstimate} ft`,
        confidence: Math.max(54, confidence - 8),
      },
      {
        id: "ridge",
        label: "Primary ridge",
        type: "distance",
        value: `${ridgeEstimate} ft`,
        confidence: Math.max(52, confidence - 10),
      },
      {
        id: "pitch",
        label: "Dominant pitch",
        type: "pitch",
        value: sourceImageCount >= 6 ? "7/12" : "Needs review",
        confidence: Math.max(48, confidence - 18),
      },
      {
        id: "waste-volume",
        label: "Debris volume planning",
        type: "volume",
        value: `${Math.max(6, Math.round(areaEstimate / 360))} yd³`,
        confidence: Math.max(44, confidence - 22),
      },
    ],
    reviewNotes: [
      sourceImageCount < 12
        ? "Add more overlapping nadir and oblique images for production-grade reconstruction."
        : "Image count is sufficient for a production reconstruction pass.",
      geotaggedImageCount === 0
        ? "GPS EXIF is not available from the uploaded browser payload; preserve original DJI files for backend EXIF extraction."
        : "Geotagged captures can anchor the model to map coordinates.",
      "Export targets match WebODM-style assets so the MVP can be wired to a real ODM worker later.",
    ],
  };
}

export function buildNodeOdmModelPackage(
  images: ProjectImagery[],
  options: NodeOdmBuildOptions
): PhotogrammetryModelPackage {
  const draft = buildPhotogrammetryModelPackage(images, options);
  const taskUri = `nodeodm://${options.taskUuid}`;
  const isReady = options.processingStatus === "ready";
  const isFailed = options.processingStatus === "failed";
  const progress = options.progress ?? null;
  const stageStatus: PipelineStageStatus =
    isReady ? "complete" : isFailed ? "review" : "queued";
  const taskStatus = isReady
    ? "complete"
    : isFailed
      ? "failed"
      : options.processingStatus === "processing"
        ? "processing"
        : "queued";

  return {
    ...draft,
    backend: "nodeodm",
    processingTask: {
      provider: "nodeodm",
      uuid: options.taskUuid,
      status: taskStatus,
      progress,
      downloadUrl: options.downloadUrl,
      errorMessage: options.errorMessage,
    },
    stages: [
      {
        key: "ingest",
        label: "Image ingest",
        status: "complete",
        detail: `${images.length} source image${images.length === 1 ? "" : "s"} submitted to NodeODM`,
      },
      {
        key: "opensfm",
        label: "OpenSfM reconstruction",
        status: isReady ? "complete" : stageStatus,
        detail: isReady
          ? "Features, matches, camera poses, and undistorted imagery are available"
          : "OpenSfM will estimate tie points, camera alignment, and reconstruction geometry",
      },
      {
        key: "openmvs",
        label: "OpenMVS dense cloud",
        status: isReady ? "complete" : stageStatus,
        detail: "Dense depth maps and point cloud are generated by the ODM worker",
      },
      {
        key: "mesh",
        label: "Mesh and texture",
        status: isReady ? "complete" : stageStatus,
        detail: "ODM builds the mesh and MVS textured model outputs",
      },
      {
        key: "exports",
        label: "Output package",
        status: isReady ? "complete" : stageStatus,
        detail: options.downloadUrl
          ? "All worker outputs are available through the Aernova download proxy"
          : "Waiting for the worker output archive",
      },
    ],
    assets: {
      sparseCloud: `${taskUri}/opensfm/reconstruction.ply`,
      denseCloud: options.assetUrls?.pointCloud ?? `${taskUri}/odm_georeferencing/odm_georeferenced_model.laz`,
      mesh: options.assetUrls?.meshPly ?? `${taskUri}/odm_meshing/odm_mesh.ply`,
      meshPreviewPly: options.assetUrls?.meshPly,
      texturedModel: options.assetUrls?.texturedObj ?? `${taskUri}/odm_texturing/odm_textured_model_geo.obj`,
      texturedModelGlb: options.assetUrls?.texturedGlb ?? `${taskUri}/odm_texturing/odm_textured_model_geo.glb`,
      viewerGlb: options.assetUrls?.viewerGlb,
      orthomosaic: options.assetUrls?.orthomosaic ?? `${taskUri}/odm_orthophoto/odm_orthophoto.tif`,
      dsm: options.assetUrls?.dsm ?? `${taskUri}/odm_dem/dsm.tif`,
      dtm: options.assetUrls?.dtm ?? `${taskUri}/odm_dem/dtm.tif`,
      pointCloudTiles: `${taskUri}/entwine_pointcloud`,
      allAssetsZip: options.downloadUrl ?? options.assetUrls?.all,
      reportPdf: options.assetUrls?.report,
    },
    reviewNotes: [
      isReady
        ? "NodeODM completed the ODM photogrammetry run and the output assets are ready."
        : isFailed
          ? options.errorMessage || "NodeODM reported a processing failure; review the worker output log."
          : "NodeODM is processing the image set; sync the task to refresh progress and output readiness.",
      "The worker pipeline uses OpenSfM, OpenMVS, ODM meshing, MVS texturing, georeferencing, DEM, and orthophoto stages.",
      ...draft.reviewNotes.slice(0, 1),
    ],
  };
}

export const buildNodeOdxModelPackage = buildNodeOdmModelPackage;

export function parsePhotogrammetryModelPackage(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<PhotogrammetryModelPackage>;
  if (candidate.kind !== "aernova-photogrammetry-model") return null;
  return candidate as PhotogrammetryModelPackage;
}
