"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * One compact drag-drop tile for a single photo. Mirrors the drone uploader's drop
 * behaviour (set the dropped file on the hidden input via DataTransfer) at a
 * smaller scale, and shows a thumbnail once a photo is chosen.
 */
function PhotoDropZone({ name, label }: { name: string; label: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  function choose(file: File | null) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = file ? URL.createObjectURL(file) : null;
    setPreview(urlRef.current);
    setFileName(file?.name ?? null);
  }

  // Release the last object URL when the tile unmounts.
  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  function onDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDrag(false);
    const image = Array.from(event.dataTransfer.files).find((file) => file.type.startsWith("image/"));
    if (!image || !inputRef.current) return;
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(image);
    inputRef.current.files = dataTransfer.files;
    choose(image);
  }

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed p-4 text-center transition ${
        drag
          ? "border-instrument-bright/70 bg-instrument-bright/10"
          : "border-hairline bg-ground/45 hover:border-instrument-bright/35 hover:bg-ground/65"
      }`}
    >
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => choose(event.currentTarget.files?.[0] ?? null)}
      />
      {preview ? (
        <>
          {/* Local preview of the chosen file; alt="" is intentional (decorative). */}
          <img src={preview} alt="" className="h-20 w-full rounded-lg object-cover" />
          <span className="max-w-full truncate text-xs text-ink-secondary">{fileName}</span>
          <span className="text-xs text-ink-muted">Click or drop to replace</span>
        </>
      ) : (
        <>
          <span className="text-xs uppercase tracking-[0.16em] text-ink-muted">{label} photo</span>
          <span className="inline-flex rounded-lg border border-hairline bg-surface-raised px-3 py-1.5 text-sm font-medium text-ink-primary">
            Upload photo
          </span>
          <span className="text-xs text-ink-muted">or drop a file</span>
        </>
      )}
    </label>
  );
}

export function ComparisonCreateForm({ jobId }: { jobId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Posts to the comparisons route handler (not a Server Action) so the two
  // photos aren't capped by the 1 MB Server Action body limit.
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/jobs/${jobId}/comparisons`, {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Could not create the comparison");
      setSaving(false);
      return;
    }

    formRef.current?.reset();
    setSuccess("Comparison created");
    setSaving(false);
    startTransition(() => router.refresh());
  }

  return (
    <form ref={formRef} onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2">
        <input
          name="title"
          placeholder="e.g. Front slope — before and after"
          className="w-full rounded-md border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-signal-blue"
          required
        />
      </div>
      <PhotoDropZone name="beforeImage" label="Before" />
      <PhotoDropZone name="afterImage" label="After" />
      <textarea
        name="summary"
        rows={2}
        placeholder="Optional note"
        className="rounded-md border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-signal-blue md:col-span-2"
      />
      <button
        type="submit"
        disabled={saving || isPending}
        className="rounded-lg border border-hairline bg-surface-raised px-5 py-3 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-instrument disabled:opacity-40 md:col-span-2"
      >
        {saving ? "Creating…" : isPending ? "Refreshing…" : "Create comparison"}
      </button>
      <p role="alert" className="text-sm text-danger-fg empty:hidden md:col-span-2">
        {error}
      </p>
      <p aria-live="polite" className="text-sm text-confirm-fg empty:hidden md:col-span-2">
        {success}
      </p>
    </form>
  );
}
