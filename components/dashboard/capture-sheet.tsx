"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import {
  captureFromPhotoAction,
  createJobFromCaptureAction,
  type CaptureState,
  type CreateFromCaptureState,
} from "@/app/(dashboard)/jobs/capture/actions";
import { ClientPicker, type ClientSelection } from "@/components/dashboard/client-picker";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { downscaleImage } from "@/lib/image-downscale";
import { formatMoney } from "@/lib/money";

const FIELD =
  "w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-base text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-signal-blue";

/**
 * Item 49. Two steps in one sheet: a photo goes up and comes back as a
 * draft (`captureFromPhotoAction`, called directly rather than through a
 * native form submit — same reason `LinePhoto` on the quote builder
 * downscales in an `onChange` handler instead of posting the original file);
 * then the draft is a normal `useActionState` form, because from here on
 * it's exactly `/jobs/new`'s own review-before-save shape.
 *
 * Nothing is created by the first step. The photo is uploaded (so it isn't
 * lost if the draft step fails), but no `Job` exists until Save.
 */
export function CaptureSheet() {
  const [capture, setCapture] = useState<CaptureState>({});
  const [busy, setBusy] = useState(false);
  const inputId = useId();

  const [saveState, saveAction] = useActionState<CreateFromCaptureState, FormData>(
    createJobFromCaptureAction,
    {}
  );
  const [selection, setSelection] = useState<ClientSelection | null>(null);

  async function pick(file: File) {
    setBusy(true);
    setCapture({});
    try {
      const data = new FormData();
      data.set("photo", await downscaleImage(file));
      setCapture(await captureFromPhotoAction(data));
    } catch {
      setCapture({ error: "That photo didn't upload. Try again." });
    } finally {
      setBusy(false);
    }
  }

  if (!capture.draft) {
    return (
      <div className="space-y-6">
        <div>
          <label
            htmlFor={inputId}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-hairline bg-ground/50 px-6 py-10 text-center transition hover:bg-surface-lifted has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-instrument ${busy ? "opacity-60" : ""}`}
          >
            <span className="text-base font-medium text-ink-primary">
              {busy ? "Reading the photo…" : "Take or choose a photo"}
            </span>
            <span className="text-sm text-ink-muted">
              Claude drafts a job name, a description, and a matching price from your catalog.
              Nothing saves until you review it.
            </span>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              capture="environment"
              disabled={busy}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void pick(file);
              }}
            />
          </label>
        </div>

        {capture.error ? (
          <p role="alert" className="text-sm text-danger-fg">
            {capture.error}
          </p>
        ) : null}

        <Link
          href="/jobs/new"
          className="block w-full rounded-xl border border-hairline bg-surface-raised px-6 py-4 text-center text-base font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
        >
          The full form instead
        </Link>
      </div>
    );
  }

  const { draft, imageUrl } = capture;
  const errors = saveState.fieldErrors ?? {};

  return (
    <form action={saveAction} className="space-y-6">
      <input type="hidden" name="imageUrl" value={imageUrl ?? ""} />
      <input type="hidden" name="serviceId" value={draft.serviceId ?? ""} />
      <input
        type="hidden"
        name="clientId"
        value={selection?.kind === "existing" ? selection.client.id : ""}
      />
      <input
        type="hidden"
        name="clientName"
        value={selection?.kind === "new" ? selection.name : ""}
      />
      <input
        type="hidden"
        name="clientIsBusiness"
        value={selection?.kind === "new" && selection.isBusiness ? "true" : ""}
      />

      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-40 w-full rounded-xl border border-hairline object-cover" />
      ) : null}

      <ClientPicker error={errors.client} onSelectionChange={setSelection} />

      <div>
        <label htmlFor="capture-name" className="mb-2 block text-sm font-medium text-ink-secondary">
          Job name
        </label>
        <input
          id="capture-name"
          name="name"
          type="text"
          defaultValue={saveState.values?.name ?? draft.jobName}
          className={FIELD}
        />
      </div>

      <div>
        <label htmlFor="capture-notes" className="mb-2 block text-sm font-medium text-ink-secondary">
          What Claude saw <span className="text-ink-muted">(edit if it&rsquo;s off)</span>
        </label>
        <textarea
          id="capture-notes"
          name="notes"
          rows={3}
          defaultValue={saveState.values?.notes ?? draft.description}
          className={FIELD}
        />
      </div>

      {draft.serviceId && draft.suggestedPriceCents != null ? (
        <p className="rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-sm text-ink-secondary">
          Matched to your catalog at {formatMoney(draft.suggestedPriceCents)}. Saving starts a
          draft quote with this line already on it.
        </p>
      ) : (
        <p className="text-xs text-ink-muted">
          Nothing in your catalog matched closely enough to suggest a price.
        </p>
      )}

      <div className="space-y-3 pt-2">
        <SubmitButton
          pendingText="Saving…"
          className="w-full rounded-xl bg-ink-primary px-6 py-4 text-base font-semibold text-ground transition hover:bg-ink-secondary disabled:opacity-60"
        >
          Save it
        </SubmitButton>
        <button
          type="button"
          onClick={() => setCapture({})}
          className="block w-full rounded-xl border border-hairline bg-surface-raised px-6 py-4 text-center text-base font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
        >
          Start over with a different photo
        </button>
      </div>
    </form>
  );
}
