import Link from "next/link";
import { NewJobForm } from "@/components/dashboard/new-job-form";

export default function NewJobPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-ink-muted">
              Create Job
            </p>
            {/* Was "Add a new roofing job". The word had to go rather than be
                translated: "Add a new job" is already correct in every trade,
                and a per-trade string that reads identically for every trade is
                ceremony (PLAN-CRM.md, design constraints). */}
            <h1 className="mt-2 text-3xl font-semibold text-ink-primary">
              Add a new job
            </h1>
            <p className="mt-3 max-w-2xl text-ink-muted">
              A name and who it&rsquo;s for is all it takes. The address, photos and quote can
              follow whenever you have them.
            </p>
          </div>

          <Link
            href="/jobs"
            className="rounded-xl border border-hairline bg-surface-raised px-5 py-3 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted"
          >
            Back to jobs
          </Link>
        </div>
      </section>

      <NewJobForm />
    </div>
  );
}
