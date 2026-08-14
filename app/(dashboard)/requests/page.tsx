import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageCapability } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatAddress } from "@/lib/client-matching";
import { isOpenRequest } from "@/lib/request-status";
import { RequestsBrowser } from "@/components/dashboard/requests-browser";
import { PageHeader } from "@/components/ui/page-header";

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
      <PageHeader
        title="Requests"
        description={
          requests.length > 0
            ? open === 0
              ? "Everyone who asked has an answer."
              : `${open} ${open === 1 ? "person is" : "people are"} waiting on an answer.`
            : undefined
        }
        // The empty state carries its own button; two primaries for one
        // decision is one too many.
        primaryAction={
          requests.length > 0 ? (
            <Link
              href="/requests/new"
              className="rounded-xl bg-ink-primary px-5 py-3 text-sm font-semibold text-ground transition hover:bg-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
            >
              New request
            </Link>
          ) : undefined
        }
      />

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
