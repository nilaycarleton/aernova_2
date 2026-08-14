import { prisma } from "@/lib/prisma";
import { requirePageCapability } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatAddress } from "@/lib/client-matching";
import { jobAddress, jobClient, jobIdentityInclude, personName } from "@/lib/job-identity";
import { PIPELINE_STAGES, stageForJob, stageForRequest, type PipelineStage } from "@/lib/pipeline";
import { PipelineBoard, type PipelineCard } from "@/components/dashboard/pipeline-board";
import { PageHeader } from "@/components/ui/page-header";

/**
 * Every open deal, in one board — item 41. `lib/pipeline.ts` decides which
 * column a request or a job's quote belongs in; this page only fetches and
 * buckets. Read access matches `/quotes` and `/requests` (`viewAllJobs`);
 * dragging a card is gated per-card in `PipelineBoard` on the same
 * capabilities the underlying writes already require (`editJob` for a
 * request, `sendQuote` for a job's quote) — a role that couldn't call the
 * action directly can't call it by dragging either.
 *
 * Salesperson assignment lives here and only here (confirmed with the user
 * rather than guessed) — `assignableUsers` is every member whose role can
 * own a deal (`editJob`), the same set `app/(dashboard)/pipeline/actions.ts`
 * re-checks server-side before writing, so the picker never offers a name
 * the write would then refuse.
 */
export default async function PipelinePage() {
  const { company, role } = await requirePageCapability("viewAllJobs");

  const [openRequests, jobs, memberships] = await Promise.all([
    prisma.request.findMany({
      where: {
        companyId: company.id,
        // CLOSED is fetched too, now that it has a column (Lost) to land on
        // — `stageForRequest` is still what decides whether a status becomes
        // a card at all. CONTACTED (§4/§25 Phase 6) needs the same treatment.
        status: { in: ["NEW", "CONTACTED", "ASSESSING", "CLOSED"] },
        jobId: null,
      },
      include: {
        client: { select: { displayName: true } },
        property: true,
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { requestedAt: "asc" },
    }),
    prisma.job.findMany({
      where: { companyId: company.id, status: { not: "ARCHIVED" } },
      include: {
        ...jobIdentityInclude,
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        quotes: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, quoteNumber: true, totalAmountCents: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.companyMembership.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    }),
  ]);

  const assignableUsers = memberships
    .filter((membership) => can(membership.role, "editJob"))
    .map((membership) => ({ id: membership.userId, name: personName(membership.user) }));

  const columns = new Map<PipelineStage, PipelineCard[]>(PIPELINE_STAGES.map((s) => [s, []]));

  for (const request of openRequests) {
    const stage = stageForRequest(request.status);
    if (!stage) continue;
    columns.get(stage)!.push({
      kind: "request",
      id: request.id,
      stage,
      title: request.title,
      clientName: request.client.displayName,
      address: request.property ? formatAddress(request.property) : null,
      amountCents: null,
      href: null,
      assignedTo: request.assignedTo
        ? { id: request.assignedTo.id, name: personName(request.assignedTo) }
        : null,
    });
  }

  for (const job of jobs) {
    const quote = job.quotes[0] ?? null;
    const stage = stageForJob(job.status, quote?.status ?? null);
    if (!stage) continue;
    columns.get(stage)!.push({
      kind: "job",
      id: job.id,
      quoteId: quote?.id ?? null,
      stage,
      title: job.name,
      clientName: jobClient(job).name,
      address: formatAddress(jobAddress(job)),
      amountCents: quote?.totalAmountCents ?? null,
      href: quote ? `/jobs/${job.id}/quotes/${quote.id}` : `/jobs/${job.id}`,
      assignedTo: job.assignedTo ? { id: job.assignedTo.id, name: personName(job.assignedTo) } : null,
    });
  }

  const total = openRequests.length + jobs.filter((j) => stageForJob(j.status, j.quotes[0]?.status ?? null)).length;

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Pipeline"
        description={total > 0 ? "Every deal in motion, from the first ask to the yes." : undefined}
      />

      <PipelineBoard
        columns={columns}
        canMoveRequests={can(role, "editJob")}
        canMoveQuotes={can(role, "sendQuote")}
        canAssign={can(role, "editJob")}
        assignableUsers={assignableUsers}
      />
    </div>
  );
}
