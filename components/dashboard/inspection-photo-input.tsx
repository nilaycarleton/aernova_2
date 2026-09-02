"use client";

import { useRef, useState } from "react";

/**
 * The single-photo counterpart to Scan's `ImageryUploadForm` — same dashed
 * dropzone, same "Choose file" pill, same drag-active state — so Inspect and
 * Scan offer the same upload affordance for the same kind of action. Unlike
 * that form this stays inside `uploadInspectionPhotoAction`'s ordinary form
 * submission (single file, plus the location/issue/caption fields the
 * inspection upload needs): only the visual shell changes, not how the
 * photo actually gets to the server.
 */
export function InspectionPhotoInput() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragActive(false);
    const dropped = Array.from(event.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );
    if (!fileInputRef.current || dropped.length === 0) return;

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(dropped[0]);
    fileInputRef.current.files = dataTransfer.files;
    setFileName(dropped[0].name);
  }

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={handleDrop}
      className={`flex min-h-32 cursor-pointer flex-col justify-center rounded-lg border border-dashed p-4 transition ${
        isDragActive
          ? "border-instrument-bright/70 bg-instrument-bright/10"
          : "border-hairline bg-ground/45 hover:border-instrument-bright/35 hover:bg-ground/65"
      }`}
    >
      <input
        ref={fileInputRef}
        name="photo"
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => setFileName(event.currentTarget.files?.[0]?.name ?? null)}
        required
      />
      <span className="text-sm uppercase tracking-[0.16em] text-ink-muted">Upload photo</span>
      <span className="mt-2 text-lg font-semibold text-ink-primary">
        {fileName ?? "Drop a site photo here"}
      </span>
      <span className="mt-1 max-w-xl text-sm leading-6 text-ink-muted">
        On phones and tablets this opens the camera directly for on-roof capture.
      </span>
      <span className="mt-3 inline-flex w-fit rounded-lg border border-hairline bg-surface-raised px-4 py-2 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted">
        Choose file
      </span>
    </label>
  );
}
