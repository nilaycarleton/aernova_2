import { PhotoAsset, RoofIssue } from "@prisma/client";
import { createRoofIssueAction } from "@/app/(dashboard)/projects/[projectId]/issue-actions";
import {
  updateInspectionPhotoAction,
  uploadInspectionPhotoAction,
} from "@/app/(dashboard)/projects/[projectId]/photo-actions";
import { PhotoAnnotationStudio } from "@/components/dashboard/photo-annotation-studio";

type Props = {
  projectId: string;
  issues: RoofIssue[];
  photos: PhotoAsset[];
};

const issueTypes = [
  "Missing shingles",
  "Flashing damage",
  "Water damage",
  "Ventilation issue",
  "Soft spots",
  "General repair note",
];

function issueTone(severity: string) {
  switch (severity) {
    case "CRITICAL":
    case "HIGH":
      return "border-rose-400/25 bg-rose-500/10 text-rose-200";
    case "MEDIUM":
      return "border-amber-400/25 bg-amber-500/10 text-amber-200";
    default:
      return "border-sky-accent/25 bg-sky-500/10 text-sky-200";
  }
}

export function InspectionWorkflow({ projectId, issues, photos }: Props) {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-hairline bg-surface-raised p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-2xl font-semibold text-ink-primary">
              Photo evidence, annotations, and issue tracking
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
              Upload site photos, group them by slope or location, mark damage with circles, arrows, and labels,
              then generate homeowner-friendly report evidence.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl border border-hairline bg-ground/50 px-4 py-3">
              <p className="text-lg font-semibold text-ink-primary">{photos.length}</p>
              <p className="text-xs text-ink-muted">Photos</p>
            </div>
            <div className="rounded-2xl border border-hairline bg-ground/50 px-4 py-3">
              <p className="text-lg font-semibold text-ink-primary">{issues.length}</p>
              <p className="text-xs text-ink-muted">Issues</p>
            </div>
            <div className="rounded-2xl border border-hairline bg-ground/50 px-4 py-3">
              <p className="text-lg font-semibold text-ink-primary">
                {issues.filter((issue) => ["HIGH", "CRITICAL"].includes(issue.severity)).length}
              </p>
              <p className="text-xs text-ink-muted">Urgent</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-hairline bg-surface-raised p-6">
          <h3 className="text-2xl font-semibold text-ink-primary">
            Add site photos
          </h3>

          <form action={uploadInspectionPhotoAction} className="mt-6 space-y-4">
            <input type="hidden" name="projectId" value={projectId} />
            <input
              name="photo"
              type="file"
              accept="image/*"
              capture="environment"
              className="block w-full rounded-2xl border border-dashed border-white/15 bg-ground/50 px-4 py-5 text-sm text-ink-secondary file:mr-4 file:rounded-xl file:border-0 file:bg-instrument/15 file:px-4 file:py-2 file:text-sm file:font-medium file:text-cyan-100"
              required
            />
            <p className="text-xs text-ink-muted">
              On phones and tablets this opens the camera directly for on-roof capture.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                name="locationTag"
                placeholder="Slope, section, or location"
                className="rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-blue-400"
              />
              <select
                name="roofIssueId"
                defaultValue=""
                className="rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-blue-400"
              >
                <option value="">No linked issue yet</option>
                {issues.map((issue) => (
                  <option key={issue.id} value={issue.id}>
                    {issue.title} - {issue.locationLabel ?? issue.severity}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              name="caption"
              rows={3}
              placeholder="Caption for report evidence"
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-blue-400"
            />
            <button
              type="submit"
              className="rounded-2xl border border-instrument-bright/30 bg-instrument/10 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:bg-instrument/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-instrument"
            >
              Upload Photo
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-hairline bg-surface-raised p-6">
          <h3 className="text-2xl font-semibold text-ink-primary">
            Record structured inspection issues
          </h3>

          <div className="mt-4">
            <p className="mb-2 text-xs uppercase tracking-[0.14em] text-ink-muted">
              Quick add common issues
            </p>
            <div className="flex flex-wrap gap-2">
              {issueTypes.slice(0, 4).map((issueType) => (
                <form key={issueType} action={createRoofIssueAction}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="title" value={issueType} />
                  <input type="hidden" name="severity" value="MEDIUM" />
                  <button
                    type="submit"
                    className="rounded-full border border-hairline bg-ground/50 px-3 py-1.5 text-xs font-medium text-ink-strong transition hover:border-blue-400/40 hover:bg-signal-blue/10 hover:text-blue-200"
                  >
                    + {issueType}
                  </button>
                </form>
              ))}
            </div>
          </div>

          <form action={createRoofIssueAction} className="mt-4 space-y-4">
            <input type="hidden" name="projectId" value={projectId} />
            <select
              name="title"
              defaultValue="Missing shingles"
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-blue-400"
            >
              {issueTypes.map((issueType) => (
                <option key={issueType} value={issueType}>
                  {issueType}
                </option>
              ))}
            </select>
            <div className="grid gap-4 sm:grid-cols-2">
              <select
                name="severity"
                defaultValue="MEDIUM"
                className="rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-blue-400"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
              <input
                name="locationLabel"
                placeholder="Rear slope near ridge"
                className="rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-blue-400"
              />
            </div>
            <input
              name="photoTag"
              placeholder="Photo tag, slope, or section"
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-blue-400"
            />
            <textarea
              name="recommendedAction"
              rows={3}
              placeholder="Recommended action"
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-blue-400"
            />
            <textarea
              name="urgency"
              rows={2}
              placeholder="Urgency explanation"
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-blue-400"
            />
            <textarea
              name="caption"
              rows={3}
              placeholder="Homeowner-friendly caption or claim support note"
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-blue-400"
            />
            <button
              type="submit"
              className="rounded-2xl border border-instrument-bright/30 bg-instrument/10 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:bg-instrument/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-instrument"
            >
              Add Issue
            </button>
          </form>
        </div>
      </div>

      <PhotoAnnotationStudio projectId={projectId} photos={photos} />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-hairline bg-surface-raised p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-ink-muted">
                Report Evidence
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-ink-primary">
                Photo library
              </h3>
            </div>
            <div className="rounded-full border border-hairline px-3 py-1 text-sm text-ink-secondary">
              {photos.length} photo{photos.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {photos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-hairline p-6 text-sm text-ink-muted md:col-span-2">
                Uploaded photos will appear here with captions, locations, and linked issue records.
              </div>
            ) : (
              photos.map((photo) => (
                <form
                  key={photo.id}
                  action={updateInspectionPhotoAction}
                  className="rounded-2xl border border-hairline bg-ground/50 p-3"
                >
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="photoId" value={photo.id} />
                  <div className="aspect-video overflow-hidden rounded-xl bg-ground">
                    <img
                      src={photo.url}
                      alt={photo.caption || photo.locationTag || photo.fileName || "Inspection photo"}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <input
                    name="locationTag"
                    defaultValue={photo.locationTag ?? ""}
                    placeholder="Location tag"
                    className="mt-3 w-full rounded-xl border border-hairline bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none placeholder:text-ink-muted focus:border-blue-400"
                  />
                  <select
                    name="roofIssueId"
                    defaultValue={photo.roofIssueId ?? ""}
                    className="mt-2 w-full rounded-xl border border-hairline bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-blue-400"
                  >
                    <option value="">No linked issue</option>
                    {issues.map((issue) => (
                      <option key={issue.id} value={issue.id}>
                        {issue.title} - {issue.locationLabel ?? issue.severity}
                      </option>
                    ))}
                  </select>
                  <textarea
                    name="caption"
                    rows={3}
                    defaultValue={photo.caption ?? ""}
                    placeholder="Caption"
                    className="mt-2 w-full rounded-xl border border-hairline bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none placeholder:text-ink-muted focus:border-blue-400"
                  />
                  <button
                    type="submit"
                    className="mt-3 rounded-xl border border-hairline bg-surface-raised px-3 py-2 text-sm text-ink-strong transition hover:bg-surface-lifted"
                  >
                    Save Photo Details
                  </button>
                </form>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-hairline bg-surface-raised p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-ink-muted">
                Inspection Report
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-ink-primary">
                Issue summary
              </h3>
            </div>
            <div className="rounded-full border border-hairline px-3 py-1 text-sm text-ink-secondary">
              {issues.length} issue{issues.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {issues.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-hairline p-6 text-sm text-ink-muted">
                Add missing shingles, flashing damage, water damage, ventilation issues, soft spots, or repair notes.
              </div>
            ) : (
              issues.map((issue) => {
                const linkedPhotos = photos.filter((photo) => photo.roofIssueId === issue.id);
                return (
                  <div key={issue.id} className="rounded-2xl border border-hairline bg-ground/50 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-medium text-ink-primary">{issue.title}</p>
                        <p className="mt-1 text-sm text-ink-muted">
                          {issue.locationLabel ?? "Location not set"}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium ${issueTone(issue.severity)}`}>
                        {issue.severity}
                      </span>
                    </div>
                    {issue.description ? (
                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink-muted">
                        {issue.description}
                      </p>
                    ) : null}
                    {linkedPhotos.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {linkedPhotos.map((photo) => (
                          <span key={photo.id} className="rounded-full bg-signal-blue/10 px-3 py-1 text-xs text-blue-200">
                            Linked photo: {photo.locationTag ?? photo.fileName ?? "Evidence"}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
