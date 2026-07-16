import Link from "next/link";
import { createProjectAction } from "./actions";

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-ink-muted">
              Create Project
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-ink-primary">
              Add a new roofing project
            </h1>
            <p className="mt-3 max-w-2xl text-ink-muted">
              Start a new job record for measurements, inspection notes,
              proposals, and project tracking.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-hairline bg-surface-raised px-5 py-3 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted"
          >
            Back to Dashboard
          </Link>
        </div>
      </section>

      <form
        action={createProjectAction}
        className="rounded-3xl border border-hairline bg-surface-raised p-6"
      >
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
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-signal-blue"
              required
            />
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
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-signal-blue"
              required
            />
          </div>

          <div>
            <label htmlFor="new-project-captureSource" className="mb-2 block text-sm font-medium text-ink-secondary">
              Capture Source
            </label>
            <select
              id="new-project-captureSource"
              name="captureSource"
              defaultValue="MANUAL"
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none transition focus:border-signal-blue"
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
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-signal-blue"
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
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-signal-blue"
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
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-signal-blue"
              required
            />
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
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-signal-blue"
              required
            />
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
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-signal-blue"
              required
            />
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
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-signal-blue"
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
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-signal-blue"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-ink-primary transition hover:bg-signal-blue"
          >
            Create Project
          </button>

          <Link
            href="/dashboard"
            className="rounded-xl border border-hairline bg-surface-raised px-5 py-3 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
