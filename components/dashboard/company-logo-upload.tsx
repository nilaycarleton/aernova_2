"use client";

import { useId, useState } from "react";
import {
  removeCompanyLogoAction,
  uploadCompanyLogoAction,
} from "@/app/(dashboard)/settings/actions";
import { downscaleImage } from "@/lib/image-downscale";

/**
 * The bytes go up on selection — same shape as a quote line's photo. A logo
 * has no draft state to hold it in, so there is nothing to wait for a second
 * Save on: pick it, and it is the company's logo.
 */
export function CompanyLogoUpload({ logoUrl }: { logoUrl: string | null }) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState(logoUrl);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const data = new FormData();
      data.set("logo", await downscaleImage(file));
      const result = await uploadCompanyLogoAction(data);
      if (result.error) setError(result.error);
      else if (result.url) setUrl(result.url);
    } catch {
      setError("That image didn't upload. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await removeCompanyLogoAction();
      setUrl(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      {url ? (
        <img
          src={url}
          alt="Company logo"
          className="size-16 rounded-xl border border-hairline object-cover"
        />
      ) : (
        <div className="flex size-16 items-center justify-center rounded-xl border border-dashed border-hairline text-xs text-ink-muted">
          No logo
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {/* A label, not a button opening a hidden input: a real file input for
            a screen reader and for a keyboard, and the camera opens directly
            on a phone. */}
        <label
          htmlFor={inputId}
          className="cursor-pointer text-sm text-ink-secondary underline underline-offset-2 transition hover:text-ink-primary has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-instrument"
        >
          {busy ? "Working…" : url ? "Replace logo" : "Add a logo"}
          <input
            id={inputId}
            type="file"
            accept="image/*"
            disabled={busy}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              // Cleared so picking the same file twice still fires a change.
              event.target.value = "";
              if (file) void upload(file);
            }}
          />
        </label>
        {url ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove()}
            className="text-sm text-ink-muted underline underline-offset-2 transition hover:text-danger-fg disabled:opacity-60"
          >
            Remove
          </button>
        ) : null}
        {error ? (
          <span role="alert" className="w-full text-xs text-danger-fg">
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}
