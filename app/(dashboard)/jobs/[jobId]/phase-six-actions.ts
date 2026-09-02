"use server";

import path from "path";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { ImageryType, Prisma, ProcessingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { keyFromUrl, storage } from "@/lib/storage";
import { buildPhotogrammetryModelPackage } from "@/lib/photogrammetry-pipeline";
import { isNodeOdmConfigured } from "@/lib/nodeodm-client";
import { requireJobAccess } from "@/lib/auth";
import { parseDroneImageMetadata } from "@/lib/drone-metadata";
import {
  isSupportedImageryUpload,
  looksLikeJpeg,
  looksLikeTiff,
  parseGeoTiffMetadata,
} from "@/lib/geotiff-metadata";
import {
  buildProcessingReadiness,
  loadSourceImages,
  queueNodeOdmReconstruction,
  type ProcessingReadiness,
} from "@/lib/reconstruction";
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
  const jobId = getString(formData, "jobId");
  const typeRaw = getString(formData, "type");
  const notes = getString(formData, "notes");
  const captureDateRaw = getString(formData, "captureDate");
  const captureTimeRaw = getString(formData, "captureTime");
  const files = [...formData.getAll("images"), formData.get("image")].filter(
    (file): file is File => file instanceof File && file.size > 0
  );

  if (!jobId) throw new Error("Missing jobId");
  if (!imageryTypes.has(typeRaw)) throw new Error("Invalid imagery type");
  if (files.length === 0) throw new Error("Choose one or more images to upload");
  await requireJobAccess(jobId, "editJob");

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

  const formAltitude = getOptionalNumber(formData, "altitudeFt");

  for (const [index, file] of files.entries()) {
    const extension = path.extname(file.name).toLowerCase() || ".jpg";
    const storedName = `${randomUUID()}${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    // Identify the container by magic bytes rather than trusting the
    // extension or the browser-supplied MIME type, since either can lie
    // (§13 of the imagery-input requirements). GeoTIFF orthomosaics/DSMs
    // carry their own georeferencing instead of JPEG GPS EXIF, so the two
    // kinds feed different metadata extractors.
    const isTiff = looksLikeTiff(bytes);
    const isJpeg = !isTiff && looksLikeJpeg(bytes);
    const fileKind = isTiff ? "geotiff" : isJpeg ? "jpeg" : "other";
    if (!isSupportedImageryUpload(bytes, file.type)) {
      throw new Error("Only image uploads are supported in this MVP");
    }
    const { url } = await storage.put(`imagery/${jobId}/${storedName}`, bytes, file.type);

    // Recover GPS / altitude / capture date from the drone image itself so the
    // geotag and capture-QA stages reflect the real data. Form values win when
    // the operator supplied them.
    const droneMeta = isJpeg
      ? parseDroneImageMetadata(bytes, file.name)
      : { latitude: null, longitude: null, altitudeFt: null, captureDate: null };
    const geoTiffMeta = isTiff ? parseGeoTiffMetadata(bytes) : null;
    const effectiveAltitude = formAltitude ?? droneMeta.altitudeFt;
    const effectiveCaptureDate = captureDate ?? droneMeta.captureDate;

    await prisma.projectImagery.create({
      data: {
        jobId,
        type: typeRaw as ImageryType,
        status: "UPLOADED",
        url,
        fileName: file.name,
        contentType: file.type,
        captureDate: effectiveCaptureDate,
        altitudeFt: effectiveAltitude,
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
          fileKind,
          latitude: droneMeta.latitude ?? undefined,
          longitude: droneMeta.longitude ?? undefined,
          gps: droneMeta.latitude != null && droneMeta.longitude != null ? true : undefined,
          exifAltitudeFt: droneMeta.altitudeFt ?? undefined,
          exifCaptureDate: droneMeta.captureDate?.toISOString() ?? undefined,
          geotiff: geoTiffMeta
            ? {
                hasGeoreferencing: geoTiffMeta.hasGeoreferencing,
                epsg: geoTiffMeta.epsg ?? undefined,
                crsKind: geoTiffMeta.crsKind ?? undefined,
                imageWidth: geoTiffMeta.imageWidth ?? undefined,
                imageHeight: geoTiffMeta.imageHeight ?? undefined,
                pixelSize: geoTiffMeta.pixelSize ?? undefined,
                origin: geoTiffMeta.origin ?? undefined,
              }
            : undefined,
        },
      },
    });
  }

  revalidatePath(`/jobs/${jobId}`);
}

export async function updateImageryStatusAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const imageryId = getString(formData, "imageryId");
  const statusRaw = getString(formData, "status");

  if (!jobId) throw new Error("Missing jobId");
  if (!imageryId) throw new Error("Missing imageryId");
  if (!statuses.has(statusRaw)) throw new Error("Invalid status");
  await requireJobAccess(jobId, "editJob");

  // Scope the write by jobId too: owning `jobId` must not let a caller
  // mutate another job's imagery via a mismatched imageryId.
  const updated = await prisma.projectImagery.updateMany({
    where: { id: imageryId, jobId },
    data: { status: statusRaw as ProcessingStatus },
  });
  if (updated.count === 0) throw new Error("Imagery not found");

  revalidatePath(`/jobs/${jobId}`);
}

export async function generateExtractionSuggestionAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const imageryId = getString(formData, "imageryId");

  if (!jobId) throw new Error("Missing jobId");
  if (!imageryId) throw new Error("Missing imageryId");
  await requireJobAccess(jobId, "editJob");

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

  const updated = await prisma.projectImagery.updateMany({
    where: { id: imageryId, jobId },
    data: {
      status: "NEEDS_REVIEW",
      extractedJson: extraction,
    },
  });
  if (updated.count === 0) throw new Error("Imagery not found");

  revalidatePath(`/jobs/${jobId}`);
}

// Free, no-write readiness check + draft estimate. Lets the operator preview the
// capture score and rough numbers before committing a paid reconstruction.
export async function previewPhotogrammetryModelAction(jobId: string): Promise<ProcessingReadiness> {
  if (!jobId) throw new Error("Missing jobId");
  await requireJobAccess(jobId, "editJob");
  return buildProcessingReadiness(jobId);
}

export async function processPhotogrammetryModelAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const label = getString(formData, "label") || "Drone photogrammetry model";
  const qualityRaw = getString(formData, "quality") || "standard";

  if (!jobId) throw new Error("Missing jobId");
  if (!modelQualities.has(qualityRaw)) throw new Error("Invalid model quality");
  await requireJobAccess(jobId, "editJob");

  const sourceImages = await loadSourceImages(jobId);

  if (sourceImages.length === 0) {
    throw new Error("Upload drone imagery before processing a 3D model");
  }

  if (isNodeOdmConfigured()) {
    // Gate + submit + record creation live in the shared reconstruction module
    // so the UI flow and the import-photos CLI stay in lockstep.
    await queueNodeOdmReconstruction(jobId, label, qualityRaw as "standard" | "high");

    revalidatePath(`/jobs/${jobId}`);
    revalidatePath(`/jobs/${jobId}/report`);
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
        jobId,
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
      jobId,
      type: "MODEL",
      fileName: label,
    },
    orderBy: { createdAt: "desc" },
  });

  if (latestModel) {
    await prisma.processingJob.create({
      data: {
        jobId,
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

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}/report`);
}

