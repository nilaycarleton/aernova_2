import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import {
  downloadNodeOdmAllZip,
  extractZipEntry,
  nodeOdmOutputAssets,
  type NodeOdmAssetKey,
} from "@/lib/nodeodm-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function metadataObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

// Storage key for a cached worker output, shared across servers when the S3
// driver is active (local disk in dev).
function cacheKey(projectId: string, imageryId: string, fileName: string) {
  return `processing/${projectId}/${imageryId}/${fileName}`;
}

async function readLocalNodeOdmAsset(taskUuid: string, assetPath: string) {
  const dataDir = process.env.NODEODM_DATA_DIR || path.join(process.cwd(), "nodeodm-data");
  return readFile(path.join(dataDir, taskUuid, assetPath)).catch(() => null);
}

async function cachedAssetBytes(projectId: string, imageryId: string, fileName: string) {
  return storage.getBytes(cacheKey(projectId, imageryId, fileName));
}

// Fetch the task's all.zip once and cache it, so repeated asset requests extract
// from the cached archive instead of re-downloading from the worker.
async function getAllZipBytes(projectId: string, imageryId: string, taskUuid: string) {
  const cached = await storage.getBytes(cacheKey(projectId, imageryId, "all.zip"));
  if (cached) return cached;
  const bytes = await downloadNodeOdmAllZip(taskUuid);
  await storage.put(cacheKey(projectId, imageryId, "all.zip"), bytes, "application/zip");
  return bytes;
}

function contentTypeFor(fileName: string) {
  if (fileName.endsWith(".ply")) return "application/octet-stream";
  if (fileName.endsWith(".obj")) return "text/plain";
  if (fileName.endsWith(".glb")) return "model/gltf-binary";
  if (fileName.endsWith(".laz")) return "application/octet-stream";
  if (fileName.endsWith(".tif")) return "image/tiff";
  if (fileName.endsWith(".pdf")) return "application/pdf";
  if (fileName.endsWith(".zip")) return "application/zip";
  return "application/octet-stream";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; imageryId: string }> }
) {
  const { projectId, imageryId } = await params;
  const requestedAsset = new URL(request.url).searchParams.get("asset") || "all";

  const model = await prisma.projectImagery.findFirst({
    where: {
      id: imageryId,
      projectId,
      type: "MODEL",
    },
  });

  if (!model) {
    return NextResponse.json({ error: "Model imagery record was not found" }, { status: 404 });
  }

  const metadata = metadataObject(model.metadataJson);
  const taskUuid =
    typeof metadata.nodeOdmTaskUuid === "string"
      ? metadata.nodeOdmTaskUuid
      : typeof metadata.nodeOdxTaskUuid === "string"
        ? metadata.nodeOdxTaskUuid
        : "";

  if (!taskUuid) {
    return NextResponse.json({ error: "This model is not linked to a NodeODM task" }, { status: 400 });
  }

  try {
    const assetPath = requestedAsset in nodeOdmOutputAssets
      ? nodeOdmOutputAssets[requestedAsset as NodeOdmAssetKey]
      : requestedAsset;
    const fileName = assetPath.split("/").pop() || `${imageryId}-odm-asset`;
    const headers = new Headers();
    headers.set("Content-Disposition", `attachment; filename="${fileName}"`);
    headers.set("Content-Type", contentTypeFor(fileName));
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    if (requestedAsset === "viewerGlb") {
      const viewerFileName = "viewer.glb";
      const viewerHeaders = new Headers(headers);
      viewerHeaders.set("Content-Disposition", `inline; filename="${viewerFileName}"`);
      viewerHeaders.set("Content-Type", "model/gltf-binary");

      const cachedViewer = await cachedAssetBytes(projectId, imageryId, viewerFileName);
      if (cachedViewer) {
        viewerHeaders.set("X-Aernova-Viewer-Asset", "cached");
        return new Response(new Uint8Array(cachedViewer), {
          status: 200,
          headers: viewerHeaders,
        });
      }

      const localFullModel = await readLocalNodeOdmAsset(taskUuid, nodeOdmOutputAssets.texturedGlb);
      const fullBytes =
        localFullModel ??
        extractZipEntry(await getAllZipBytes(projectId, imageryId, taskUuid), nodeOdmOutputAssets.texturedGlb);
      if (!fullBytes) {
        return NextResponse.json({ error: "Textured GLB not found in worker output" }, { status: 404 });
      }
      await storage.put(cacheKey(projectId, imageryId, viewerFileName), fullBytes, "model/gltf-binary");

      viewerHeaders.set("X-Aernova-Viewer-Asset", "textured-glb");
      viewerHeaders.set("X-Aernova-Viewer-Bytes", String(fullBytes.byteLength));
      return new Response(new Uint8Array(fullBytes), {
        status: 200,
        headers: viewerHeaders,
      });
    }

    // The full archive is served (and cached) directly.
    if (requestedAsset === "all") {
      const zip = await getAllZipBytes(projectId, imageryId, taskUuid);
      return new Response(new Uint8Array(zip), { status: 200, headers });
    }

    const cached = await cachedAssetBytes(projectId, imageryId, fileName);
    if (cached) {
      return new Response(new Uint8Array(cached), { status: 200, headers });
    }

    // Prefer a shared-disk read (dev), else extract the entry from all.zip.
    const bytes =
      (await readLocalNodeOdmAsset(taskUuid, assetPath)) ??
      extractZipEntry(await getAllZipBytes(projectId, imageryId, taskUuid), assetPath);
    if (!bytes) {
      return NextResponse.json({ error: `Asset ${requestedAsset} not found in worker output` }, { status: 404 });
    }
    await storage.put(cacheKey(projectId, imageryId, fileName), bytes, contentTypeFor(fileName));

    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to download NodeODM asset" },
      { status: 502 }
    );
  }
}
