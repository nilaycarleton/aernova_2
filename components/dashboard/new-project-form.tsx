"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createProjectAction, type NewProjectState } from "@/app/(dashboard)/projects/new/actions";
import { SubmitButton } from "@/components/dashboard/submit-button";

const FIELD =
  "w-full rounded-xl border bg-ground/50 px-4 py-3 text-ink-primary outline-none transition placeholder:text-ink-muted";

/** Red stroke on the field itself, so the problem is visible without reading. */
function fieldClass(error?: string) {
  return `${FIELD} ${error ? "border-rose-400 focus:border-rose-300" : "border-hairline focus:border-signal-blue"}`;
}

/** Paired with the stroke: colour alone never carries the message (WCAG 1.4.1). */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-xs text-rose-200">
      {message}
    </p>
  );
}

export function NewProjectForm() {
  const [state, formAction] = useActionState<NewProjectState, FormData>(createProjectAction, {});
  const errors = state.fieldErrors ?? {};
  const errorCount = Object.keys(errors).length;

  return (
    <form action={formAction} className="rounded-3xl border border-hairline bg-surface-raised p-6">
      {errorCount > 0 ? (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {errorCount === 1
            ? "One thing needs fixing before we can save this job."
            : `${errorCount} things need fixing before we can save this job.`}{" "}
          Nothing you typed has been lost.
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="new-project-name" className="mb-2 block text-sm font-medium text-ink-secondary">
            Project Name
          </label>
          <input
            id="new-project-name"
            name="name"
            type="text"
            placeholder="Maple Street Full Replacement"
            className={fieldClass(errors.name)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "new-project-name-error" : undefined}
            required
          />
          <FieldError id="new-project-name-error" message={errors.name} />
        </div>

        <div>
          <label htmlFor="new-project-clientName" className="mb-2 block text-sm font-medium text-ink-secondary">
            Client Name
          </label>
          <input
            id="new-project-clientName"
            name="clientName"
            type="text"
            placeholder="North Peak Roofing"
            className={fieldClass(errors.clientName)}
            aria-invalid={Boolean(errors.clientName)}
            aria-describedby={errors.clientName ? "new-project-clientName-error" : undefined}
            required
          />
          <FieldError id="new-project-clientName-error" message={errors.clientName} />
        </div>

        <div>
          <label htmlFor="new-project-captureSource" className="mb-2 block text-sm font-medium text-ink-secondary">
            Capture Source
          </label>
          <select
            id="new-project-captureSource"
            name="captureSource"
            defaultValue="MANUAL"
            className={fieldClass()}
          >
            <option value="MANUAL">Manual</option>
            <option value="DRONE">Drone</option>
          </select>
        </div>

        <div>
          <label htmlFor="new-project-clientEmail" className="mb-2 block text-sm font-medium text-ink-secondary">
            Client Email
          </label>
          <input
            id="new-project-clientEmail"
            name="clientEmail"
            type="email"
            placeholder="client@example.com"
            className={fieldClass()}
          />
        </div>

        <div>
          <label htmlFor="new-project-clientPhone" className="mb-2 block text-sm font-medium text-ink-secondary">
            Client Phone
          </label>
          <input
            id="new-project-clientPhone"
            name="clientPhone"
            type="text"
            placeholder="555-123-4567"
            className={fieldClass()}
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="new-project-addressLine1" className="mb-2 block text-sm font-medium text-ink-secondary">
            Address
          </label>
          <input
            id="new-project-addressLine1"
            name="addressLine1"
            type="text"
            placeholder="145 Maple Street"
            className={fieldClass(errors.addressLine1)}
            aria-invalid={Boolean(errors.addressLine1)}
            aria-describedby={errors.addressLine1 ? "new-project-addressLine1-error" : undefined}
            required
          />
          <FieldError id="new-project-addressLine1-error" message={errors.addressLine1} />
        </div>

        <div>
          <label htmlFor="new-project-city" className="mb-2 block text-sm font-medium text-ink-secondary">
            City
          </label>
          <input
            id="new-project-city"
            name="city"
            type="text"
            placeholder="Brampton"
            className={fieldClass(errors.city)}
            aria-invalid={Boolean(errors.city)}
            aria-describedby={errors.city ? "new-project-city-error" : undefined}
            required
          />
          <FieldError id="new-project-city-error" message={errors.city} />
        </div>

        <div>
          <label htmlFor="new-project-province" className="mb-2 block text-sm font-medium text-ink-secondary">
            Province
          </label>
          <input
            id="new-project-province"
            name="province"
            type="text"
            placeholder="ON"
            className={fieldClass(errors.province)}
            aria-invalid={Boolean(errors.province)}
            aria-describedby={errors.province ? "new-project-province-error" : undefined}
            required
          />
          <FieldError id="new-project-province-error" message={errors.province} />
        </div>

        <div>
          <label htmlFor="new-project-postalCode" className="mb-2 block text-sm font-medium text-ink-secondary">
            Postal Code
          </label>
          <input
            id="new-project-postalCode"
            name="postalCode"
            type="text"
            placeholder="L6X 0A1"
            className={fieldClass()}
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="new-project-notes" className="mb-2 block text-sm font-medium text-ink-secondary">
            Notes
          </label>
          <textarea
            id="new-project-notes"
            name="notes"
            rows={5}
            placeholder="Initial job notes, homeowner context, roof condition summary..."
            className={fieldClass()}
          />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <SubmitButton
          pendingText="Creating..."
          className="rounded-xl bg-signal-blue-deep px-5 py-3 text-sm font-medium text-ink-primary transition hover:bg-signal-blue disabled:opacity-40"
        >
          Create Project
        </SubmitButton>

        <Link
          href="/dashboard"
          className="rounded-xl border border-hairline bg-surface-raised px-5 py-3 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
