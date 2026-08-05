import Link from "next/link";
import { NewRequestForm } from "@/components/dashboard/new-request-form";

export default function NewRequestPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-ink-muted">Request</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink-primary">
              Write down what they asked for
            </h1>
            <p className="mt-3 max-w-2xl text-ink-muted">
              Two things: who called, and what they want. Everything else is there if you have
              it and skippable if you don&rsquo;t.
            </p>
          </div>

          <Link
            href="/requests"
            className="rounded-xl border border-hairline bg-surface-raised px-5 py-3 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted"
          >
            Back to requests
          </Link>
        </div>
      </section>

      <NewRequestForm />
    </div>
  );
}
