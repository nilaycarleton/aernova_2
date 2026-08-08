import Link from "next/link";
import { RequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** "arrived today", "been waiting 2 days" — coarse on purpose; the point is whether it's still fresh. Always pairs with "It's"/"The oldest one's" ahead of it. */
function ageLabel(requestedAt: Date, now: Date): string {
  const days = Math.floor((now.getTime() - requestedAt.getTime()) / 86_400_000);
  if (days <= 0) return "arrived today";
  if (days === 1) return "been waiting since yesterday";
  if (days < 7) return `been waiting ${days} days`;
  const weeks = Math.floor(days / 7);
  return `been waiting ${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}

/**
 * New leads, unattended. Response time on a fresh request is time-sensitive
 * in a way nothing else on the dashboard signals — a quote can sit quoted for
 * weeks without costing anything; a request that sits unanswered is a job
 * going to whoever calls the homeowner back first.
 */
export async function NewRequestsSummary({ companyId }: { companyId: string }) {
  const requests = await prisma.request.findMany({
    where: { companyId, status: RequestStatus.NEW },
    select: { requestedAt: true },
    orderBy: { requestedAt: "asc" },
  });

  const oldest = requests[0];

  return (
    <section className="min-w-0 rounded-2xl border border-hairline bg-surface-raised p-6">
      <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">New requests</p>

      {requests.length === 0 ? (
        <p className="mt-2 text-2xl font-semibold text-ink-muted">All caught up</p>
      ) : (
        <>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-ink-primary">
            {requests.length}
          </p>
          <p className="mt-2 text-sm text-ink-secondary">
            {requests.length === 1 ? "It's" : "Oldest one's"} {ageLabel(oldest.requestedAt, new Date())}
          </p>
        </>
      )}

      <Link
        href="/requests"
        className="mt-4 inline-block text-sm font-medium text-ink-primary underline underline-offset-4 transition hover:text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
      >
        {requests.length === 0 ? "Go to requests" : "Review requests"}
      </Link>
    </section>
  );
}
