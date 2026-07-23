"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ImageryUploadForm({ projectId }: { projectId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  function updateSelectedFiles(files: FileList | null) {
    setSelectedFiles(files ? Array.from(files) : []);
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragActive(false);
    const droppedFiles = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/"));
    if (!fileInputRef.current || droppedFiles.length === 0) return;

    const dataTransfer = new DataTransfer();
    droppedFiles.forEach((file) => dataTransfer.items.add(file));
    fileInputRef.current.files = dataTransfer.files;
    setSelectedFiles(droppedFiles);
  }

  async function submitUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsUploading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/projects/${projectId}/imagery`, {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      uploaded?: number;
    };

    if (!response.ok) {
      setError(payload.error ?? "Upload failed");
      setIsUploading(false);
      return;
    }

    formRef.current?.reset();
    setSelectedFiles([]);
    setSuccess(`${payload.uploaded ?? 1} image${payload.uploaded === 1 ? "" : "s"} uploaded`);
    setIsUploading(false);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <form ref={formRef} onSubmit={submitUpload} className="mt-6 rounded-2xl border border-hairline bg-ground/35 p-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_420px]">
        <label
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={handleDrop}
          className={`flex min-h-32 cursor-pointer flex-col justify-center rounded-2xl border border-dashed p-4 transition ${
            isDragActive
              ? "border-instrument-bright/70 bg-instrument-bright/10"
              : "border-white/15 bg-ground/45 hover:border-instrument-bright/35 hover:bg-ground/65"
          }`}
        >
          <input
            ref={fileInputRef}
            name="images"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(event) => updateSelectedFiles(event.currentTarget.files)}
            required
          />
          <span className="text-sm uppercase tracking-[0.16em] text-ink-muted">Upload photos</span>
          <span className="mt-2 text-lg font-semibold text-ink-primary">
            {selectedFiles.length > 0
              ? `${selectedFiles.length} photo${selectedFiles.length === 1 ? "" : "s"} selected`
              : "Drop your drone photos here"}
          </span>
          <span className="mt-1 max-w-xl text-sm leading-6 text-ink-muted">
            Add all the photos from your drone flight at once. The details on the right apply to every photo you select.
          </span>
          <span className="mt-3 inline-flex w-fit rounded-xl border border-instrument-bright/30 bg-instrument/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-instrument/20">
            Choose files
          </span>
          {selectedFiles.length > 0 ? (
            <span className="mt-3 max-w-full truncate text-xs text-cyan-100">
              {selectedFiles.slice(0, 3).map((file) => file.name).join(", ")}
              {selectedFiles.length > 3 ? `, +${selectedFiles.length - 3} more` : ""}
            </span>
          ) : null}
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <select name="type" defaultValue="DRONE" aria-label="Photo type" className="rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-blue-400">
          <option value="DRONE">Drone photo</option>
          <option value="ORTHOMOSAIC">Top-down map</option>
          <option value="MODEL">3D model</option>
          <option value="BEFORE">Before photo</option>
          <option value="AFTER">After photo</option>
          </select>
          <input name="altitudeFt" type="number" step="0.01" aria-label="Flight height, feet" placeholder="Flight height (ft) — optional" className="rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-blue-400" />
          <input name="captureDate" type="date" aria-label="Date taken" className="rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-blue-400" />
          <input name="captureTime" type="time" aria-label="Time taken" className="rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-blue-400" />
          <textarea name="notes" rows={2} aria-label="Photo note" placeholder="Optional note (e.g. front of house)" className="w-full resize-none rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-blue-400 sm:col-span-2" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-5 text-ink-muted">
          Tip: upload the original files straight from the drone — they include location data that makes a better model.
        </p>
        <button
          type="submit"
          disabled={isUploading || isPending}
          className="rounded-2xl bg-instrument px-5 py-3 text-sm font-semibold text-ground transition hover:bg-instrument-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading ? "Uploading…" : isPending ? "Refreshing…" : "Upload photos"}
        </button>
      </div>
      <p role="alert" className="mt-3 text-sm text-rose-300 empty:mt-0">
        {error}
      </p>
      <p aria-live="polite" className="mt-3 text-sm text-emerald-300 empty:mt-0">
        {success}
      </p>
    </form>
  );
}
