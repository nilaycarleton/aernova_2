import {
  CaptureSource,
  MeasurementType,
  MeasurementUnit,
  Prisma,
  ProcessingStatus,
  ProjectImagery,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import {
  buildNodeOdmModelPackage,
  parsePhotogrammetryModelPackage,
  type ModelMeasurement,
} from "@/lib/photogrammetry-pipeline";
import {
  getNodeOdmTaskInfo,
  nodeOdmAssetUrls,
  nodeOdmDownloadUrl,
  nodeOdmStatusToProcessingStatus,
  nodeOdmOutputAssets,
} from "@/lib/nodeodm-client";

function metadataObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function manifestKey(jobId: string, imageryId: string) {
  return `processing/${jobId}/${imageryId}/manifest.json`;
}

export function processingManifestUrl(jobId: string, imageryId: string) {
  return storage.url(manifestKey(jobId, imageryId));
}

export async function writeProcessingOutputManifest(
  jobId: string,
  imageryId: string,
  payload: Prisma.InputJsonValue
) {
  const key = manifestKey(jobId, imageryId);
  await storage.put(key, Buffer.from(JSON.stringify(payload, null, 2)), "application/json");
  return storage.url(key);
}

function measurementShape(measurement: ModelMeasurement) {
  const numeric = Number(measurement.value.replace(/,/g, "").match(/\d+(\.\d+)?/)?.[0] ?? 0);

  if (measurement.id.includes("area") || measurement.type === "area") {
    return {
      type: MeasurementType.AREA,
      unit: MeasurementUnit.SQFT,
      value: numeric,
      displayValue: measurement.value,
    };
  }

  if (measurement.id.includes("ridge")) {
    return {
      type: MeasurementType.RIDGE,
      unit: MeasurementUnit.FT,
      value: numeric,
      displayValue: measurement.value,
    };
  }

  if (measurement.id.includes("eave")) {
    return {
      type: MeasurementType.EAVE,
      unit: MeasurementUnit.FT,
      value: numeric,
      displayValue: measurement.value,
    };
  }

  if (measurement.type === "pitch") {
    return {
      type: MeasurementType.PITCH,
      unit: MeasurementUnit.RATIO,
      value: numeric,
      displayValue: measurement.value,
    };
  }

  return {
    type: MeasurementType.DISTANCE,
    unit: MeasurementUnit.FT,
    value: numeric,
    displayValue: measurement.value,
  };
}

export async function materializeDroneMeasurements(jobId: string, imageryId: string) {
  const model = await prisma.projectImagery.findFirst({
    where: { id: imageryId, jobId, type: "MODEL" },
  });
  const modelPackage = parsePhotogrammetryModelPackage(model?.extractedJson);
  if (!model || !modelPackage) throw new Error("Processed model package was not found");

  const measurements = modelPackage.measurements.filter((measurement) =>
    ["area", "distance", "pitch"].includes(measurement.type)
  );

  for (const measurement of measurements) {
    const shape = measurementShape(measurement);
    if (!shape.value && shape.type !== MeasurementType.PITCH) continue;

    const existing = await prisma.measurement.findFirst({
      where: {
        jobId,
        label: measurement.label,
        source: CaptureSource.DRONE,
      },
    });

    const data = {
      jobId,
      label: measurement.label,
      confidence: measurement.confidence,
      source: CaptureSource.DRONE,
      sortOrder: 20,
      ...shape,
    };

    if (existing) {
      await prisma.measurement.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.measurement.create({ data });
    }
  }

  return measurements.length;
}

export async function syncNodeOdmModelJob(jobId: string, imageryId: string) {
  const model = await prisma.projectImagery.findFirst({
    where: {
      id: imageryId,
      jobId,
      type: "MODEL",
    },
    include: {
      processingJobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!model) throw new Error("Model imagery record was not found");

  const metadata = metadataObject(model.metadataJson);
  const job = model.processingJobs[0] ?? null;
  const taskUuid =
    job?.providerTaskId ||
    (typeof metadata.nodeOdmTaskUuid === "string"
      ? metadata.nodeOdmTaskUuid
      : typeof metadata.nodeOdxTaskUuid === "string"
        ? metadata.nodeOdxTaskUuid
        : "");

  if (!taskUuid) throw new Error("This model is not linked to a NodeODM task");

  const sourceImageIds =
    stringArray(job?.sourceImageIds).length > 0
      ? stringArray(job?.sourceImageIds)
      : stringArray(metadata.sourceImageIds);
  const sourceImages = await prisma.projectImagery.findMany({
    where: {
      jobId,
      id: sourceImageIds.length > 0 ? { in: sourceImageIds } : undefined,
      type: { in: ["DRONE", "ORTHOMOSAIC"] },
    },
    orderBy: [{ captureDate: "asc" }, { createdAt: "asc" }],
  });
  const info = await getNodeOdmTaskInfo(taskUuid);
  const status = nodeOdmStatusToProcessingStatus(info.status.code) as ProcessingStatus;
  const processingStatus =
    status === "READY"
      ? "ready"
      : status === "FAILED"
        ? "failed"
        : status === "PROCESSING"
          ? "processing"
          : "queued";
  const assetUrls = status === "READY" ? nodeOdmAssetUrls(jobId, imageryId) : undefined;
  const outputsJson = {
    providerOutput: info.output ?? [],
    assetUrls: assetUrls ?? null,
    outputAssets: nodeOdmOutputAssets,
    manifestUrl: status === "READY" ? processingManifestUrl(jobId, imageryId) : null,
    syncedAt: new Date().toISOString(),
  } satisfies Prisma.InputJsonObject;

  if (status === "READY") {
    await writeProcessingOutputManifest(jobId, imageryId, outputsJson);
  }

  const modelPackage = buildNodeOdmModelPackage(sourceImages, {
    quality: model.extractedJson && typeof model.extractedJson === "object" && "quality" in model.extractedJson
      ? (model.extractedJson.quality as "standard" | "high")
      : job?.quality === "high"
        ? "high"
        : "standard",
    taskUuid,
    processingStatus,
    progress: info.progress ?? null,
    downloadUrl: status === "READY" ? nodeOdmDownloadUrl(jobId, imageryId) : undefined,
    assetUrls,
    errorMessage: info.status.errorMessage,
  });
  const sourceStatus: ProcessingStatus = status === "FAILED" ? "NEEDS_REVIEW" : status;
  const completedAt = status === "READY" || status === "FAILED" ? new Date() : null;

  await prisma.$transaction([
    prisma.projectImagery.update({
      where: { id: imageryId },
      data: {
        status,
        extractedJson: modelPackage as unknown as Prisma.InputJsonValue,
        notes:
          status === "READY"
            ? "NodeODM processing complete. Outputs are indexed and ready for viewer/download."
            : status === "FAILED"
              ? info.status.errorMessage || "NodeODM processing failed. Review worker logs."
              : `NodeODM ${status.toLowerCase().replace("_", " ")}${typeof info.progress === "number" ? ` (${Math.round(info.progress)}%)` : ""}.`,
      },
    }),
    prisma.processingJob.upsert({
      where: { id: job?.id ?? "__missing_processing_job__" },
      create: {
        jobId,
        modelImageryId: imageryId,
        provider: "nodeodm",
        providerTaskId: taskUuid,
        status,
        progress: info.progress ?? null,
        quality: modelPackage.quality,
        sourceImageIds,
        outputsJson,
        errorMessage: info.status.errorMessage,
        startedAt: status === "PROCESSING" || status === "READY" ? new Date() : null,
        completedAt,
      },
      update: {
        status,
        progress: info.progress ?? null,
        outputsJson,
        errorMessage: info.status.errorMessage,
        completedAt,
      },
    }),
    prisma.projectImagery.updateMany({
      where: {
        id: { in: sourceImages.map((image: ProjectImagery) => image.id) },
        status: { in: ["UPLOADED", "QUEUED", "PROCESSING"] },
      },
      data: { status: sourceStatus },
    }),
  ]);

  return { status, progress: info.progress ?? null };
}

export type SyncSweepResult = {
  swept: number;
  advanced: number;
  jobs: {
    jobId: string;
    modelImageryId: string;
    status?: ProcessingStatus;
    progress?: number | null;
    error?: string;
  }[];
};

/**
 * Pull the current NodeODM status for every in-flight MODEL job across all
 * jobs and advance it (queued -> processing -> ready/failed). This is the
 * unattended counterpart to the per-job sync route: a cron hits it so queued
 * reconstructions reach READY without a human opening the job and refreshing.
 * Bounded by `limit` so a single tick can't fan out unboundedly.
 */
export async function syncAllInFlightModelJobs(limit = 25): Promise<SyncSweepResult> {
  const jobs = await prisma.processingJob.findMany({
    where: {
      provider: "nodeodm",
      status: { in: ["QUEUED", "PROCESSING"] },
      modelImageryId: { not: null },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const results: SyncSweepResult["jobs"] = [];
  let advanced = 0;
  for (const job of jobs) {
    if (!job.modelImageryId) continue;
    try {
      const outcome = await syncNodeOdmModelJob(job.jobId, job.modelImageryId);
      // "advanced" = left the in-flight set (reached a terminal state).
      if (outcome.status !== "QUEUED" && outcome.status !== "PROCESSING") advanced++;
      results.push({ jobId: job.jobId, modelImageryId: job.modelImageryId, ...outcome });
    } catch (error) {
      results.push({
        jobId: job.jobId,
        modelImageryId: job.modelImageryId,
        error: error instanceof Error ? error.message : "Unable to sync job",
      });
    }
  }

  return { swept: results.length, advanced, jobs: results };
}
