import { readFile } from "fs/promises";
import path from "path";
import { ProjectImagery } from "@prisma/client";

type NodeOdmTaskResponse = {
  uuid?: string;
  error?: string;
};

export type NodeOdmTaskInfo = {
  uuid: string;
  name?: string;
  status: {
    code: 10 | 20 | 30 | 40 | 50;
    errorMessage?: string;
  };
  progress?: number;
  output?: string[];
};

type CreateTaskOptions = {
  label: string;
  quality: "standard" | "high";
};

export type NodeOdmOption = {
  name: string;
  value: string | number | boolean;
};

export type NodeOdmWorkerHealth = {
  configured: boolean;
  online: boolean;
  baseUrl: string | null;
  version?: string;
  engine?: string;
  queueCount?: number;
  runningCount?: number;
  optionsCount?: number;
  checkedAt: string;
  errorMessage?: string;
};

const defaultNodeOdmOptions: NodeOdmOption[] = [
  { name: "dsm", value: true },
  { name: "dtm", value: true },
  { name: "gltf", value: true },
  { name: "cog", value: true },
  { name: "orthophoto-resolution", value: 5 },
  { name: "feature-quality", value: "high" },
  { name: "pc-quality", value: "medium" },
];

const outputAssets = {
  all: "all.zip",
  viewerGlb: "viewer.glb",
  meshPly: "odm_meshing/odm_mesh.ply",
  texturedObj: "odm_texturing/odm_textured_model_geo.obj",
  texturedGlb: "odm_texturing/odm_textured_model_geo.glb",
  pointCloud: "odm_georeferencing/odm_georeferenced_model.laz",
  orthomosaic: "odm_orthophoto/odm_orthophoto.tif",
  dsm: "odm_dem/dsm.tif",
  dtm: "odm_dem/dtm.tif",
  report: "odm_report/report.pdf",
} as const;

export type NodeOdmAssetKey = keyof typeof outputAssets;

function getNodeOdmBaseUrl() {
  return (process.env.NODEODM_URL || process.env.NODEODX_URL)?.replace(/\/$/, "") || null;
}

function withToken(url: URL) {
  const token = process.env.NODEODM_TOKEN || process.env.NODEODX_TOKEN;
  if (token) url.searchParams.set("token", token);
  return url;
}

function publicFilePath(url: string) {
  if (!url.startsWith("/uploads/")) {
    throw new Error(`Only local uploaded imagery can be sent to NodeODM: ${url}`);
  }

  return path.join(process.cwd(), "public", url);
}

export function nodeOdmTaskOptions(quality: "standard" | "high") {
  const configured = process.env.NODEODM_OPTIONS_JSON || process.env.NODEODX_OPTIONS_JSON;

  if (configured) {
    const parsed = JSON.parse(configured) as NodeOdmOption[];
    if (!Array.isArray(parsed)) throw new Error("NODEODM_OPTIONS_JSON must be an array");
    for (const option of parsed) {
      if (
        !option ||
        typeof option !== "object" ||
        typeof option.name !== "string" ||
        !["string", "number", "boolean"].includes(typeof option.value)
      ) {
        throw new Error("NODEODM_OPTIONS_JSON entries must have string names and primitive values");
      }
    }
    return parsed;
  }

  return defaultNodeOdmOptions.map((option) => {
    if (option.name === "pc-quality") return { ...option, value: quality === "high" ? "high" : "medium" };
    if (option.name === "orthophoto-resolution") return { ...option, value: quality === "high" ? 2 : 5 };
    return option;
  });
}

function assetName(asset: NodeOdmAssetKey | string) {
  return asset in outputAssets ? outputAssets[asset as NodeOdmAssetKey] : asset;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function isNodeOdmConfigured() {
  return Boolean(getNodeOdmBaseUrl());
}

export function nodeOdmDownloadUrl(projectId: string, imageryId: string, asset: NodeOdmAssetKey | string = "all") {
  const params = new URLSearchParams({ asset });
  return `/api/projects/${projectId}/processing/${imageryId}/download?${params.toString()}`;
}

export function nodeOdmAssetUrls(projectId: string, imageryId: string) {
  return Object.fromEntries(
    Object.keys(outputAssets).map((asset) => [
      asset,
      nodeOdmDownloadUrl(projectId, imageryId, asset),
    ])
  ) as Record<NodeOdmAssetKey, string>;
}

export async function createNodeOdmTask(images: ProjectImagery[], options: CreateTaskOptions) {
  const baseUrl = getNodeOdmBaseUrl();
  if (!baseUrl) return null;

  const endpoint = withToken(new URL("/task/new", baseUrl));
  const formData = new FormData();
  formData.set("name", options.label);
  formData.set("options", JSON.stringify(nodeOdmTaskOptions(options.quality)));

  for (const image of images) {
    const bytes = await readFile(publicFilePath(image.url));
    const blob = new Blob([bytes], {
      type: image.contentType || "application/octet-stream",
    });
    formData.append("images", blob, image.fileName || path.basename(image.url));
  }

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json().catch(() => ({}))) as NodeOdmTaskResponse;

  if (!response.ok || payload.error || !payload.uuid) {
    throw new Error(payload.error || `NodeODM task creation failed with ${response.status}`);
  }

  return {
    uuid: payload.uuid,
    options: nodeOdmTaskOptions(options.quality),
  };
}

