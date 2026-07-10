import type { ReactNode } from "react";
import {
  ModelMeasurement,
  ProcessingJob,
  ProjectImagery,
  RoofComparison,
} from "@prisma/client";
import type { SavedMeasurement } from "@/components/dashboard/measure-viewer";
import type { ModelMeasurementKind } from "@/app/(dashboard)/projects/[projectId]/model-measurement-actions";
import {
  createRoofComparisonAction,
  materializeDroneMeasurementsAction,
  syncNodeOdmTaskAction,
} from "@/app/(dashboard)/projects/[projectId]/phase-six-actions";
import {
  generateEstimateFromMeasurementsAction,
  saveModelMeasurementsToProjectAction,
} from "@/app/(dashboard)/projects/[projectId]/model-measurement-actions";
import { ImageryUploadForm } from "@/components/dashboard/imagery-upload-form";
import { ModelMeasurementViewer } from "@/components/dashboard/model-measurement-viewer";
import { MeasureViewer } from "@/components/dashboard/measure-viewer";
import { ProcessingJobPoller } from "@/components/dashboard/processing-job-poller";
import { ProcessingLauncher } from "@/components/dashboard/processing-launcher";
import { SubmitButton } from "@/components/dashboard/submit-button";
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
  modelMeasurements: ModelMeasurement[];
};

type StepState = "done" | "current" | "todo";

function metadataObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function hasLocation(item: ProjectImagery) {
  const metadata = metadataObject(item.metadataJson);
  return Boolean(metadata.gps || metadata.latitude || metadata.longitude);
}

function nodeOdmTaskUuid(value: unknown) {
  const metadata = metadataObject(value);
  if (typeof metadata.nodeOdmTaskUuid === "string") return metadata.nodeOdmTaskUuid;
  return typeof metadata.nodeOdxTaskUuid === "string" ? metadata.nodeOdxTaskUuid : "";
}

