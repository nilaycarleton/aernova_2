import Link from "next/link";
import { NewJobForm } from "@/components/dashboard/new-job-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewJobPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Create job"
        // Was "Add a new roofing job". The word had to go rather than be
        // translated: "Add a new job" is already correct in every trade, and
        // a per-trade string that reads identically for every trade is
        // ceremony (PLAN-CRM.md, design constraints).
        title="Add a new job"
        description="A name and who it's for is all it takes. The address, photos and quote can follow whenever you have them."
        secondaryActions={
          <Link
            href="/jobs"
            className="rounded-lg border border-hairline bg-surface-raised px-5 py-3 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted"
          >
            Back to jobs
          </Link>
        }
      />

      <NewJobForm />
    </div>
  );
}
