import Link from "next/link";
import { createProjectAction } from "./actions";

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Create Project
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              Add a new roofing project
            </h1>
            <p className="mt-3 max-w-2xl text-slate-400">
              Start a new job record for measurements, inspection notes,
              proposals, and project tracking.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Back to Dashboard
          </Link>
        </div>
      </section>

      <form
        action={createProjectAction}
        className="rounded-3xl border border-white/10 bg-white/5 p-6"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Project Name
            </label>
            <input
              name="name"
              type="text"
              placeholder="Maple Street Full Replacement"
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Client Name
            </label>
            <input
              name="clientName"
              type="text"
              placeholder="North Peak Roofing"
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Capture Source
            </label>
            <select
              name="captureSource"
              defaultValue="MANUAL"
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-blue-500"
            >
              <option value="MANUAL">Manual</option>
              <option value="SATELLITE">Satellite</option>
              <option value="DRONE">Drone</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Client Email
            </label>
            <input
              name="clientEmail"
              type="email"
              placeholder="client@example.com"
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Client Phone
            </label>
            <input
              name="clientPhone"
              type="text"
              placeholder="555-123-4567"
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Address
            </label>
            <input
              name="addressLine1"
              type="text"
              placeholder="145 Maple Street"
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              City
            </label>
            <input
              name="city"
              type="text"
              placeholder="Brampton"
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Province
            </label>
            <input
              name="province"
              type="text"
              placeholder="ON"
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Postal Code
            </label>
            <input
              name="postalCode"
              type="text"
              placeholder="L6X 0A1"
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Notes
            </label>
            <textarea
              name="notes"
              rows={5}
              placeholder="Initial job notes, homeowner context, roof condition summary..."
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            Create Project
          </button>

          <Link
            href="/dashboard"
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}