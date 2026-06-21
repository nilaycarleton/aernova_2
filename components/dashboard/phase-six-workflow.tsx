import {
  ProcessingJob,
  ProjectImagery,
  RoofComparison,
} from "@prisma/client";
import {
  createRoofComparisonAction,
  generateExtractionSuggestionAction,
  materializeDroneMeasurementsAction,
  processPhotogrammetryModelAction,
  syncNodeOdmTaskAction,
  updateImageryStatusAction,
} from "@/app/(dashboard)/projects/[projectId]/phase-six-actions";
import { ImageryUploadForm } from "@/components/dashboard/imagery-upload-form";
import { ModelMeasurementViewer } from "@/components/dashboard/model-measurement-viewer";
import { ProcessingJobPoller } from "@/components/dashboard/processing-job-poller";
import {
  buildCaptureQualityProfile,
  parsePhotogrammetryModelPackage,
} from "@/lib/photogrammetry-pipeline";
import type { NodeOdmWorkerHealth } from "@/lib/nodeodm-client";

type Props = {
  projectId: string;
  imagery: ProjectImagery[];
  processingJobs: ProcessingJob[];
  workerHealth: NodeOdmWorkerHealth;
  comparisons: RoofComparison[];
};

function statusClass(status: string) {
  switch (status) {
    case "READY":
      return "border-emerald-400/25 bg-emerald-500/10 text-emerald-200";
    case "PROCESSING":
    case "QUEUED":
      return "border-amber-400/25 bg-amber-500/10 text-amber-200";
    case "NEEDS_REVIEW":
      return "border-blue-400/25 bg-blue-500/10 text-blue-200";
    case "FAILED":
      return "border-rose-400/25 bg-rose-500/10 text-rose-200";
    default:
      return "border-slate-400/25 bg-slate-500/10 text-slate-200";
  }
}

function parseExtraction(value: unknown) {
  if (!value || typeof value !== "object") return null;
  return value as {
    confidence?: number;
    planes?: Array<{ label: string; pitchRatio: string; areaSqft: number; edgeFt: number }>;
    edges?: Array<{ type: string; lengthFt: number }>;
    reviewNote?: string;
  };
}