function isActiveJob(job: ProcessingJob) {
  return job.status === "QUEUED" || job.status === "PROCESSING";
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

// A step badge: number, ✓ when done, dimmed when not yet reachable.
function StepBadge({ n, state }: { n: number; state: StepState }) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
        state === "done"
          ? "bg-emerald-500/85 text-slate-950"
          : state === "current"
            ? "bg-cyan-400 text-slate-950"
            : "bg-white/10 text-slate-500"
      }`}
    >
      {state === "done" ? "✓" : n}
    </span>
  );
}

function StepCard({
  n,
  state,
  title,
  hint,
  children,
}: {
  n: number;
  state: StepState;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`min-w-0 rounded-3xl border p-6 transition ${
        state === "current"
          ? "border-cyan-300/25 bg-cyan-300/[0.04]"
          : "border-white/10 bg-white/5"
      } ${state === "todo" ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-3">
        <StepBadge n={n} state={state} />
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {hint ? <p className="text-sm text-slate-400">{hint}</p> : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

export function PhaseSixWorkflow({
  projectId,
  imagery,
  processingJobs,
  workerHealth,
  comparisons,
  modelMeasurements,
}: Props) {
  const savedMeasurements: SavedMeasurement[] = modelMeasurements.map((m) => ({
    id: m.id,
    kind: m.kind as ModelMeasurementKind,
    points: m.pointsJson as [number, number, number][],
    label: m.label,
    areaSqft: m.areaSqft,
  }));
  const photos = imagery.filter((item) => item.type === "DRONE" || item.type === "ORTHOMOSAIC");
  const locatedPhotos = photos.filter(hasLocation).length;
  const latestModel = imagery.find(
    (item) => item.type === "MODEL" && parsePhotogrammetryModelPackage(item.extractedJson)
  );
  const modelPackage = parsePhotogrammetryModelPackage(latestModel?.extractedJson);
  const activeJob = processingJobs.find(isActiveJob) ?? null;

  const hasPhotos = photos.length > 0;
  const modelReady = latestModel?.status === "READY";
  const building = !modelReady && (Boolean(activeJob) || latestModel?.status === "QUEUED" || latestModel?.status === "PROCESSING");
  const failed = latestModel?.status === "FAILED" || latestModel?.status === "NEEDS_REVIEW";

  // Friendly, roofer-facing photo-quality summary (no QA jargon / grids).
  const quality = buildCaptureQualityProfile(imagery);
  const qualityTone =
    !hasPhotos ? "muted" : quality.score >= 82 ? "good" : quality.score >= 58 ? "ok" : "low";
  const qualityMessage =
    !hasPhotos
      ? "Add your drone photos to get started."
      : qualityTone === "good"
        ? "Your photos look great for a 3D scan."
        : qualityTone === "ok"
          ? "Good to go — more overlapping photos would make an even better scan."
          : "Add more overlapping photos before building the model for a clean result.";

  // Step states drive the smart-page dimming.
  const step1: StepState = hasPhotos ? "done" : "current";
  const step2: StepState = modelReady ? "done" : hasPhotos ? "current" : "todo";
  const step3: StepState = modelReady ? "current" : "todo";

  const progress = building
    ? clampPercent(typeof activeJob?.progress === "number" ? activeJob.progress : 15)
    : modelReady
      ? 100
      : 0;
  const buildTaskUuid = latestModel ? nodeOdmTaskUuid(latestModel.metadataJson) : "";
  const beforeImages = imagery.filter((item) => item.type === "BEFORE");
  const afterImages = imagery.filter((item) => item.type === "AFTER");
  const filmstrip = photos.slice(0, 24);

  return (
    <section className="min-w-0 max-w-full space-y-5 overflow-hidden">
      <ProcessingJobPoller projectId={projectId} activeJobs={activeJob ? 1 : 0} />

      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 to-white/5 p-6">
        <h2 className="text-2xl font-semibold text-white">Roof scan</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Turn your drone photos into a 3D model of the roof, then measure it. Just follow the
          three steps below — we handle the rest.
        </p>
      </div>

      {/* Step 1 — Photos */}
      <StepCard
        n={1}
        state={step1}
        title="Add your drone photos"
        hint={hasPhotos ? `${photos.length} photo${photos.length === 1 ? "" : "s"} added` : "Upload the photos from your drone flight"}
      >
        <ImageryUploadForm projectId={projectId} />

        {hasPhotos ? (
          <>
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                qualityTone === "good"
                  ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                  : qualityTone === "ok"
                    ? "border-amber-300/25 bg-amber-400/10 text-amber-100"
                    : "border-rose-300/25 bg-rose-500/10 text-rose-100"
              }`}
            >
              <p className="font-medium">{qualityMessage}</p>
              <p className="mt-1 text-xs opacity-80">
                {photos.length} photo{photos.length === 1 ? "" : "s"} · {locatedPhotos} with location data
              </p>
            </div>

            <div className="mt-4 flex max-w-full gap-2 overflow-x-auto pb-1">
              {filmstrip.map((item) => (
                <img
                  key={item.id}
                  src={item.url}
                  alt=""
                  className="h-16 w-20 shrink-0 rounded-lg border border-white/10 object-cover"
                />
              ))}
              {photos.length > filmstrip.length ? (
                <div className="grid h-16 w-20 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-xs text-slate-400">
                  +{photos.length - filmstrip.length}
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </StepCard>

      {/* Step 2 — Build the 3D model */}
      <StepCard
        n={2}
        state={step2}
        title="Build the 3D model"
        hint={
          modelReady
            ? "Your 3D model is ready"
            : building
              ? "We're building your model now"
              : "This is the step that creates your 3D roof"
        }
      >
        {!hasPhotos ? (
          <p className="text-sm text-slate-400">Add photos in step 1 first.</p>
        ) : building ? (
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">Building your 3D model…</p>
              <span className="text-sm text-cyan-100">{progress}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              This usually takes 10–30 minutes. You can leave this page and come back — it keeps working.
            </p>
          </div>
        ) : modelReady ? (
          <div className="rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            3D model ready. Review it in step 3 below.
          </div>
        ) : (
          <>
            {failed ? (
              <p className="mb-3 rounded-2xl border border-rose-300/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                The last attempt needs another look — try building again{workerHealth.online ? "" : " once the processor is connected"}.
              </p>
            ) : null}
            <ProcessingLauncher
              projectId={projectId}
              sourceImageCount={photos.length}
              workerConfigured={workerHealth.configured}
            />
          </>
        )}
      </StepCard>

      {/* Step 3 — View & measure */}
      <StepCard
        n={3}
        state={step3}
        title="View & measure your roof"
        hint={modelReady ? "Explore the 3D model and pull measurements" : "Available once your 3D model is ready"}
      >
        {modelReady && latestModel && modelPackage ? (
          <>
            <ModelMeasurementViewer
              modelPackage={modelPackage}
              previewUrl={modelPackage.previewUrl ?? photos[0]?.url ?? null}
              sourceImageCount={photos.length}
            />

            {(() => {
              const glbUrl =
                modelPackage.assets.viewerGlb?.startsWith("/")
                  ? modelPackage.assets.viewerGlb
                  : modelPackage.assets.texturedModelGlb?.startsWith("/")
                    ? modelPackage.assets.texturedModelGlb
                    : null;
              return glbUrl ? (
                <div className="mt-6">
                  <h4 className="mb-1 text-sm font-semibold text-white">Measure on the model</h4>
                  <p className="mb-3 text-xs text-slate-400">
                    Pick a tool and click the 3D model to measure distances, roof areas, pitch, and height, or drop
                    markers — all in real-world units.
                  </p>
                  <MeasureViewer
                    glbUrl={glbUrl}
                    projectId={projectId}
                    modelImageryId={latestModel.id}
                    initialMeasurements={savedMeasurements}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <form action={generateEstimateFromMeasurementsAction}>
                      <input type="hidden" name="projectId" value={projectId} />
                      <SubmitButton
                        pendingText="Building estimate…"
                        className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:opacity-60"
                      >
                        Generate estimate from these measurements
                      </SubmitButton>
                    </form>
                    <form action={saveModelMeasurementsToProjectAction}>
                      <input type="hidden" name="projectId" value={projectId} />
                      <SubmitButton
                        pendingText="Saving…"
                        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
                      >
                        Save to project measurements
                      </SubmitButton>
                    </form>
                    <span className="text-xs text-slate-500">
                      Build a priced proposal, or roll these up into the project&apos;s measurements list.
                    </span>
                  </div>
                </div>
              ) : null;
            })()}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-400">
                Draw a box around the roof in the measurement tool below to get area, pitch, and squares.
              </p>
              <form action={materializeDroneMeasurementsAction}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="imageryId" value={latestModel.id} />
                <SubmitButton
                  pendingText="Saving…"
                  className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20 disabled:opacity-60"
                >
                  Save measurements to this project
                </SubmitButton>
              </form>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">
            Once your 3D model is built, you&apos;ll be able to spin it around and measure the roof here.
          </p>
        )}
      </StepCard>

      {/* Optional: before / after photos */}
      <details className="min-w-0 rounded-3xl border border-white/10 bg-white/5">
        <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-white">
          Before &amp; after photos (optional)
        </summary>
        <div className="border-t border-white/10 p-6">
          <p className="text-sm text-slate-400">
            Create a simple before/after sheet for the homeowner or insurance file.
          </p>
          <form action={createRoofComparisonAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="projectId" value={projectId} />
            <input
              name="title"
              placeholder="e.g. Front slope — before and after"
              className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400 md:col-span-2"
              required
            />
            <select name="beforeUrl" defaultValue="" className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-blue-400">
              <option value="">Choose a &quot;before&quot; photo</option>
              {beforeImages.map((item) => (
                <option key={item.id} value={item.url}>{item.fileName ?? "Before photo"}</option>
              ))}
            </select>
            <select name="afterUrl" defaultValue="" className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-blue-400">
              <option value="">Choose an &quot;after&quot; photo</option>
              {afterImages.map((item) => (
                <option key={item.id} value={item.url}>{item.fileName ?? "After photo"}</option>
              ))}
            </select>
            <textarea name="summary" rows={2} placeholder="Optional note" className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400 md:col-span-2" />
            <button type="submit" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500 md:col-span-2">
              Create comparison
            </button>
          </form>

          {comparisons.length > 0 ? (
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
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </details>

      {/* Technical details — hidden by default */}
      <details className="min-w-0 rounded-3xl border border-white/10 bg-white/5">
        <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-slate-300">
          Technical details
        </summary>
        <div className="space-y-4 border-t border-white/10 p-6 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400">3D processor:</span>
            <span
              className={`rounded-full border px-3 py-1 text-xs ${
                workerHealth.online
                  ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                  : workerHealth.configured
                    ? "border-amber-300/30 bg-amber-400/10 text-amber-100"
                    : "border-slate-300/20 bg-slate-400/10 text-slate-300"
              }`}
            >
              {workerHealth.online ? "connected" : workerHealth.configured ? "not reachable" : "not set up"}
            </span>
            {latestModel && buildTaskUuid ? (
              <form action={syncNodeOdmTaskAction} className="ml-auto">
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="imageryId" value={latestModel.id} />
                <button type="submit" className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10">
                  Refresh status
                </button>
              </form>
            ) : null}
          </div>

          {processingJobs.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2">
              {processingJobs.slice(0, 4).map((job) => (
                <div key={job.id} className="rounded-xl bg-white/5 p-3 text-xs text-slate-300">
                  {job.provider} · {job.status.replaceAll("_", " ").toLowerCase()}
                  {typeof job.progress === "number" ? ` · ${Math.round(job.progress)}%` : ""}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No processing jobs yet.</p>
          )}

          {modelReady && latestModel ? (
            <a
              href={`/api/projects/${projectId}/processing/${latestModel.id}/download`}
              className="inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-cyan-100 transition hover:bg-white/10"
            >
              Download all model files (.zip)
            </a>
          ) : null}
        </div>
      </details>
    </section>
  );
}
