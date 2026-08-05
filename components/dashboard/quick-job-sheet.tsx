"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  createQuickJobAction,
  type QuickJobState,
} from "@/app/(dashboard)/jobs/quick/actions";
import { ClientPicker, type ClientSelection } from "@/components/dashboard/client-picker";
import { SubmitButton } from "@/components/dashboard/submit-button";

const FIELD =
  "w-full rounded-xl border bg-ground/50 px-4 py-3 text-base text-ink-primary outline-none transition placeholder:text-ink-muted";

function fieldClass(error?: string) {
  return `${FIELD} ${error ? "border-danger focus:border-danger" : "border-hairline focus:border-signal-blue"}`;
}

/**
 * Three fields, standing in a driveway.
 *
 * Everything is `text-base` rather than the desktop `text-sm`: iOS zooms the
 * whole page when a focused input is under 16px, and a form that jumps under
 * your thumb is unusable outdoors. The buttons are full-width and stacked for
 * the same reason — one thumb, no precision.
 *
 * There is no [Book] button, and there deliberately won't be until Phase 4.
 * Booking means a date, a visit and a calendar to put it on, none of which
 * exist yet; a button that says Book and quietly does not book is worse than
 * no button. What is here instead is the price, which is what the door-step
 * conversation actually produces.
 */
export function QuickJobSheet() {
  const [state, formAction] = useActionState<QuickJobState, FormData>(
    createQuickJobAction,
    {}
  );
  const errors = state.fieldErrors ?? {};
  const was = (key: string) => state.values?.[key] ?? "";

  const [selection, setSelection] = useState<ClientSelection | null>(null);
  const who =
    selection?.kind === "new"
      ? selection.name
      : selection?.kind === "existing"
        ? selection.client.displayName
        : null;

  return (
    <form action={formAction} className="space-y-6">
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

      <ClientPicker
        initialQuery={was("clientName")}
        error={errors.client}
        onSelectionChange={setSelection}
      />

      {selection?.kind === "new" ? (
        <div>
          <label htmlFor="quick-phone" className="mb-2 block text-sm font-medium text-ink-secondary">
            Phone <span className="text-ink-muted">(optional)</span>
          </label>
          <input
            id="quick-phone"
            name="clientPhone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={was("clientPhone")}
            placeholder="555-123-4567"
            className={fieldClass()}
          />
        </div>
      ) : null}

      <div>
        <label htmlFor="quick-name" className="mb-2 block text-sm font-medium text-ink-secondary">
          What&rsquo;s the work? <span className="text-ink-muted">(optional)</span>
        </label>
        <input
          id="quick-name"
          name="name"
          type="text"
          defaultValue={was("name")}
          placeholder={who ? `Job for ${who}` : "Re-shingle the back slope"}
          className={fieldClass()}
        />
      </div>

      <div>
        <label htmlFor="quick-price" className="mb-2 block text-sm font-medium text-ink-secondary">
          Price you gave them <span className="text-ink-muted">(optional)</span>
        </label>
        <input
          id="quick-price"
          name="price"
          type="text"
          inputMode="decimal"
          defaultValue={was("price")}
          placeholder="$4,200"
          className={fieldClass(errors.price)}
          aria-invalid={errors.price ? true : undefined}
          aria-describedby="quick-price-hint"
        />
        <p id="quick-price-hint" className="mt-2 text-xs text-ink-muted">
          {errors.price ??
            "A number here starts a draft quote you can tidy up and send tonight."}
        </p>
      </div>

      <div className="space-y-3 pt-2">
        <SubmitButton
          pendingText="Saving…"
          className="w-full rounded-xl bg-ink-primary px-6 py-4 text-base font-semibold text-ground transition hover:bg-ink-secondary disabled:opacity-60"
        >
          Save it
        </SubmitButton>
        <Link
          href="/jobs/new"
          className="block w-full rounded-xl border border-hairline bg-surface-raised px-6 py-4 text-center text-base font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
        >
          The full form instead
        </Link>
      </div>
    </form>
  );
}