function parseDifferences(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function metadataObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function nodeOdmTaskUuid(value: unknown) {
  const metadata = metadataObject(value);
  if (typeof metadata.nodeOdmTaskUuid === "string") return metadata.nodeOdmTaskUuid;
  return typeof metadata.nodeOdxTaskUuid === "string" ? metadata.nodeOdxTaskUuid : "";
}

function hasGpsMetadata(item: ProjectImagery) {
  const metadata = metadataObject(item.metadataJson);
  return Boolean(metadata.gps || metadata.latitude || metadata.longitude);
}

function displayDate(value: Date | null) {
  return value ? value.toLocaleDateString() : "No date";
}

function averageAltitude(items: ProjectImagery[]) {
  const values = items
    .map((item) => item.altitudeFt)
    .filter((value): value is number => typeof value === "number");
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function captureBatchKey(item: ProjectImagery) {
  const date = item.captureDate ? item.captureDate.toISOString().slice(0, 10) : "No date";
  return `${date}-${item.type}-${item.altitudeFt ? Math.round(item.altitudeFt) : "no-altitude"}`;
}

function captureBatchLabel(items: ProjectImagery[]) {
  const first = items[0];
  const altitude = averageAltitude(items);
  return `${displayDate(first.captureDate)} · ${first.type}${altitude ? ` · ${altitude} ft` : ""}`;
}

function groupCaptureBatches(items: ProjectImagery[]) {
  const groups = new Map<string, ProjectImagery[]>();
  for (const item of items) {
    const key = captureBatchKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return Array.from(groups.values());
}

function isActiveProcessingJob(job: ProcessingJob) {
  return job.status === "QUEUED" || job.status === "PROCESSING";
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function reconstructionProgress(
  job: ProcessingJob | null,
  model: ProjectImagery | null | undefined,
  sourceImageCount: number
) {
  if (job?.status === "READY" || model?.status === "READY") return 100;
  if (job?.status === "FAILED" || model?.status === "FAILED") return 100;
  if (job?.status === "PROCESSING") return clampPercent(typeof job.progress === "number" ? job.progress : 48);
  if (job?.status === "QUEUED" || model?.status === "QUEUED") return clampPercent(typeof job?.progress === "number" ? job.progress : 18);
  if (model?.status === "PROCESSING") return 48;
  if (model?.status === "NEEDS_REVIEW") return 82;
  if (sourceImageCount > 0) return Math.min(28, 8 + sourceImageCount * 2);
  return 0;
}

function reconstructionStatusText(job: ProcessingJob | null, model: ProjectImagery | null | undefined) {
  if (job?.status === "FAILED" || model?.status === "FAILED") return "Needs attention";
  if (job?.status === "READY" || model?.status === "READY") return "Model ready";
  if (job?.status === "PROCESSING" || model?.status === "PROCESSING") return "Reconstructing";
  if (job?.status === "QUEUED" || model?.status === "QUEUED") return "Queued";
  if (model?.status === "NEEDS_REVIEW") return "Ready for review";
  return "Capture ready";
}

function reconstructionNextStep(
  job: ProcessingJob | null,
  model: ProjectImagery | null | undefined,
  sourceImageCount: number,
  workerOnline: boolean
) {
  if (job?.status === "FAILED" || model?.status === "FAILED") {
    return "Open the failed job, review the worker message, then queue a fresh reconstruction after fixing the capture set.";
  }
  if (job?.status === "READY" || model?.status === "READY") {
    return "Review the mesh, orthomosaic, DSM/DTM, and report, then save drone measurements for the estimate.";
  }
  if (job?.status === "PROCESSING" || model?.status === "PROCESSING") {
    return "The worker is building the model. This page will keep polling until the outputs are ready.";
  }
  if (job?.status === "QUEUED" || model?.status === "QUEUED") {
    return "The job is waiting on the worker queue. Keep this page open or sync the worker when the job moves.";
  }
  if (!workerOnline) return "Connect NodeODM before queuing the production model.";
  if (sourceImageCount === 0) return "Upload drone imagery with EXIF/GPS metadata to start the reconstruction.";
  return "Queue 3D processing when the capture QA looks acceptable.";
}

function reconstructionSteps(progress: number) {
  return [
    { label: "Capture", detail: "Images checked", threshold: 8 },
    { label: "Queue", detail: "Worker job created", threshold: 28 },
    { label: "Reconstruct", detail: "Mesh and point cloud", threshold: 76 },
    { label: "Review", detail: "Outputs and measurements", threshold: 100 },
  ].map((step, index, steps) => {
    const previousThreshold = index === 0 ? 0 : steps[index - 1].threshold;
    const status =
      progress >= step.threshold
        ? "complete"
        : progress >= previousThreshold
          ? "current"
          : "waiting";
    return { ...step, status };
  });
}

function CaptureImageBrowser({
  projectId,
  imagery,
}: {
  projectId: string;
  imagery: ProjectImagery[];
}) {
  const modelImages = imagery.filter((item) => item.type === "MODEL");
  const captureImages = imagery.filter((item) => item.type !== "MODEL");
  const readyCount = captureImages.filter((item) => item.status === "READY").length;
  const gpsCount = captureImages.filter(hasGpsMetadata).length;
  const altitude = averageAltitude(captureImages);
  const firstCapture = captureImages.find((item) => item.captureDate)?.captureDate ?? null;
  const batches = groupCaptureBatches(captureImages);
  const blockingProblemImages = captureImages.filter(
    (item) =>
      item.status === "FAILED" ||
      item.status === "NEEDS_REVIEW"
  );
  const metadataWarnings = [
    { label: "No GPS", count: captureImages.filter((item) => !hasGpsMetadata(item)).length },
    { label: "No altitude", count: captureImages.filter((item) => typeof item.altitudeFt !== "number").length },
    { label: "No date", count: captureImages.filter((item) => !item.captureDate).length },
  ].filter((item) => item.count > 0);
  const filmstrip = captureImages.slice(0, 42);

  if (imagery.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
        Upload drone, orthomosaic, before, or after imagery to start the pipeline.
      </div>
    );
  }

  return (
    <div className="mt-6 min-w-0 rounded-2xl border border-white/10 bg-slate-950/35 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">Capture library</p>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            {captureImages.length} photo{captureImages.length === 1 ? "" : "s"} · {readyCount} ready · {gpsCount} GPS · {altitude ? `${altitude} ft` : "no altitude"} · {displayDate(firstCapture)}
          </p>
        </div>
        <div className="flex min-w-0 max-w-full flex-wrap gap-2">
          {batches.slice(0, 4).map((batch) => (
            <span key={captureBatchKey(batch[0])} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {captureBatchLabel(batch)} · {batch.length}
            </span>
          ))}
          {batches.length > 4 ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
              +{batches.length - 4} more batches
            </span>
          ) : null}
        </div>
      </div>

      {metadataWarnings.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2">
          <p className="text-sm font-medium text-amber-100">Capture QA warnings</p>
          {metadataWarnings.map((item) => (
            <span key={item.label} className="rounded-full border border-amber-200/20 bg-slate-950/35 px-2.5 py-1 text-xs text-amber-100">
              {item.count} {item.label}
            </span>
          ))}
        </div>
      ) : null}

      {blockingProblemImages.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-amber-100">{blockingProblemImages.length} capture item{blockingProblemImages.length === 1 ? "" : "s"} need review</p>
            <span className="text-xs text-amber-100/80">Failed or marked for review</span>
          </div>
          <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1">
            {blockingProblemImages.slice(0, 10).map((item) => (
              <div key={item.id} className="w-40 shrink-0 overflow-hidden rounded-xl border border-amber-200/15 bg-slate-950/45">
                <img src={item.url} alt="" className="h-20 w-full object-cover" />
                <div className="p-2">
                  <p className="truncate text-xs font-medium text-white">{item.fileName ?? item.type}</p>
                  <p className="mt-1 text-[11px] text-amber-100">
                    {!hasGpsMetadata(item) ? "No GPS" : item.status.replaceAll("_", " ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex max-w-full gap-2 overflow-x-auto pb-2">
        {filmstrip.map((item) => (
          <div key={item.id} className="group relative h-20 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-950">
            <img src={item.url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
            <span className={`absolute bottom-1 left-1 rounded-full border px-1.5 py-0.5 text-[10px] ${statusClass(item.status)}`}>
              {item.status === "READY" ? "Ready" : item.status.replaceAll("_", " ")}
            </span>
          </div>
        ))}
        {captureImages.length > filmstrip.length ? (
          <div className="grid h-20 w-24 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-center text-xs text-slate-400">
            +{captureImages.length - filmstrip.length} more
          </div>
        ) : null}
      </div>

      {modelImages.length > 0 ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {modelImages.slice(0, 2).map((item) => (
            <div key={item.id} className="min-w-0 rounded-xl border border-cyan-300/15 bg-cyan-300/5 px-3 py-2 text-xs text-cyan-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 truncate">{item.fileName ?? "Drone photogrammetry model"} · {item.status.replaceAll("_", " ")}</span>
                <div className="flex flex-wrap gap-2">
                  {nodeOdmTaskUuid(item.metadataJson) ? (
                    <form action={syncNodeOdmTaskAction}>
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="imageryId" value={item.id} />
                      <button type="submit" className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-cyan-100 transition hover:bg-cyan-300/20">
                        Sync
                      </button>
                    </form>
                  ) : null}
                  {item.status === "READY" ? (
                    <a href={`/api/projects/${projectId}/processing/${item.id}/download`} className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-emerald-100 transition hover:bg-emerald-300/20">
                      Assets
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <details className="mt-4 rounded-2xl border border-white/10 bg-white/5">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-white">
          View all photos and batch actions
        </summary>
        <div className="max-h-[520px] overflow-auto border-t border-white/10 p-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {captureImages.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/45 p-2">
                <div className="flex gap-3">
                  <img src={item.url} alt="" className="h-20 w-24 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-white">{item.fileName ?? item.type}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] ${statusClass(item.status)}`}>
                        {item.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {item.type} · {item.altitudeFt ? `${item.altitudeFt} ft` : "No altitude"} · {displayDate(item.captureDate)}
                    </p>
                    <p className="text-xs text-slate-500">{hasGpsMetadata(item) ? "GPS metadata" : "No GPS metadata"}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["QUEUED", "PROCESSING", "READY", "NEEDS_REVIEW"].map((status) => (
                    <form key={status} action={updateImageryStatusAction}>
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="imageryId" value={item.id} />
                      <input type="hidden" name="status" value={status} />
                      <button type="submit" className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200 transition hover:bg-white/10">
                        {status.replaceAll("_", " ")}
                      </button>
                    </form>
                  ))}
                  <form action={generateExtractionSuggestionAction}>
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="imageryId" value={item.id} />
                    <button type="submit" className="rounded-lg border border-blue-400/25 bg-blue-500/10 px-2.5 py-1 text-[11px] text-blue-200 transition hover:bg-blue-500/20">
                      AI Extract
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}

export function PhaseSixWorkflow({
  projectId,
  imagery,
  processingJobs,
  workerHealth,
  comparisons,
}: Props) {
  const readyImagery = imagery.filter((item) => item.status === "READY").length;
  const reviewImagery = imagery.filter((item) => item.status === "NEEDS_REVIEW").length;
  const latestImage = imagery[0] ?? null;
  const sourceImages = imagery.filter((item) => item.type === "DRONE" || item.type === "ORTHOMOSAIC");
  const latestModel = imagery.find((item) => item.type === "MODEL" && parsePhotogrammetryModelPackage(item.extractedJson));
  const latestModelPackage = parsePhotogrammetryModelPackage(latestModel?.extractedJson);
  const captureQuality = buildCaptureQualityProfile(imagery);
  const activeJobCount = processingJobs.filter((job) => job.status === "QUEUED" || job.status === "PROCESSING").length;
  const primaryJob = processingJobs.find(isActiveProcessingJob) ?? processingJobs[0] ?? null;
  const progress = reconstructionProgress(primaryJob, latestModel, sourceImages.length);
  const progressStatus = reconstructionStatusText(primaryJob, latestModel);
  const progressMessage = reconstructionNextStep(primaryJob, latestModel, sourceImages.length, workerHealth.online);
  const progressSteps = reconstructionSteps(progress);
  const progressStyle = {
    background: `conic-gradient(#22d3ee ${progress * 3.6}deg, rgba(148, 163, 184, 0.16) 0deg)`,
  };
  const extractionImages = imagery.filter(
    (item) => item.type !== "MODEL" && item.extractedJson && !parsePhotogrammetryModelPackage(item.extractedJson)
  );
  const beforeImages = imagery.filter((item) => item.type === "BEFORE");
  const afterImages = imagery.filter((item) => item.type === "AFTER");

  return (
    <section className="min-w-0 max-w-full space-y-6 overflow-hidden">
      <ProcessingJobPoller projectId={projectId} activeJobs={activeJobCount} />
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 to-white/5 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
              Phase 6 Drone Workflow
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              Imagery, model review, extraction, and comparisons
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Upload drone imagery, queue NodeODM processing, review worker outputs,
              inspect roof-plane overlays, and prepare before/after client evidence.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
              <p className="text-lg font-semibold text-white">{imagery.length}</p>
              <p className="text-xs text-slate-500">Images</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
              <p className="text-lg font-semibold text-white">{readyImagery}</p>
              <p className="text-xs text-slate-500">Ready</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
              <p className="text-lg font-semibold text-white">{reviewImagery}</p>
              <p className="text-xs text-slate-500">Review</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-slate-400">NodeODM Worker</p>
              <h3 className="mt-2 text-xl font-semibold text-white">
                {workerHealth.online ? "Connected" : workerHealth.configured ? "Disconnected" : "Not configured"}
              </h3>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs ${
              workerHealth.online
                ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                : workerHealth.configured
                  ? "border-amber-300/30 bg-amber-400/10 text-amber-100"
                  : "border-slate-300/20 bg-slate-400/10 text-slate-300"
            }`}>
              {workerHealth.online ? "online" : workerHealth.configured ? "offline" : "draft mode"}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-2xl bg-slate-950/45 p-3">
              <p className="text-slate-500">Endpoint</p>
              <p className="mt-1 truncate font-medium text-white">{workerHealth.baseUrl ?? "Local draft"}</p>
            </div>
            <div className="rounded-2xl bg-slate-950/45 p-3">
              <p className="text-slate-500">Options</p>
              <p className="mt-1 font-medium text-white">{workerHealth.optionsCount ?? "Default"}</p>
            </div>
            <div className="rounded-2xl bg-slate-950/45 p-3">
              <p className="text-slate-500">Queue</p>
              <p className="mt-1 font-medium text-white">{workerHealth.queueCount ?? activeJobCount}</p>
            </div>
            <div className="rounded-2xl bg-slate-950/45 p-3">
              <p className="text-slate-500">Engine</p>
              <p className="mt-1 font-medium text-white">{workerHealth.engine ?? "ODM"}</p>
            </div>
          </div>
          {workerHealth.errorMessage ? (
            <p className="mt-3 text-xs leading-5 text-amber-200">{workerHealth.errorMessage}</p>
          ) : null}
        </div>

        <div className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Capture QA</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{captureQuality.label}</h3>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-2 text-right">
              <p className="text-xs text-slate-500">Score</p>
              <p className="text-lg font-semibold text-white">{captureQuality.score}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {captureQuality.items.map((item) => (
              <div key={item.key} className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <span className={`h-2.5 w-2.5 rounded-full ${
                    item.status === "pass" ? "bg-emerald-300" : item.status === "warn" ? "bg-amber-300" : "bg-rose-300"
                  }`} />
                </div>
                <p className="mt-1 text-sm text-cyan-100">{item.value}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="min-w-0 rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-400/10 via-white/5 to-slate-950/50 p-5 shadow-2xl shadow-cyan-950/20">
        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="flex items-center gap-4 lg:flex-col lg:items-start">
            <div
              className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full"
              role="progressbar"
              aria-label="Drone reconstruction progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              style={progressStyle}
            >
              <div className="grid h-28 w-28 place-items-center rounded-full border border-white/10 bg-slate-950">
                <div className="text-center">
                  <p className="text-3xl font-semibold text-white">{progress}%</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-cyan-200">complete</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Processing Progress</p>
              <h3 className="mt-1 text-xl font-semibold text-white">{progressStatus}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{progressMessage}</p>
            </div>
          </div>

          <div className="min-w-0">
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    {primaryJob ? `${primaryJob.provider} reconstruction` : "Ready to queue reconstruction"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {primaryJob?.providerTaskId
                      ? `Task ${primaryJob.providerTaskId.slice(0, 8)}`
                      : `${sourceImages.length} source image${sourceImages.length === 1 ? "" : "s"} available`}
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs ${statusClass(primaryJob?.status ?? latestModel?.status ?? "READY")}`}>
                  {(primaryJob?.status ?? latestModel?.status ?? "READY").replaceAll("_", " ")}
                </span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan-300 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-4">
                {progressSteps.map((step) => (
                  <div
                    key={step.label}
                    className={`rounded-2xl border p-3 ${
                      step.status === "complete"
                        ? "border-emerald-300/25 bg-emerald-400/10"
                        : step.status === "current"
                          ? "border-cyan-300/30 bg-cyan-400/10"
                          : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white">{step.label}</p>
                      <span className={`h-2.5 w-2.5 rounded-full ${
                        step.status === "complete"
                          ? "bg-emerald-300"
                          : step.status === "current"
                            ? "bg-cyan-300"
                            : "bg-slate-600"
                      }`} />
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{step.detail}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs leading-5 text-slate-500">
                  Worker queue: {workerHealth.queueCount ?? activeJobCount} · Engine: {workerHealth.engine ?? "ODM"}
                </p>
                {latestModel && nodeOdmTaskUuid(latestModel.metadataJson) ? (
                  <form action={syncNodeOdmTaskAction}>
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="imageryId" value={latestModel.id} />
                    <button type="submit" className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-300/20">
                      Sync worker
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-6">
        <div className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
            Drone Imagery Pipeline
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-white">
            Upload and process imagery
          </h3>

          <ImageryUploadForm projectId={projectId} />

          <form action={processPhotogrammetryModelAction} className="mt-5 rounded-2xl border border-cyan-300/15 bg-cyan-300/5 p-4">
            <input type="hidden" name="projectId" value={projectId} />
            <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <input
                name="label"
                defaultValue="Drone photogrammetry model"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-cyan-300"
              />
              <select
                name="quality"
                defaultValue="standard"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-cyan-300"
              >
                <option value="standard">Standard</option>
                <option value="high">High quality</option>
              </select>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-400">
                {sourceImages.length} source image{sourceImages.length === 1 ? "" : "s"} available for reconstruction
              </p>
              <button type="submit" className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400">
                Queue 3D Processing
              </button>
            </div>
          </form>

          <CaptureImageBrowser projectId={projectId} imagery={imagery} />
          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">Processing jobs</p>
              <p className="text-xs text-slate-500">{activeJobCount} active</p>
            </div>
            {processingJobs.length > 0 ? (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {processingJobs.slice(0, 4).map((job) => (
                  <div key={job.id} className="rounded-xl bg-white/5 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-white">{job.provider}</p>
                      <span className={`rounded-full border px-2 py-1 text-[11px] ${statusClass(job.status)}`}>
                        {job.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {job.providerTaskId ? `Task ${job.providerTaskId.slice(0, 8)}` : "Local draft"}
                      {typeof job.progress === "number" ? ` · ${Math.round(job.progress)}%` : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No worker jobs have been queued for this project yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-6">
        <div className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
            Processed 3D Reconstruction Viewer
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-white">
            Accuracy, survey layers, worker assets, and measurement tools
          </h3>
          <ModelMeasurementViewer
            modelPackage={latestModelPackage}
            previewUrl={latestModelPackage?.previewUrl ?? latestImage?.url ?? null}
            sourceImageCount={sourceImages.length}
          />
          {latestModel && latestModelPackage ? (
            <form action={materializeDroneMeasurementsAction} className="mt-4 flex justify-end">
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="imageryId" value={latestModel.id} />
              <button type="submit" className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20">
                Save drone measurements
              </button>
            </form>
          ) : null}
        </div>

        <div className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
            AI-Assisted Roof Extraction
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-white">
            Extraction review queue
          </h3>
          <div className="mt-6 space-y-3">
            {extractionImages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
                Use AI Extract on uploaded imagery to create draft roof planes, edges, and measurement suggestions.
              </div>
            ) : (
              extractionImages.map((item) => {
                const extraction = parseExtraction(item.extractedJson);
                return (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-white">{item.fileName ?? item.type}</p>
                      <span className="rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1 text-xs text-blue-200">
                        {extraction?.confidence ?? 0}% confidence
                      </span>
                    </div>
                    <div className="mt-4 grid gap-2 md:grid-cols-3">
                      {extraction?.planes?.map((plane) => (
                        <div key={plane.label} className="rounded-xl bg-white/5 p-3 text-sm">
                          <p className="font-medium text-white">{plane.label}</p>
                          <p className="mt-1 text-slate-400">{plane.pitchRatio} · {plane.areaSqft.toLocaleString()} sq ft</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{extraction?.reviewNote}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
              Before / After Comparison
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              Client-facing comparison sheets
            </h3>
          </div>
          <div className="text-sm text-slate-400">
            {beforeImages.length} before · {afterImages.length} after
          </div>
        </div>

        <form action={createRoofComparisonAction} className="mt-6 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="projectId" value={projectId} />
          <input name="title" placeholder="Pre-job vs post-job roof comparison" className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400 md:col-span-2" required />
          <select name="beforeUrl" defaultValue="" className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-blue-400">
            <option value="">Select before image</option>
            {beforeImages.map((item) => (
              <option key={item.id} value={item.url}>{item.fileName ?? item.type}</option>
            ))}
          </select>
          <select name="afterUrl" defaultValue="" className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-blue-400">
            <option value="">Select after image</option>
            {afterImages.map((item) => (
              <option key={item.id} value={item.url}>{item.fileName ?? item.type}</option>
            ))}
          </select>
          <textarea name="summary" rows={3} placeholder="Comparison summary for homeowner or claim file" className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400 md:col-span-2" />
          <button type="submit" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500 md:col-span-2">
            Create Comparison
          </button>
        </form>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {comparisons.map((comparison) => (
            <div key={comparison.id} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
              <p className="font-medium text-white">{comparison.title}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="aspect-video overflow-hidden rounded-xl bg-slate-950">
                  {comparison.beforeUrl ? <img src={comparison.beforeUrl} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="aspect-video overflow-hidden rounded-xl bg-slate-950">
                  {comparison.afterUrl ? <img src={comparison.afterUrl} alt="" className="h-full w-full object-cover" /> : null}
                </div>
              </div>
              {comparison.summary ? <p className="mt-3 text-sm leading-6 text-slate-400">{comparison.summary}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {parseDifferences(comparison.differencesJson).map((item) => (
                  <span key={item} className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">{item}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
