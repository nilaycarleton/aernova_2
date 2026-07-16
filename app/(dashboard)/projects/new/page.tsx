import Link from "next/link";
import { NewProjectForm } from "@/components/dashboard/new-project-form";

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

      <NewProjectForm />
    </div>
  );
}