export async function syncNodeOdmTaskAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const imageryId = getString(formData, "imageryId");

  if (!jobId) throw new Error("Missing jobId");
  if (!imageryId) throw new Error("Missing imageryId");
  await requireJobAccess(jobId, "editJob");

  await syncNodeOdmModelJob(jobId, imageryId);

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}/report`);
}

export const syncNodeOdxTaskAction = syncNodeOdmTaskAction;

export async function materializeDroneMeasurementsAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const imageryId = getString(formData, "imageryId");

  if (!jobId) throw new Error("Missing jobId");
  if (!imageryId) throw new Error("Missing imageryId");
  await requireJobAccess(jobId, "editJob");

  await materializeDroneMeasurements(jobId, imageryId);

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}/report`);
}

export async function prepareRoofExtractionAction(
  jobId: string,
  imageryId: string
): Promise<PlanPreview> {
  if (!jobId) throw new Error("Missing jobId");
  if (!imageryId) throw new Error("Missing imageryId");
  await requireJobAccess(jobId, "editJob");

  return buildPlanPreviewForModel(jobId, imageryId);
}

export async function extractRoofFromMeshAction(
  jobId: string,
  imageryId: string,
  roiPolygon: { x: number; y: number }[]
): Promise<RoofExtractionSummary> {
  if (!jobId) throw new Error("Missing jobId");
  if (!imageryId) throw new Error("Missing imageryId");
  await requireJobAccess(jobId, "editJob");

  const result = await extractAndPersistRoof(jobId, imageryId, roiPolygon);

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}/report`);

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

// Creating a before/after comparison (with its photo uploads) now lives in the
// route handler app/api/jobs/[jobId]/comparisons/route.ts, so the photos
// aren't capped by the 1 MB Server Action body limit.

/**
 * Remove a before/after sheet, the two photos it was built from, and their
 * stored bytes. Creating a comparison also records BEFORE/AFTER job imagery
 * (see app/api/.../comparisons/route.ts) so the photos land in the library —
 * deleting only the sheet would leave those two photos loose in the report with
 * nothing explaining them. Storage cleanup is best-effort: a missing file must
 * not strand the database rows, or the sheet becomes undeletable.
 */
export async function deleteComparisonAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const comparisonId = getString(formData, "comparisonId");

  if (!jobId) throw new Error("Missing jobId");
  if (!comparisonId) throw new Error("Missing comparisonId");
  await requireJobAccess(jobId, "editJob");

  const comparison = await prisma.roofComparison.findFirst({
    where: { id: comparisonId, jobId },
    select: { id: true, beforeUrl: true, afterUrl: true },
  });
  if (!comparison) throw new Error("Comparison not found");

  const urls = [comparison.beforeUrl, comparison.afterUrl].filter(
    (url): url is string => Boolean(url)
  );

  // Delete the sheet first: it is the row the UI is waiting on, and orphaned
  // imagery is recoverable where a half-deleted sheet is not.
  await prisma.roofComparison.delete({ where: { id: comparison.id } });

  if (urls.length > 0) {
    await prisma.projectImagery.deleteMany({
      where: { jobId, url: { in: urls } },
    });

    await Promise.all(
      urls.map(async (url) => {
        try {
          await storage.delete(keyFromUrl(url));
        } catch {
          // Already gone, or the driver lost it. The rows are what the UI reads.
        }
      })
    );
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}/report`);
}
