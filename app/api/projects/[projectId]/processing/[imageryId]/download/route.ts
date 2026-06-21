import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { downloadNodeOdmAsset, nodeOdmOutputAssets, type NodeOdmAssetKey } from "@/lib/nodeodm-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function metadataObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function cachedAssetPath(projectId: string, imageryId: string, fileName: string) {
  return path.join(process.cwd(), "public", "uploads", "processing", projectId, imageryId, fileName);
}

async function readLocalNodeOdmAsset(taskUuid: string, assetPath: string) {
  const dataDir = process.env.NODEODM_DATA_DIR || path.join(process.cwd(), "nodeodm-data");
  return readFile(path.join(dataDir, taskUuid, assetPath)).catch(() => null);
}

async function cachedAssetBytes(projectId: string, imageryId: string, fileName: string) {
  return readFile(cachedAssetPath(projectId, imageryId, fileName)).catch(() => null);
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
    const cachedPath = cachedAssetPath(projectId, imageryId, fileName);
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
        return new Response(cachedViewer, {
          status: 200,
          headers: viewerHeaders,
        });
      }

      const cachedFullModel = await cachedAssetBytes(projectId, imageryId, "odm_textured_model_geo.glb");
      const localFullModel = cachedFullModel ?? await readLocalNodeOdmAsset(taskUuid, nodeOdmOutputAssets.texturedGlb);
      const bytes = localFullModel ?? Buffer.from(await (await downloadNodeOdmAsset(taskUuid, "texturedGlb")).arrayBuffer());
      const outputPath = cachedAssetPath(projectId, imageryId, viewerFileName);
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(cachedAssetPath(projectId, imageryId, "odm_textured_model_geo.glb"), bytes);
      await writeFile(outputPath, bytes);

      viewerHeaders.set("X-Aernova-Viewer-Asset", bytes.byteLength <= 10_000_000 ? "preview" : "full-fallback");
      viewerHeaders.set("X-Aernova-Viewer-Bytes", String(bytes.byteLength));
      return new Response(bytes, {
        status: 200,
        headers: viewerHeaders,
      });
    }

    if (requestedAsset !== "all") {
      const cached = await cachedAssetBytes(projectId, imageryId, fileName);
      if (cached) {
        return new Response(cached, {
          status: 200,
          headers,
        });
      }
    }

    const localAsset = requestedAsset !== "all" ? await readLocalNodeOdmAsset(taskUuid, assetPath) : null;
    if (localAsset) {
      await mkdir(path.dirname(cachedPath), { recursive: true });
      await writeFile(cachedPath, localAsset);
      return new Response(localAsset, {
        status: 200,
        headers,
      });
    }

    const asset = await downloadNodeOdmAsset(taskUuid, requestedAsset);
    if (requestedAsset === "all") {
      return new Response(asset.body, {
        status: asset.status,
        headers,
      });
    }

    const bytes = Buffer.from(await asset.arrayBuffer());
    await mkdir(path.dirname(cachedPath), { recursive: true });
    await writeFile(cachedPath, bytes);

    return new Response(bytes, {
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
