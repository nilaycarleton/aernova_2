import Link from "next/link";
import { NewRequestForm } from "@/components/dashboard/new-request-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewRequestPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Request"
        title="Write down what they asked for"
        description="Two things: who called, and what they want. Everything else is there if you have it and skippable if you don't."
        secondaryActions={
          <Link
            href="/requests"
            className="rounded-xl border border-hairline bg-surface-raised px-5 py-3 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted"
          >
            Back to requests
          </Link>
        }
      />

      <NewRequestForm />
    </div>
  );
}
