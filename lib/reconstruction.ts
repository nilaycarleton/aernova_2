/**
 * Shared photogrammetry-reconstruction logic used by both the "use server"
 * actions (UI flow) and the import-photos CLI (hands-off flow).
 *
 * Kept free of Next-only imports (no next/cache, no Clerk) and using relative
 * imports so it also loads under plain Node via --experimental-strip-types.
 * Callers are responsible for auth and for revalidating any paths afterwards.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.ts";
import { buildCaptureQualityProfile, buildPhotogrammetryModelPackage } from "./photogrammetry-pipeline.ts";
import {
  createNodeOdmTask,
  nodeOdmAssetUrls,
  nodeOdmDownloadUrl,
  nodeOdmMaxImages,
} from "./nodeodm-client.ts";
import { buildNodeOdmModelPackage } from "./photogrammetry-pipeline.ts";

// Minimum capture-quality score (0-100) required before spending a paid worker
// run. Below this the photo set is too sparse / low-overlap to yield a usable
// model, so we block the submit instead of burning a Lightning credit.
export const MIN_CAPTURE_SCORE = 58;
export const MIN_SOURCE_IMAGES = 6;

export type ProcessingReadiness = {
  imageCount: number;
  score: number;
  label: string;
  ready: boolean;
  blockingReason: string | null;
  cap: number;
  withinCap: boolean;
  estimate: { label: string; value: string }[];
  hasActiveJob: boolean;
};

export function loadSourceImages(projectId: string) {
  return prisma.projectImagery.findMany({
    where: {
      projectId,
      type: { in: ["DRONE", "ORTHOMOSAIC"] },
      NOT: { status: "FAILED" },
    },
    orderBy: [{ captureDate: "asc" }, { createdAt: "asc" }],
  });
}

export type SourceImage = Awaited<ReturnType<typeof loadSourceImages>>[number];

// Returns a human-readable reason the set must not be processed, or null when it
// is good to go. Used both by the free preview and as a hard gate on submit.
export function captureBlockingReason(images: SourceImage[], cap: number) {
  if (images.length === 0) return "Upload drone imagery before processing a 3D model.";
  if (images.length < MIN_SOURCE_IMAGES) {
    return `Add more overlapping captures — at least ${MIN_SOURCE_IMAGES} are needed (you have ${images.length}).`;
  }
  if (images.length > cap) {
    return `This set has ${images.length} images, over the ${cap}-image per-run limit. Split it into smaller batches (or raise NODEODM_MAX_IMAGES).`;
  }
  const quality = buildCaptureQualityProfile(images);
  if (quality.score < MIN_CAPTURE_SCORE) {
    return `Capture quality is too low to process (score ${quality.score}/${MIN_CAPTURE_SCORE}). Add more nadir/oblique overlap and GPS-tagged photos before queuing.`;
  }
  return null;
}

// True when a NodeODM job for this exact source set is already queued/processing,
// so a re-click (or re-run) can't create a duplicate (paid) task.
export async function hasActiveNodeOdmJob(projectId: string, sourceImageIds: string[]) {
  const active = await prisma.processingJob.findMany({
    where: { projectId, provider: "nodeodm", status: { in: ["QUEUED", "PROCESSING"] } },
    select: { sourceImageIds: true },
  });
  const target = [...sourceImageIds].sort().join(",");
  return active.some((job) => {
    const ids = Array.isArray(job.sourceImageIds)
      ? job.sourceImageIds.filter((value): value is string => typeof value === "string")
      : [];
    return ids.length > 0 && [...ids].sort().join(",") === target;
  });
}

// Free, no-write readiness check + draft estimate.
export async function buildProcessingReadiness(projectId: string): Promise<ProcessingReadiness> {
  const sourceImages = await loadSourceImages(projectId);
  const cap = nodeOdmMaxImages();
  const quality = buildCaptureQualityProfile(sourceImages);
  const blockingReason = captureBlockingReason(sourceImages, cap);
  const hasActiveJob = await hasActiveNodeOdmJob(
    projectId,
    sourceImages.map((image) => image.id)
  );
  const draft = buildPhotogrammetryModelPackage(sourceImages);

  return {
    imageCount: sourceImages.length,
    score: quality.score,
    label: quality.label,
    ready: blockingReason === null && !hasActiveJob,
    blockingReason: hasActiveJob
      ? "A reconstruction for this image set is already in progress."
      : blockingReason,
    cap,
    withinCap: sourceImages.length <= cap,
    estimate: draft.measurements.map((measurement) => ({
      label: measurement.label,
      value: measurement.value,
    })),
    hasActiveJob,
  };
}

/**
 * Submit the project's source imagery to NodeODM and persist the MODEL record +
 * ProcessingJob. Applies the same quality/cap/duplicate gate as the UI. Throws a
 * human-readable error if the set is not processable or NODEODM is unconfigured.
 */
export async function queueNodeOdmReconstruction(
  projectId: string,
  label: string,
  quality: "standard" | "high"
): Promise<{ modelId: string; taskUuid: string }> {
  const sourceImages = await loadSourceImages(projectId);

  const blockingReason = captureBlockingReason(sourceImages, nodeOdmMaxImages());
  if (blockingReason) throw new Error(blockingReason);
  if (await hasActiveNodeOdmJob(projectId, sourceImages.map((image) => image.id))) {
    throw new Error(
      "A reconstruction for this image set is already in progress. Wait for it to finish or sync the worker."
    );
  }

  const nodeTask = await createNodeOdmTask(sourceImages, { label, quality });
  if (!nodeTask) throw new Error("NODEODM_URL is not configured");

  const model = await prisma.projectImagery.create({
    data: {
      projectId,
      type: "MODEL",
      status: "QUEUED",
      url: (buildNodeOdmModelPackage(sourceImages, {
        quality,
        taskUuid: nodeTask.uuid,
        processingStatus: "queued",
      }).previewUrl ?? sourceImages[0].url),
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
      extractedJson: buildNodeOdmModelPackage(sourceImages, {
        quality,
        taskUuid: nodeTask.uuid,
        processingStatus: "queued",
      }) as unknown as Prisma.InputJsonValue,
      notes: "NodeODM task queued. Sync worker status to update progress and collect output assets.",
    },
  });

  await prisma.projectImagery.update({
    where: { id: model.id },
    data: {
      extractedJson: buildNodeOdmModelPackage(sourceImages, {
        quality,
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
      quality,
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

  return { modelId: model.id, taskUuid: nodeTask.uuid };
}
