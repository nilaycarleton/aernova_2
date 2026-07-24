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
  materializeDroneMeasurementsAction,
  syncNodeOdmTaskAction,
} from "@/app/(dashboard)/projects/[projectId]/phase-six-actions";
import { ComparisonCreateForm } from "@/components/dashboard/comparison-create-form";
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
          ? "bg-confirm/85 text-on-accent"
          : state === "current"
            ? "bg-instrument text-on-accent"
            : "bg-surface-lifted text-ink-muted"
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
          ? "border-instrument-bright/25 bg-instrument-bright/[0.04]"
          : "border-hairline bg-surface-raised"
      } ${state === "todo" ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-3">
        <StepBadge n={n} state={state} />
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-ink-primary">{title}</h3>
          {hint ? <p className="text-sm text-ink-muted">{hint}</p> : null}
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

      <div className="rounded-3xl border border-hairline bg-surface-raised p-6">
        <h2 className="text-2xl font-semibold text-ink-primary">Roof scan</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
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
                  ? "border-confirm/25 bg-confirm/10 text-confirm-fg"
                  : qualityTone === "ok"
                    ? "border-caution/25 bg-caution/10 text-caution-fg"
                    : "border-danger/25 bg-danger/10 text-danger-fg"
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
                  alt={item.fileName ?? "Drone photo of the roof"}
                  loading="lazy"
                  decoding="async"
                  className="h-16 w-20 shrink-0 rounded-lg border border-hairline object-cover"
                />
              ))}
              {photos.length > filmstrip.length ? (
                <div className="grid h-16 w-20 shrink-0 place-items-center rounded-lg border border-hairline bg-surface-raised text-xs text-ink-muted">
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
          <p className="text-sm text-ink-muted">Add photos in step 1 first.</p>
        ) : building ? (
          <div className="rounded-2xl border border-instrument-bright/20 bg-instrument-bright/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-ink-primary">Building your 3D model…</p>
              <span className="text-sm text-instrument-fg">{progress}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-lifted">
              <div className="h-full rounded-full bg-instrument-bright transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-ink-muted">
              This usually takes 10–30 minutes. You can leave this page and come back — it keeps working.
            </p>
          </div>
        ) : modelReady ? (
          <div className="rounded-2xl border border-confirm/25 bg-confirm/10 px-4 py-3 text-sm text-confirm-fg">
            3D model ready. Review it in step 3 below.
          </div>
        ) : (
          <>
            {failed ? (
              <p className="mb-3 rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger-fg">
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
                  <h4 className="mb-1 text-sm font-semibold text-ink-primary">Measure on the model</h4>
                  <p className="mb-3 text-xs text-ink-muted">
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
                        className="rounded-xl border border-instrument-bright/30 bg-instrument/10 px-4 py-2 text-sm font-medium text-instrument-fg transition hover:bg-instrument/20 disabled:opacity-60"
                      >
                        Generate estimate from these measurements
                      </SubmitButton>
                    </form>
                    <form action={saveModelMeasurementsToProjectAction}>
                      <input type="hidden" name="projectId" value={projectId} />
                      <SubmitButton
                        pendingText="Saving…"
                        className="rounded-xl border border-hairline bg-surface-raised px-4 py-2 text-sm font-medium text-ink-strong transition hover:bg-surface-lifted disabled:opacity-60"
                      >
                        Save to project measurements
                      </SubmitButton>
                    </form>
                    <span className="text-xs text-ink-muted">
                      Build a priced proposal, or roll these up into the project&apos;s measurements list.
                    </span>
                  </div>
                </div>
              ) : null;
            })()}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-muted">
                Draw a box around the roof in the measurement tool below to get area, pitch, and squares.
              </p>
              <form action={materializeDroneMeasurementsAction}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="imageryId" value={latestModel.id} />
                <SubmitButton
                  pendingText="Saving…"
                  className="rounded-xl border border-confirm/25 bg-confirm/10 px-4 py-2 text-sm font-medium text-confirm-fg transition hover:bg-confirm/20 disabled:opacity-60"
                >
                  Save measurements to this project
                </SubmitButton>
              </form>
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-muted">
            Once your 3D model is built, you&apos;ll be able to spin it around and measure the roof here.
          </p>
        )}
      </StepCard>

      {/* Optional: before / after photos */}
      <details className="min-w-0 rounded-3xl border border-hairline bg-surface-raised">
        <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-ink-primary">
          Before &amp; after photos (optional)
        </summary>
        <div className="border-t border-hairline p-6">
          <p className="text-sm text-ink-muted">
            Create a simple before/after sheet for the homeowner or insurance file.
          </p>
          <ComparisonCreateForm
            projectId={projectId}
            beforeImages={beforeImages.map((i) => ({ id: i.id, url: i.url, fileName: i.fileName }))}
            afterImages={afterImages.map((i) => ({ id: i.id, url: i.url, fileName: i.fileName }))}
          />

          {comparisons.length > 0 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {comparisons.map((comparison) => (
                <div key={comparison.id} className="rounded-2xl border border-hairline bg-ground/45 p-4">
                  <p className="font-medium text-ink-primary">{comparison.title}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="aspect-video overflow-hidden rounded-xl bg-ground">
                      {comparison.beforeUrl ? <img src={comparison.beforeUrl} alt={`Before: ${comparison.title}`} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="aspect-video overflow-hidden rounded-xl bg-ground">
                      {comparison.afterUrl ? <img src={comparison.afterUrl} alt={`After: ${comparison.title}`} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : null}
                    </div>
                  </div>
                  {comparison.summary ? <p className="mt-3 text-sm leading-6 text-ink-muted">{comparison.summary}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </details>

      {/* Technical details — hidden by default */}
      <details className="min-w-0 rounded-3xl border border-hairline bg-surface-raised">
        <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-ink-secondary">
          Technical details
        </summary>
        <div className="space-y-4 border-t border-hairline p-6 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-ink-muted">3D processor:</span>
            <span
              className={`rounded-full border px-3 py-1 text-xs ${
                workerHealth.online
                  ? "border-confirm/25 bg-confirm/10 text-confirm-fg"
                  : workerHealth.configured
                    ? "border-caution/25 bg-caution/10 text-caution-fg"
                    : "border-ink-secondary/20 bg-ink-muted/10 text-ink-secondary"
              }`}
            >
              {workerHealth.online ? "connected" : workerHealth.configured ? "not reachable" : "not set up"}
            </span>
            {latestModel && buildTaskUuid ? (
              <form action={syncNodeOdmTaskAction} className="ml-auto">
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="imageryId" value={latestModel.id} />
                <button type="submit" className="rounded-lg border border-hairline bg-surface-raised px-3 py-1.5 text-xs text-ink-strong transition hover:bg-surface-lifted">
                  Refresh status
                </button>
              </form>
            ) : null}
          </div>

          {processingJobs.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2">
              {processingJobs.slice(0, 4).map((job) => (
                <div key={job.id} className="rounded-xl bg-surface-raised p-3 text-xs text-ink-secondary">
                  {job.provider} · {job.status.replaceAll("_", " ").toLowerCase()}
                  {typeof job.progress === "number" ? ` · ${Math.round(job.progress)}%` : ""}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-muted">No processing jobs yet.</p>
          )}

          {modelReady && latestModel ? (
            <a
              href={`/api/projects/${projectId}/processing/${latestModel.id}/download`}
              className="inline-flex rounded-lg border border-hairline bg-surface-raised px-3 py-1.5 text-xs text-instrument-fg transition hover:bg-surface-lifted"
            >
              Download all model files (.zip)
            </a>
          ) : null}
        </div>
      </details>
    </section>
  );
}