export async function getNodeOdmWorkerHealth(): Promise<NodeOdmWorkerHealth> {
  const baseUrl = getNodeOdmBaseUrl();
  const checkedAt = new Date().toISOString();

  if (!baseUrl) {
    return {
      configured: false,
      online: false,
      baseUrl: null,
      checkedAt,
      errorMessage: "NODEODM_URL is not configured",
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const [infoResponse, optionsResponse] = await Promise.all([
      fetch(withToken(new URL("/info", baseUrl)), {
        cache: "no-store",
        signal: controller.signal,
      }),
      fetch(withToken(new URL("/options", baseUrl)), {
        cache: "no-store",
        signal: controller.signal,
      }).catch(() => null),
    ]);
    clearTimeout(timeout);

    const info = (await infoResponse.json().catch(() => ({}))) as Record<string, unknown>;
    const options = optionsResponse?.ok
      ? ((await optionsResponse.json().catch(() => [])) as unknown)
      : [];

    if (!infoResponse.ok) {
      throw new Error(`NodeODM health check failed with ${infoResponse.status}`);
    }

    return {
      configured: true,
      online: true,
      baseUrl,
      version: typeof info.version === "string" ? info.version : undefined,
      engine: typeof info.engine === "string" ? info.engine : "ODM",
      queueCount: numberValue(info.taskQueueCount) ?? numberValue(info.queueCount),
      runningCount: numberValue(info.runningTasks) ?? numberValue(info.runningCount),
      optionsCount: Array.isArray(options) ? options.length : undefined,
      checkedAt,
    };
  } catch (error) {
    return {
      configured: true,
      online: false,
      baseUrl,
      checkedAt,
      errorMessage: error instanceof Error ? error.message : "NodeODM health check failed",
    };
  }
}

export async function getNodeOdmTaskInfo(uuid: string) {
  const baseUrl = getNodeOdmBaseUrl();
  if (!baseUrl) throw new Error("NODEODM_URL is not configured");

  const endpoint = withToken(new URL(`/task/${uuid}/info`, baseUrl));
  const response = await fetch(endpoint, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as NodeOdmTaskInfo & {
    error?: string;
  };

  if (!response.ok || payload.error) {
    throw new Error(payload.error || `NodeODM status check failed with ${response.status}`);
  }

  return payload;
}

export async function downloadNodeOdmAsset(uuid: string, asset: NodeOdmAssetKey | string = "all") {
  const baseUrl = getNodeOdmBaseUrl();
  if (!baseUrl) throw new Error("NODEODM_URL is not configured");

  const endpoint = withToken(new URL(`/task/${uuid}/download/${assetName(asset)}`, baseUrl));
  const response = await fetch(endpoint, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`NodeODM asset download failed with ${response.status}`);
  }

  return response;
}

export function nodeOdmStatusToProcessingStatus(code: NodeOdmTaskInfo["status"]["code"]) {
  switch (code) {
    case 10:
      return "QUEUED";
    case 20:
      return "PROCESSING";
    case 40:
      return "READY";
    case 30:
    case 50:
    default:
      return "FAILED";
  }
}

export const nodeOdmOutputAssets = outputAssets;

export const isNodeOdxConfigured = isNodeOdmConfigured;
export const nodeOdxDownloadUrl = nodeOdmDownloadUrl;
export const createNodeOdxTask = createNodeOdmTask;
export const getNodeOdxTaskInfo = getNodeOdmTaskInfo;
export const downloadNodeOdxArchive = downloadNodeOdmAsset;
export const nodeOdxStatusToProcessingStatus = nodeOdmStatusToProcessingStatus;
