import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageCapability } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatAddress } from "@/lib/client-matching";
import { isOpenRequest } from "@/lib/request-status";
import { RequestsBrowser } from "@/components/dashboard/requests-browser";

/**
 * The inbox before the job list.
 *
 * A roofer's phone rings more often than their calendar fills, and putting
 * every one of those calls in the job list turns the job list into a pile of
 * maybes. This page holds the maybes. What makes it worth keeping rather than
 * a notepad is one button: turning an ask into a job carries the client, the
 * address and their own words across without retyping any of it.
 */
export default async function RequestsPage() {
  const { company, role } = await requirePageCapability("viewAllJobs");

  const requests = await prisma.request.findMany({
    where: { companyId: company.id },
    include: {
      client: { select: { displayName: true } },
      property: true,
    },
    orderBy: { requestedAt: "asc" },
  });

  const open = requests.filter((r) => isOpenRequest(r.status)).length;

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-ink-primary">Requests</h2>
          {requests.length > 0 ? (
            <p className="mt-1 text-sm text-ink-muted">
              {open === 0
                ? "Everyone who asked has an answer."
                : `${open} ${open === 1 ? "person is" : "people are"} waiting on an answer.`}
            </p>
          ) : null}
        </div>

        {/* The empty state carries its own button; two primaries for one
            decision is one too many. */}
        {requests.length > 0 ? (
          <Link
            href="/requests/new"
            className="shrink-0 rounded-xl bg-ink-primary px-5 py-3 text-sm font-semibold text-ground transition hover:bg-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
          >
            New request
          </Link>
        ) : null}
      </div>

      <RequestsBrowser
        canDelete={can(role, "deleteRequest")}
        requests={requests.map((request) => ({
          id: request.id,
          title: request.title,
          description: request.description,
          clientName: request.client.displayName,
          address: request.property ? formatAddress(request.property) : null,
          status: request.status,
          source: request.source,
          requestedAt: request.requestedAt,
          jobId: request.jobId,
        }))}
      />
    </div>
  );
}
