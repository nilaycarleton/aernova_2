import { notFound } from "next/navigation";
import { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCompanyContext } from "@/lib/auth";
import { can, jobScopeForRole } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";
import { formatAddress } from "@/lib/client-matching";
import { jobAddress, jobClient, jobIdentityInclude, personName } from "@/lib/job-identity";
import Link from "next/link";
import { MeasurementManager } from "@/components/dashboard/measurement-manager";
import { QuoteGeneratorCard } from "@/components/dashboard/quote-generator-card";
import { AssistantDrawer } from "@/components/dashboard/assistant-drawer";
import { JobIntelligence } from "@/components/dashboard/job-intelligence";
import { RoofSectionManager } from "@/components/dashboard/roof-section-manager";
import { InspectionWorkflow } from "@/components/dashboard/inspection-workflow";
import { PricingTemplatePanel } from "@/components/dashboard/pricing-template-panel";
import { PhaseSixWorkflow } from "@/components/dashboard/phase-six-workflow";
import { RoofExtractionPanel } from "@/components/dashboard/roof-extraction-panel";
import { JobStatusStepper } from "@/components/dashboard/job-status-stepper";
import { QuotePreview } from "@/components/dashboard/quote-preview";
import { JobWorkspace } from "@/components/dashboard/job-workspace";
import { JobGapsPanel } from "@/components/dashboard/job-gaps-panel";
import { VisitPanel } from "@/components/dashboard/visit-panel";
import { formatDayLong, toDayInput, todayIn } from "@/lib/schedule/day";
import { formatTimeOfDay, utcToZoned, visitCalendarDay } from "@/lib/schedule/timezone";
import { jobGaps } from "@/lib/job-validation";
import { INVOICE_STATUS_META } from "@/lib/invoice/status";
import { DisclosurePanel } from "@/components/dashboard/disclosure-panel";
import { getNodeOdmWorkerHealth } from "@/lib/nodeodm-client";
import { getModelTaskUuid } from "@/lib/roof-extraction-service";
import { applyTemplateLines, type CatalogPrice } from "@/lib/quote/templates";
import { computeTotals } from "@/lib/quote/totals";
import type { StartTemplate } from "@/components/dashboard/quote-start-dialog";

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ quote?: string; tab?: string }>;
}) {
  const { jobId } = await params;
  const { quote: quoteParam, tab: tabParam } = await searchParams;
  // Landing with a freshly generated quote (or ?tab=quote) opens the Quote tab.
  const initialTab: "inspect" | "scan" | "quote" =
    tabParam === "inspect" || tabParam === "scan" || tabParam === "quote"
      ? tabParam
      : quoteParam
        ? "quote"
        : "scan";
  const { company, user, role } = await requireCompanyContext();
  const showsMoney = can(role, "viewMoney");

  const job = await prisma.job.findFirst({
    // Scoped, not filtered afterwards: a job a crew member may not see must
    // never be loaded, let alone rendered with its quote attached.
    where: { id: jobId, companyId: company.id, ...jobScopeForRole(role, user.id) },
    include: {
      sections: true,
      measurements: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      issues: true,
      quotes: {
        orderBy: { createdAt: "desc" },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmountCents: true,
          amountPaidCents: true,
        },
      },
      visits: {
        orderBy: { startAt: "asc" },
        include: { assignments: { include: { user: true } } },
      },
      photos: true,
      imagery: {
        orderBy: { createdAt: "desc" },
      },
      processingJobs: {
        orderBy: { createdAt: "desc" },
      },
      comparisons: {
        orderBy: { createdAt: "desc" },
      },
      modelMeasurements: {
        orderBy: { createdAt: "asc" },
      },
      ...jobIdentityInclude,
    },
  });

  // Scope to the caller's company so jobs can't be opened cross-tenant.
  if (!job) notFound();

  const latestQuote = job.quotes[0];
  // A cancelled invoice is on the record but is not what this job is owed —
  // the rail should read what somebody still has to collect.
  const liveInvoice = job.invoices.find((invoice) => invoice.status !== InvoiceStatus.VOID);
  const invoiceOwedCents = liveInvoice
    ? liveInvoice.totalAmountCents - liveInvoice.amountPaidCents
    : 0;
  const workerHealth = await getNodeOdmWorkerHealth();

  // Templates, costed at today's prices rather than at the price they were
  // saved at — the figure beside the name is only useful if it is the figure
  // this quote would actually start from.
  const templateRows = await prisma.quoteTemplate.findMany({
    where: { companyId: company.id },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  const catalog = new Map<string, CatalogPrice>(
    (
      await prisma.service.findMany({
        where: { companyId: company.id, isActive: true },
        select: { id: true, unit: true, unitPriceCents: true, unitCostCents: true },
      })
    ).map((service) => [service.id, service])
  );
  const templates: StartTemplate[] = templateRows.map((template) => {
    const lines = applyTemplateLines(template.lineItems, catalog);
    return {
      id: template.id,
      name: template.name,
      lineCount: lines.filter((line) => line.kind === "ITEM").length,
      // The subtotal, not the total: tax depends on where the property is, and
      // this number is being read next to a template name, not on a document.
      totalCents: computeTotals(lines).subtotalCents,
    };
  });

  // What the front door stopped asking for. Read through `jobClient` /
  // `jobAddress` rather than off the columns directly, so a job that predates
  // the Phase 1 split reports the same gaps as one created today.
  // Who could be put on a visit. Read once for the page rather than per visit.
  const team = (
    await prisma.companyMembership.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "asc" },
      include: { user: true },
    })
  ).map((member) => ({ userId: member.userId, name: personName(member.user) }));

  const client = jobClient(job);
  const address = jobAddress(job);
  const gaps = jobGaps({
    hasAddress: Boolean(formatAddress(address)),
    hasContact: Boolean(client.email || client.phone),
    hasQuote: job.quotes.length > 0,
  });

  // A model is extractable once it has a linked NodeODM task (the mesh assets
  // are resolved on demand from the worker / local cache).
  const extractableModel = job.imagery.find(
    (item) => item.type === "MODEL" && getModelTaskUuid(item.metadataJson) !== null
  );

  return (
    <div className="min-w-0 space-y-8">
      {/* Identity on the left, the job's standing on the right.
          The rail stops here rather than running the page's full height as
          Jobber's does: below this sits the 3D viewer, which needs every pixel
          of width it can get, and a rail that squeezes it would trade the thing
          a roofer came for against a panel they read once. */}
      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 rounded-3xl border border-hairline bg-surface-raised p-6">
          <p className="text-sm uppercase tracking-[0.18em] text-ink-muted">Job</p>
          <h2 className="mt-2 break-words text-3xl font-semibold text-ink-primary">{job.name}</h2>
          <p className="mt-2 break-words text-ink-muted">
            {[client.name, formatAddress(address) ?? "No address yet"].filter(Boolean).join(" • ")}
          </p>

          <Link
            href={`/jobs/${job.id}/report`}
            className="mt-5 inline-flex rounded-xl border border-hairline bg-surface-raised px-4 py-2 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
          >
            Open printable report
          </Link>
        </div>

        <div className="min-w-0 space-y-6">
          {/* The quote figure leads the rail — it is the number a contractor
              stakes a bid on, so it is legible rather than a caption. Jobber
              puts money at the top of its rail for the same reason. */}
          {/* Not rendered at all for crew, rather than hidden with CSS. What
              a job is worth is not a fact somebody needs to do the work, and a
              value that reaches the browser has already left the building. */}
          {showsMoney ? (
            <div className="rounded-2xl border border-hairline bg-ground/50 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Quote</p>
              {latestQuote ? (
                <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-primary">
                  {formatMoney(latestQuote.totalAmountCents)}
                </p>
              ) : (
                <p className="mt-1 text-sm text-ink-muted">None yet</p>
              )}
            </div>
          ) : null}

          {/* Only once there is one. An "Invoiced: none yet" tile on every job
              in the company would put a permanent reminder of unfinished
              paperwork on jobs that were quoted this morning — and the figure
              a contractor wants on a job that hasn't been billed is the quote,
              which is already above it. */}
          {showsMoney && liveInvoice ? (
            <Link
              href={`/jobs/${job.id}/invoices/${liveInvoice.id}`}
              className="block rounded-2xl border border-hairline bg-ground/50 px-5 py-4 transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
                {invoiceOwedCents > 0 ? "Still owed" : "Invoiced"}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-primary">
                {formatMoney(invoiceOwedCents > 0 ? invoiceOwedCents : liveInvoice.totalAmountCents)}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {INVOICE_STATUS_META[liveInvoice.status].label}
                {liveInvoice.invoiceNumber ? ` · #${liveInvoice.invoiceNumber}` : ""}
              </p>
            </Link>
          ) : null}

          {showsMoney ? <JobGapsPanel gaps={gaps} /> : null}
        </div>
      </section>

      <JobStatusStepper jobId={job.id} status={job.status} />

      <VisitPanel
        jobId={job.id}
        jobStatus={job.status}
        today={toDayInput(todayIn())}
        timeZone={company.timeZone}
        visits={job.visits.map((visit) => {
          // The company's zone, not the visit's UTC parts — a late timed
          // visit can already be tomorrow in UTC without being tomorrow
          // where the company actually is. See `visitCalendarDay`.
          const day = visitCalendarDay(visit, company.timeZone);
          return {
            id: visit.id,
            label: formatDayLong(day),
            timeLabel: visit.allDay
              ? null
              : formatTimeOfDay(utcToZoned(visit.startAt, company.timeZone!).minutes),
            dayInput: toDayInput(day),
            status: visit.status,
            kind: visit.kind,
            isRepeat: visit.generatedFromRuleId !== null,
            assigned: visit.assignments.map((assignment) => ({
              userId: assignment.userId,
              name: personName(assignment.user),
            })),
          };
        })}
        team={team}
      />

      <JobWorkspace
        initialTab={initialTab}
        inspect={
          <InspectionWorkflow
            jobId={job.id}
            issues={job.issues}
            photos={job.photos}
          />
        }
        scan={
          <>
            <PhaseSixWorkflow
              jobId={job.id}
              imagery={job.imagery}
              processingJobs={job.processingJobs}
              workerHealth={workerHealth}
              comparisons={job.comparisons}
              modelMeasurements={job.modelMeasurements}
            />

            <JobIntelligence measurements={job.measurements} sections={job.sections} />

            {/* The hands-on tools wait behind disclosure so the workflow and the
                numbers lead. Each opens itself once it has work in it. */}
            <DisclosurePanel
              title="Roof faces & structures"
              hint="Adjust roof faces or add a detached structure (garage, shed) by hand"
              count={job.sections.length}
              defaultOpen={job.sections.length > 0}
            >
              <RoofSectionManager jobId={job.id} sections={job.sections} />
            </DisclosurePanel>

            <DisclosurePanel
              title="Measurements by hand"
              hint="Type or fix a roof measurement yourself — area, ridge, pitch, and more"
              count={job.measurements.length}
              defaultOpen={job.measurements.length > 0}
            >
              <MeasurementManager jobId={job.id} measurements={job.measurements} />
            </DisclosurePanel>

            {extractableModel && (
              <DisclosurePanel
                title="Trace the roof outline"
                hint="Advanced — draw the roof outline on the 3D model to pull measurements"
              >
                <RoofExtractionPanel
                  jobId={job.id}
                  imageryId={extractableModel.id}
                  modelLabel={extractableModel.fileName ?? "Roof 3D model"}
                />
              </DisclosurePanel>
            )}
          </>
        }
        quote={
          !showsMoney ? null : (
          <>
            <QuoteGeneratorCard
              jobId={job.id}
              quotes={job.quotes}
              templates={templates}
              hasMeasurements={job.measurements.length > 0 || job.modelMeasurements.length > 0}
            />
            <QuotePreview companyName={company.name} quote={latestQuote ?? null} />
            <PricingTemplatePanel />
          </>
          )
        }
      />

      <AssistantDrawer jobId={job.id} />
    </div>
  );
}
