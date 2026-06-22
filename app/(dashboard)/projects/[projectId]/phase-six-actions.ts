"use server";

import path from "path";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { ImageryType, Prisma, ProcessingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import {
  buildNodeOdmModelPackage,
  buildPhotogrammetryModelPackage,
} from "@/lib/photogrammetry-pipeline";
import {
  createNodeOdmTask,
  isNodeOdmConfigured,
  nodeOdmAssetUrls,
  nodeOdmDownloadUrl,
} from "@/lib/nodeodm-client";
import {
  materializeDroneMeasurements,
  syncNodeOdmModelJob,
} from "@/lib/processing-jobs";
import {
  buildPlanPreviewForModel,
  extractAndPersistRoof,
} from "@/lib/roof-extraction-service";
import type { PlanPreview, RoofExtractionSummary } from "@/lib/roof-extraction-types";

const imageryTypes = new Set(["DRONE", "ORTHOMOSAIC", "MODEL", "BEFORE", "AFTER"]);
const statuses = new Set(["UPLOADED", "QUEUED", "PROCESSING", "READY", "NEEDS_REVIEW", "FAILED"]);
const modelQualities = new Set(["standard", "high"]);

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getOptionalNumber(formData: FormData, key: string) {
  const raw = getString(formData, key);
  if (!raw) return null;
  const value = Number(raw);
  if (Number.isNaN(value)) throw new Error(`Invalid number for ${key}`);
  return value;
}

export async function uploadProjectImageryAction(formData: FormData) {
  const projectId = getString(formData, "projectId");
  const typeRaw = getString(formData, "type");
  const notes = getString(formData, "notes");
  const captureDateRaw = getString(formData, "captureDate");
  const captureTimeRaw = getString(formData, "captureTime");
  const files = [...formData.getAll("images"), formData.get("image")].filter(
    (file): file is File => file instanceof File && file.size > 0
  );

  if (!projectId) throw new Error("Missing projectId");
  if (!imageryTypes.has(typeRaw)) throw new Error("Invalid imagery type");
  if (files.length === 0) throw new Error("Choose one or more images to upload");
  if (files.some((file) => !file.type.startsWith("image/"))) {
    throw new Error("Only image uploads are supported in this MVP");
  }

  const batchId = randomUUID();
  const captureDate =
    captureDateRaw && captureTimeRaw
      ? new Date(`${captureDateRaw}T${captureTimeRaw}`)
      : captureDateRaw
        ? new Date(`${captureDateRaw}T12:00`)
        : null;

  if (captureDateRaw && Number.isNaN(captureDate?.getTime())) {
    throw new Error("Capture date is invalid");
  }
  if (captureTimeRaw && !/^\d{2}:\d{2}$/.test(captureTimeRaw)) {
    throw new Error("Capture time is invalid");
  }

  for (const [index, file] of files.entries()) {
    const extension = path.extname(file.name).toLowerCase() || ".jpg";
    const storedName = `${randomUUID()}${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { url } = await storage.put(`imagery/${projectId}/${storedName}`, bytes, file.type);

    await prisma.projectImagery.create({
      data: {
        projectId,
        type: typeRaw as ImageryType,
        status: "UPLOADED",
        url,
        fileName: file.name,
        contentType: file.type,
        captureDate,
        altitudeFt: getOptionalNumber(formData, "altitudeFt"),
        notes: notes || null,
        metadataJson: {
          source: typeRaw,
          uploadedVia: "phase-six-mvp",
          batchId,
          batchIndex: index + 1,
          fileSizeBytes: file.size,
          originalName: file.name,
          captureDate: captureDateRaw || null,
          captureTime: captureTimeRaw || null,
          photogrammetryRole: typeRaw === "DRONE" ? "source-capture" : "reference",
        },
      },
    });
  }

  revalidatePath(`/projects/${projectId}`);
}

export async function updateImageryStatusAction(formData: FormData) {
  const projectId = getString(formData, "projectId");
  const imageryId = getString(formData, "imageryId");
  const statusRaw = getString(formData, "status");

  if (!projectId) throw new Error("Missing projectId");
  if (!imageryId) throw new Error("Missing imageryId");
  if (!statuses.has(statusRaw)) throw new Error("Invalid status");

  await prisma.projectImagery.update({
    where: { id: imageryId },
    data: { status: statusRaw as ProcessingStatus },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function generateExtractionSuggestionAction(formData: FormData) {
  const projectId = getString(formData, "projectId");
  const imageryId = getString(formData, "imageryId");

  if (!projectId) throw new Error("Missing projectId");
  if (!imageryId) throw new Error("Missing imageryId");

  const extraction: Prisma.InputJsonValue = {
    generatedAt: new Date().toISOString(),
    confidence: 82,
    planes: [
      { label: "AI Plane A", pitchRatio: "8/12", areaSqft: 1260, edgeFt: 142 },
      { label: "AI Plane B", pitchRatio: "8/12", areaSqft: 1185, edgeFt: 136 },
      { label: "Garage plane", pitchRatio: "6/12", areaSqft: 465, edgeFt: 78 },
    ],
    edges: [
      { type: "ridge", lengthFt: 64 },
      { type: "valley", lengthFt: 28 },
      { type: "eave", lengthFt: 114 },
    ],
    reviewNote: "AI extraction is a planning draft. Confirm roof planes and edges before final estimate.",
  };

  await prisma.projectImagery.update({
    where: { id: imageryId },
    data: {
      status: "NEEDS_REVIEW",
      extractedJson: extraction,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function processPhotogrammetryModelAction(formData: FormData) {
  const projectId = getString(formData, "projectId");
  const label = getString(formData, "label") || "Drone photogrammetry model";
  const qualityRaw = getString(formData, "quality") || "standard";

  if (!projectId) throw new Error("Missing projectId");
  if (!modelQualities.has(qualityRaw)) throw new Error("Invalid model quality");

  const sourceImages = await prisma.projectImagery.findMany({
    where: {
      projectId,
      type: { in: ["DRONE", "ORTHOMOSAIC"] },
      NOT: { status: "FAILED" },
    },
    orderBy: [{ captureDate: "asc" }, { createdAt: "asc" }],
  });

  if (sourceImages.length === 0) {
    throw new Error("Upload drone imagery before processing a 3D model");
  }

  if (isNodeOdmConfigured()) {
    const nodeTask = await createNodeOdmTask(sourceImages, {
      label,
      quality: qualityRaw as "standard" | "high",
    });

    if (!nodeTask) throw new Error("NODEODM_URL is not configured");

    const modelPackage = buildNodeOdmModelPackage(sourceImages, {
      quality: qualityRaw as "standard" | "high",
      taskUuid: nodeTask.uuid,
      processingStatus: "queued",
    });

    const model = await prisma.projectImagery.create({
      data: {
        projectId,
        type: "MODEL",
        status: "QUEUED",
        url: modelPackage.previewUrl ?? sourceImages[0].url,
        fileName: label,
        contentType: "application/vnd.aernova.model+json",
        captureDate: sourceImages[0].captureDate,
        altitudeFt: sourceImages[0].altitudeFt,
        metadataJson: {
          source: "NodeODM / ODM photogrammetry pipeline",
          nodeOdmTaskUuid: nodeTask.uuid,
          nodeOdmOptions: nodeTask.options,
          nodeOdxTaskUuid: nodeTask.uuid,
          nodeOdxOptions: nodeTask.options,
          sourceImageIds: sourceImages.map((image) => image.id),
        },
        extractedJson: modelPackage as unknown as Prisma.InputJsonValue,
        notes: "NodeODM task queued. Sync worker status to update progress and collect output assets.",
      },
    });

    await prisma.projectImagery.update({
      where: { id: model.id },
      data: {
        extractedJson: buildNodeOdmModelPackage(sourceImages, {
          quality: qualityRaw as "standard" | "high",
          taskUuid: nodeTask.uuid,
          processingStatus: "queued",
          downloadUrl: nodeOdmDownloadUrl(projectId, model.id),
          assetUrls: nodeOdmAssetUrls(projectId, model.id),
        }) as unknown as Prisma.InputJsonValue,
      },
    });

    await prisma.processingJob.create({
      data: {
        projectId,
        modelImageryId: model.id,
        provider: "nodeodm",
        providerTaskId: nodeTask.uuid,
        status: "QUEUED",
        quality: qualityRaw,
        sourceImageIds: sourceImages.map((image) => image.id),
        optionsJson: nodeTask.options as unknown as Prisma.InputJsonValue,
        outputsJson: {
          assetUrls: nodeOdmAssetUrls(projectId, model.id),
          manifestUrl: null,
        },
      },
    });

    await prisma.projectImagery.updateMany({
      where: {
        id: { in: sourceImages.map((image) => image.id) },
        status: { in: ["UPLOADED", "READY"] },
      },
      data: { status: "QUEUED" },
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/report`);
    return;
  }

  const modelPackage = buildPhotogrammetryModelPackage(sourceImages, {
    quality: qualityRaw as "standard" | "high",
  });
  const modelStatus: ProcessingStatus = sourceImages.length >= 6 ? "READY" : "NEEDS_REVIEW";

  await prisma.$transaction([
    prisma.projectImagery.updateMany({
      where: {
        id: { in: sourceImages.map((image) => image.id) },
        status: { in: ["UPLOADED", "QUEUED", "PROCESSING"] },
      },
      data: { status: "READY" },
    }),
    prisma.projectImagery.create({
      data: {
        projectId,
        type: "MODEL",
        status: modelStatus,
        url: modelPackage.previewUrl ?? sourceImages[0].url,
        fileName: label,
        contentType: "application/vnd.aernova.model+json",
        captureDate: sourceImages[0].captureDate,
        altitudeFt: sourceImages[0].altitudeFt,
        metadataJson: {
          source: "Aernova Phase 6 photogrammetry pipeline",
          sourceImageIds: sourceImages.map((image) => image.id),
          webODMCompatibleAssets: modelPackage.assets,
        },
        extractedJson: modelPackage as unknown as Prisma.InputJsonValue,
        notes:
          modelStatus === "READY"
            ? "Model package generated for viewer measurements and WebODM asset handoff."
            : "Draft model package generated; add more overlapping drone captures before production use.",
      },
    }),
  ]);

  const latestModel = await prisma.projectImagery.findFirst({
    where: {
      projectId,
      type: "MODEL",
      fileName: label,
    },
    orderBy: { createdAt: "desc" },
  });

  if (latestModel) {
    await prisma.processingJob.create({
      data: {
        projectId,
        modelImageryId: latestModel.id,
        provider: "aernova-draft",
        status: modelStatus,
        quality: qualityRaw,
        sourceImageIds: sourceImages.map((image) => image.id),
        outputsJson: {
          draftAssets: modelPackage.assets,
        },
        completedAt: new Date(),
      },
    });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/report`);
}

export async function syncNodeOdmTaskAction(formData: FormData) {
  const projectId = getString(formData, "projectId");
  const imageryId = getString(formData, "imageryId");

  if (!projectId) throw new Error("Missing projectId");
  if (!imageryId) throw new Error("Missing imageryId");

  await syncNodeOdmModelJob(projectId, imageryId);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/report`);
}

