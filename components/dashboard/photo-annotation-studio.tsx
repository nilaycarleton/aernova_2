"use client";

import { useMemo, useState } from "react";
import { savePhotoAnnotationsAction } from "@/app/(dashboard)/projects/[projectId]/photo-actions";

type Annotation =
  | { id: string; tool: "circle"; x: number; y: number; r: number; label: string }
  | { id: string; tool: "arrow"; x1: number; y1: number; x2: number; y2: number; label: string }
  | { id: string; tool: "label"; x: number; y: number; label: string };

type Photo = {
  id: string;
  url: string;
  fileName: string | null;
  locationTag: string | null;
  caption: string | null;
  annotationsJson: unknown;
};

type Props = {
  projectId: string;
  photos: Photo[];
};

function parseAnnotations(value: unknown): Annotation[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Annotation => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as { tool?: string; label?: string };
    return ["circle", "arrow", "label"].includes(candidate.tool ?? "") && typeof candidate.label === "string";
  });
}

export function PhotoAnnotationStudio({ projectId, photos }: Props) {
  const [selectedPhotoId, setSelectedPhotoId] = useState(photos[0]?.id ?? "");
  const [tool, setTool] = useState<Annotation["tool"]>("circle");
  const [label, setLabel] = useState("Damage");
  const selectedPhoto = photos.find((photo) => photo.id === selectedPhotoId) ?? photos[0] ?? null;
  const [drafts, setDrafts] = useState<Record<string, Annotation[]>>({});
  const annotations = useMemo(() => {
    if (!selectedPhoto) return [];
    return drafts[selectedPhoto.id] ?? parseAnnotations(selectedPhoto.annotationsJson);
  }, [drafts, selectedPhoto]);

  if (!selectedPhoto) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-sm text-slate-400">
        Upload a site photo to start annotating damage with circles, arrows, and labels.
      </div>
    );
  }

  function addAnnotation(event: React.MouseEvent<HTMLDivElement>) {
    if (!selectedPhoto) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    const id = crypto.randomUUID();
    const nextAnnotation: Annotation =
      tool === "circle"
        ? { id, tool, x, y, r: 7, label }
        : tool === "arrow"
          ? { id, tool, x1: Math.max(x - 10, 0), y1: Math.max(y - 8, 0), x2: x, y2: y, label }
          : { id, tool, x, y, label };

    setDrafts((current) => ({
      ...current,
      [selectedPhoto.id]: [...annotations, nextAnnotation],
    }));
  }

  function clearLast() {
    if (!selectedPhoto) return;
    setDrafts((current) => ({
      ...current,
      [selectedPhoto.id]: annotations.slice(0, -1),
    }));
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
            Annotation Tools
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-white">
            Mark damage on photo evidence
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["circle", "arrow", "label"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setTool(mode)}
              className={`rounded-2xl border px-4 py-2 text-sm capitalize transition ${
                tool === mode
                  ? "border-blue-400/40 bg-blue-500/15 text-blue-200"
                  : "border-white/10 bg-slate-950/50 text-slate-300 hover:bg-white/10"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[260px_1fr]">
        <div className="space-y-3">
          {photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setSelectedPhotoId(photo.id)}
              className={`w-full rounded-2xl border p-3 text-left transition ${
                selectedPhoto.id === photo.id
                  ? "border-blue-400/40 bg-blue-500/10"
                  : "border-white/10 bg-slate-950/40 hover:bg-white/10"
              }`}
            >
              <div className="aspect-video overflow-hidden rounded-xl bg-slate-950">
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
              </div>
              <p className="mt-3 text-sm font-medium text-white">
                {photo.locationTag || photo.fileName || "Inspection photo"}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                {photo.caption || "No caption saved"}
              </p>
            </button>
          ))}
        </div>

        <div>
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-blue-400"
              placeholder="Annotation label"
            />
            <button
              type="button"
              onClick={clearLast}
              className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10"
            >
              Undo Last
            </button>
            <form action={savePhotoAnnotationsAction}>
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="photoId" value={selectedPhoto.id} />
              <input type="hidden" name="annotationsJson" value={JSON.stringify(annotations)} />
              <button
                type="submit"
                className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                Save Markup
              </button>
            </form>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={addAnnotation}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950"
          >
            <img src={selectedPhoto.url} alt="" className="block max-h-[620px] w-full object-contain" />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {annotations.map((annotation) => {
                if (annotation.tool === "circle") {
                  return (
                    <g key={annotation.id}>
                      <circle cx={annotation.x} cy={annotation.y} r={annotation.r} fill="rgba(249,115,22,0.18)" stroke="#FDBA74" strokeWidth="0.8" />
                      <text x={annotation.x + annotation.r + 1} y={annotation.y} fill="#FED7AA" fontSize="3" dominantBaseline="middle">
                        {annotation.label}
                      </text>
                    </g>
                  );
                }

                if (annotation.tool === "arrow") {
                  return (
                    <g key={annotation.id}>
                      <defs>
                        <marker id={`arrow-${annotation.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#FBBF24" />
                        </marker>
                      </defs>
                      <line x1={annotation.x1} y1={annotation.y1} x2={annotation.x2} y2={annotation.y2} stroke="#FBBF24" strokeWidth="0.9" markerEnd={`url(#arrow-${annotation.id})`} />
                      <text x={annotation.x1} y={annotation.y1 - 2} fill="#FEF3C7" fontSize="3">
                        {annotation.label}
                      </text>
                    </g>
                  );
                }

                return (
                  <g key={annotation.id}>
                    <rect x={annotation.x} y={annotation.y - 4} width={Math.max(annotation.label.length * 1.9, 12)} height="6" rx="1.5" fill="rgba(15,23,42,0.86)" stroke="#93C5FD" strokeWidth="0.4" />
                    <text x={annotation.x + 1.5} y={annotation.y} fill="#BFDBFE" fontSize="3.1" dominantBaseline="middle">
                      {annotation.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Click the photo to place the selected markup. Saved annotations appear in the printable inspection report.
          </p>
        </div>
      </div>
    </div>
  );
}
