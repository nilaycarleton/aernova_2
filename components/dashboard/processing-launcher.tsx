"use client";

import { useState, useTransition } from "react";
import {
  previewPhotogrammetryModelAction,
  processPhotogrammetryModelAction,
} from "@/app/(dashboard)/projects/[projectId]/phase-six-actions";
import { SubmitButton } from "@/components/dashboard/submit-button";
import type { ProcessingReadiness } from "@/lib/reconstruction";

type Props = {
  projectId: string;
  sourceImageCount: number;
  workerConfigured: boolean;
};

export function ProcessingLauncher({ projectId, sourceImageCount, workerConfigured }: Props) {
  const [readiness, setReadiness] = useState<ProcessingReadiness | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [isPreviewing, startPreview] = useTransition();

  function runPreview() {
    setPreviewError("");
    startPreview(async () => {
      try {
        setReadiness(await previewPhotogrammetryModelAction(projectId));
      } catch (error) {
        setPreviewError(error instanceof Error ? error.message : "Preview failed");
      }
    });
  }

  // Only block the real submit once a preview has actually told us it is not
  // ready; before any preview we let the server-side gate be the backstop.
  const blockSubmit = workerConfigured && readiness !== null && !readiness.ready;

  return (
    <div className="mt-5 rounded-2xl border border-instrument-bright/15 bg-instrument-bright/5 p-4">
      <form action={processPhotogrammetryModelAction}>
        <input type="hidden" name="projectId" value={projectId} />
        <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <input
            name="label"
            defaultValue="Roof 3D model"
            className="rounded-xl border border-hairline bg-ground/60 px-4 py-3 text-ink-primary outline-none focus:border-instrument-bright"
          />
          <select
            name="quality"
            defaultValue="standard"
            className="rounded-xl border border-hairline bg-ground/60 px-4 py-3 text-ink-primary outline-none focus:border-instrument-bright"
          >
            <option value="standard">Standard quality</option>
            <option value="high">High quality (slower)</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">
            {sourceImageCount} photo{sourceImageCount === 1 ? "" : "s"} ready to build from
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runPreview}
              disabled={isPreviewing}
              className="rounded-xl border border-instrument-bright/30 bg-instrument-bright/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-instrument-bright/20 disabled:opacity-50"
            >
              {isPreviewing ? "Checking…" : "Check my photos (free)"}
            </button>
            <SubmitButton
              disabled={blockSubmit}
              title={blockSubmit ? readiness?.blockingReason ?? undefined : undefined}
              pendingText="Starting…"
              className="rounded-xl bg-instrument-deep px-4 py-2 text-sm font-medium text-ground transition hover:bg-instrument disabled:cursor-not-allowed disabled:opacity-50"
            >
              {workerConfigured ? "Build 3D model" : "Build preview model"}
            </SubmitButton>
          </div>
        </div>
      </form>

      {previewError ? (
        <p className="mt-3 rounded-xl border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {previewError}
        </p>
      ) : null}

      {readiness ? (
        <div
          className={`mt-3 rounded-2xl border p-3 ${
            readiness.ready
              ? "border-emerald-300/25 bg-emerald-400/10"
              : "border-amber-300/25 bg-amber-400/10"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-ink-primary">
              {readiness.ready ? "Your photos are ready" : "Not ready yet"}
            </p>
            <span className="rounded-full border border-hairline bg-ground/40 px-2.5 py-1 text-xs text-ink-strong">
              Photo quality {readiness.score}/100 · {readiness.imageCount} photos
            </span>
          </div>
          {readiness.blockingReason ? (
            <p className="mt-2 text-xs leading-5 text-amber-100">{readiness.blockingReason}</p>
          ) : (
            <p className="mt-2 text-xs leading-5 text-emerald-100">
              Your photos look good. Click &quot;Build 3D model&quot; when you&apos;re ready — that&apos;s the step that starts the build.
            </p>
          )}
          {readiness.estimate.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">
                Rough estimate (before the real 3D scan)
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {readiness.estimate.map((item) => (
                  <span
                    key={item.label}
                    className="rounded-full border border-hairline bg-surface-raised px-2.5 py-1 text-xs text-ink-secondary"
                  >
                    {item.label}: {item.value}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