export const syncNodeOdxTaskAction = syncNodeOdmTaskAction;

export async function materializeDroneMeasurementsAction(formData: FormData) {
  const projectId = getString(formData, "projectId");
  const imageryId = getString(formData, "imageryId");

  if (!projectId) throw new Error("Missing projectId");
  if (!imageryId) throw new Error("Missing imageryId");

  await materializeDroneMeasurements(projectId, imageryId);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/report`);
}

export async function prepareRoofExtractionAction(
  projectId: string,
  imageryId: string
): Promise<PlanPreview> {
  if (!projectId) throw new Error("Missing projectId");
  if (!imageryId) throw new Error("Missing imageryId");

  return buildPlanPreviewForModel(projectId, imageryId);
}

export async function extractRoofFromMeshAction(
  projectId: string,
  imageryId: string,
  roiPolygon: { x: number; y: number }[]
): Promise<RoofExtractionSummary> {
  if (!projectId) throw new Error("Missing projectId");
  if (!imageryId) throw new Error("Missing imageryId");

  const result = await extractAndPersistRoof(projectId, imageryId, roiPolygon);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/report`);

  return {
    facetCount: result.extraction.facetCount,
    totalSurfaceAreaSqft: result.extraction.totalSurfaceAreaSqft,
    totalProjectedAreaSqft: result.extraction.totalProjectedAreaSqft,
    roofSquares: result.extraction.roofSquares,
    predominantPitchRatio: result.extraction.predominantPitchRatio,
    pitchBreakdown: result.extraction.pitchBreakdown,
    diagnostics: {
      trianglesInRoi: result.extraction.diagnostics.trianglesInRoi,
      trianglesSegmented: result.extraction.diagnostics.trianglesSegmented,
    },
    sectionsCreated: result.sectionsCreated,
  };
}

export async function createRoofComparisonAction(formData: FormData) {
  const projectId = getString(formData, "projectId");
  const title = getString(formData, "title");
  const summary = getString(formData, "summary");
  const beforeUrl = getString(formData, "beforeUrl");
  const afterUrl = getString(formData, "afterUrl");

  if (!projectId) throw new Error("Missing projectId");
  if (!title) throw new Error("Comparison title is required");

  await prisma.roofComparison.create({
    data: {
      projectId,
      title,
      beforeUrl: beforeUrl || null,
      afterUrl: afterUrl || null,
      summary: summary || null,
      differencesJson: [
        "Pre-job photo evidence captured",
        "Post-job comparison pending or ready for client sheet",
        "Use this sheet for inspection comparison and completion documentation",
      ],
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/report`);
}
