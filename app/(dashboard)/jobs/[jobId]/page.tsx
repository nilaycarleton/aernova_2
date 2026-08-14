import { notFound } from "next/navigation";
import { headers } from "next/headers";
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
import { formatDayLong, instantToDay, toDayInput, todayIn } from "@/lib/schedule/day";
import { formatTimeOfDay, utcToZoned, visitCalendarDay } from "@/lib/schedule/timezone";
import { jobGaps } from "@/lib/job-validation";
import { INVOICE_STATUS_META } from "@/lib/invoice/status";
import { DisclosurePanel } from "@/components/dashboard/disclosure-panel";
import { getNodeOdmWorkerHealth } from "@/lib/nodeodm-client";
import { getModelTaskUuid } from "@/lib/roof-extraction-service";
import { applyTemplateLines, type CatalogPrice } from "@/lib/quote/templates";
import { computeTotals } from "@/lib/quote/totals";
import type { StartTemplate } from "@/components/dashboard/quote-start-dialog";
import { JobExpensesPanel, type JobExpenseRow } from "@/components/dashboard/job-expenses-panel";
import { ReviewRequestPanel } from "@/components/dashboard/review-request-panel";
import { ChangeOrdersPanel } from "@/components/dashboard/change-orders-panel";
import { AdditionalWorkPanel } from "@/components/dashboard/additional-work-panel";
import { QualityCheckPanel } from "@/components/dashboard/quality-check-panel";
import { JobProgressPanel } from "@/components/dashboard/job-progress-panel";
import { jobProgressDisplay } from "@/lib/job-progress";
import { PreConstructionChecklistPanel } from "@/components/dashboard/pre-construction-checklist-panel";
import { preConstructionGaps } from "@/lib/pre-construction";
import { StatusMiniCard } from "@/components/dashboard/status-mini-card";
import { financialMiniCardState, salesMiniCardState } from "@/lib/job-mini-cards";
import { FinancialCompletionPanel } from "@/components/dashboard/financial-completion-panel";
import { jobFinancialSummary } from "@/lib/job-financial-summary";
import { WarrantyPanel, type WarrantyRow, type WarrantyTemplateRow } from "@/components/dashboard/warranty-panel";
import { longDate } from "@/lib/long-date";
import { shareUrl as buildShareUrl } from "@/lib/share-token";
import { isEmailConfigured } from "@/lib/email";
import { statusLabel, statusTone } from "@/lib/job-status";
import { PageHeader } from "@/components/ui/page-header";
import { Status } from "@/components/ui/status";
import { JobWorkspaceShell } from "@/components/dashboard/job-workspace-shell";

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
  const initialTab: "inspect" | "scan" | "quote" | "costs" =
    tabParam === "inspect" || tabParam === "scan" || tabParam === "quote" || tabParam === "costs"
      ? tabParam
      : quoteParam
        ? "quote"
        : "scan";
  const { company, user, role } = await requireCompanyContext();
  const showsMoney = can(role, "viewMoney");

  // §14.6/§15/§25 Phase 11 — one small, company-scoped query, independent
  // of the job query below, so a company with no customization pays for an
  // empty array rather than an extra join on every job page load.
  const workflowOverrides = await prisma.companyWorkflowStage.findMany({
    where: { companyId: company.id },
    select: { jobStatus: true, label: true, isEnabled: true },
  });

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
        include: { lineItems: { orderBy: { sortOrder: "asc" } } },
      },
      expenses: {
        orderBy: { incurredAt: "desc" },
        include: { createdBy: true },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          title: true,
          status: true,
          quoteId: true,
          totalAmountCents: true,
          amountPaidCents: true,
          requiresHomeownerReview: true,
          homeownerReviewConfirmedAt: true,
          sentAt: true,
        },
      },
      changeOrders: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, status: true, amountCents: true, quoteId: true },
      },
      qualityCheck: true,
      preConstructionChecklist: true,
      warranty: true,
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
  // What the job was quoted to cost. `computeTotals` already knows to skip a
  // declined optional line and include an accepted one — this file never
  // re-derives that, only reads `.costCents` back off it. Zero with no quote
  // yet, which reads honestly: a job with nothing priced has nothing to
  // compare an actual cost against.
  const quotedCostCents = latestQuote ? computeTotals(latestQuote.lineItems).costCents : 0;
  const canManageJobCosts = can(role, "manageJobCosts");
  const expenseRows: JobExpenseRow[] = job.expenses.map((expense) => ({
    id: expense.id,
    category: expense.category,
    description: expense.description,
    amountCents: expense.amountCents,
    hours: expense.hours,
    hourlyRateCents: expense.hourlyRateCents,
    incurredAt: expense.incurredAt.toISOString(),
    loggedBy: personName(expense.createdBy),
  }));
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

  // §19.1 — a change order only ever amends an *approved* quote. Most jobs
  // carry at most one, so the first one found is the one change orders
  // attach to; a job with more than one approved quote is an edge case this
  // phase doesn't build a picker for.
  const approvedQuote = job.quotes.find((q) => q.status === "APPROVED");
  // §19.2 — read once for display; the real, authoritative read happens
  // server-side at the moment a direct invoice is actually created.
  const billableAddOnThresholdCents = company.billableAddOnThresholdCents ?? 50000;

  // A model is extractable once it has a linked NodeODM task (the mesh assets
  // are resolved on demand from the worker / local cache).
  const extractableModel = job.imagery.find(
    (item) => item.type === "MODEL" && getModelTaskUuid(item.metadataJson) !== null
  );

  // §14.3/§20 — office-only write path; crew can see this panel (it's their
  // own submitted evidence) but never edit the office half. No relation on
  // QualityCheck for the submitter ids (same plain-string-id shape
  // Quote.approvedByUserId already uses), so names resolve through `team`,
  // already loaded for the visit assignment picker above.
  const canCompleteQualityCheck = can(role, "completeQualityCheck");
  const dateLabel = (value: Date | null | undefined) =>
    value ? value.toLocaleDateString("en-CA", { dateStyle: "medium" }) : null;
  const nameFor = (userId: string | null | undefined) =>
    userId ? (team.find((member) => member.userId === userId)?.name ?? null) : null;
  const qualityCheckData = job.qualityCheck
    ? {
        siteCleaned: job.qualityCheck.siteCleaned,
        photosUploaded: job.qualityCheck.photosUploaded,
        fieldEvidenceNotes: job.qualityCheck.fieldEvidenceNotes,
        fieldEvidenceSubmittedAt: dateLabel(job.qualityCheck.fieldEvidenceSubmittedAt),
        fieldEvidenceSubmittedByName: nameFor(job.qualityCheck.fieldEvidenceSubmittedByUserId),
        scopeCompleted: job.qualityCheck.scopeCompleted,
        deficienciesResolved: job.qualityCheck.deficienciesResolved,
        walkthroughCompleted: job.qualityCheck.walkthroughCompleted,
        walkthroughNotes: job.qualityCheck.walkthroughNotes,
        completedAt: dateLabel(job.qualityCheck.completedAt),
      }
    : null;

  // §14.4/§20/§25 Phase 10 — office-only, same tier as the Pre-Construction
  // Checklist (`editJob`). Templates are read once here rather than inside
  // the panel component, matching every other job-page panel's own
  // "server loads, client renders" split.
  const [builtInWarrantyTemplates, companyWarrantyTemplates] = await Promise.all([
    prisma.warrantyTemplate.findMany({
      where: { companyId: null, trade: company.trade },
      orderBy: { variant: "asc" },
    }),
    prisma.warrantyTemplate.findMany({
      where: { companyId: company.id },
      orderBy: { name: "asc" },
    }),
  ]);
  const warrantyTemplateRows = (rows: typeof builtInWarrantyTemplates, isCompanyOwned: boolean): WarrantyTemplateRow[] =>
    rows.map((t) => ({
      id: t.id,
      name: t.name,
      variant: t.variant,
      termMonths: t.termMonths,
      coverageNotes: t.coverageNotes,
      exclusions: t.exclusions,
      isCompanyOwned,
    }));

  const host = (await headers()).get("host") ?? "localhost:3000";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  const warrantyRow: WarrantyRow | null = job.warranty
    ? {
        id: job.warranty.id,
        status: job.warranty.status,
        termMonths: job.warranty.termMonths,
        startsAt: toDayInput(instantToDay(job.warranty.startsAt)),
        coverageNotes: job.warranty.coverageNotes,
        exclusions: job.warranty.exclusions,
        companyInfoSnapshot: job.warranty.companyInfoSnapshot,
        customerInfoSnapshot: job.warranty.customerInfoSnapshot,
        propertyAddressSnapshot: job.warranty.propertyAddressSnapshot,
        version: job.warranty.version,
        shareUrl: job.warranty.shareToken
          ? buildShareUrl("warranty", job.warranty.shareToken, origin)
          : null,
        sentAtLabel: longDate(job.warranty.sentAt),
        reviewedAtLabel: longDate(job.warranty.reviewedAt),
        reviewedByName: nameFor(job.warranty.reviewedByUserId),
        confirmedAtLabel: longDate(job.warranty.confirmedAt),
        signerName: job.warranty.signerName,
      }
    : null;

  // §7.6/§25 Phase 4 — a checklist/gap layer, not a new JobStatus. Shown once
  // there's an approved quote to build it against (same `approvedQuote`
  // signal `ChangeOrdersPanel` already gates on), office-only like the rest
  // of the quote-tab money surface. `hasScope` reuses the quote's own line
  // items/scopeOfWork rather than asking the office to re-confirm something
  // the quote already states.
  const canEditJob = can(role, "editJob");
  const preConstructionGapList = approvedQuote
    ? preConstructionGaps({
        hasApprovedQuote: true,
        hasScope: approvedQuote.lineItems.length > 0 || Boolean(approvedQuote.scopeOfWork),
        materialsConfirmed: job.preConstructionChecklist?.materialsConfirmed ?? false,
        permitsChecked: job.preConstructionChecklist?.permitsChecked ?? false,
        crewReady: job.preConstructionChecklist?.crewReady ?? false,
        startDateConfirmed: job.preConstructionChecklist?.startDateConfirmed ?? false,
      })
    : [];
  const preConstructionData = job.preConstructionChecklist
    ? {
        materialsConfirmed: job.preConstructionChecklist.materialsConfirmed,
        materialsNotes: job.preConstructionChecklist.materialsNotes,
        permitsChecked: job.preConstructionChecklist.permitsChecked,
        permitRequired: job.preConstructionChecklist.permitRequired,
        permitNotes: job.preConstructionChecklist.permitNotes,
        crewReady: job.preConstructionChecklist.crewReady,
        startDateConfirmed: job.preConstructionChecklist.startDateConfirmed,
        readinessNotes: job.preConstructionChecklist.readinessNotes,
        confirmedAt: dateLabel(job.preConstructionChecklist.confirmedAt),
      }
    : null;

  // §16/§17/§25 Phase 7 — read-only, next to the status stepper: what's
  // already loaded above (`latestQuote`, `liveInvoice`, `approvedQuote`)
  // is all either card needs, so this adds no query of its own.
  const salesCard = salesMiniCardState(
    job.id,
    latestQuote
      ? { id: latestQuote.id, status: latestQuote.status, totalAmountCents: latestQuote.totalAmountCents }
      : null
  );
  const financialCard = financialMiniCardState(job.id, liveInvoice ?? null, Boolean(approvedQuote));

  // §6/§21/§25 Phase 8 — the composed closeout view, deeper on the page
  // near the quote/change-order/Additional Work panels rather than beside
  // the status stepper (that's the Phase 7 mini-card's job). Reuses the
  // same `job.changeOrders`/`job.invoices` arrays already loaded above —
  // no new query.
  // §7.8/§14.5/§25 Phase 9 — read-only, optional, never a gate. Reuses the
  // same `job.visits` array VisitPanel already renders — no new query.
  const progressDisplay = jobProgressDisplay(
    job.progressPercent,
    job.progressState,
    job.visits.map((visit) => ({ kind: visit.kind, status: visit.status }))
  );

  const financialSummary = jobFinancialSummary(
    approvedQuote ? { totalAmountCents: approvedQuote.totalAmountCents } : null,
    job.changeOrders,
    job.invoices
  );

  // §22/§23 Workbench split — the rail's former content (quote/invoice
  // figures, gaps, sales/financial standing) is exactly the subset of this
  // page already gated on `showsMoney`: "context useful across every tab,
  // not the primary task." A role without `showsMoney` gets no inspector at
  // all rather than an empty one — there is nothing left to put in it once
  // the money content is removed, and an empty inspector trigger would be a
  // control that does nothing (Step 98).
  const inspectorContent = showsMoney ? (
    <div className="min-w-0 space-y-6">
      {/* The quote figure leads the rail — it is the number a contractor
          stakes a bid on, so it is legible rather than a caption. */}
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

      {/* Only once there is one. An "Invoiced: none yet" tile on every job
          in the company would put a permanent reminder of unfinished
          paperwork on jobs that were quoted this morning — and the figure
          a contractor wants on a job that hasn't been billed is the quote,
          which is already above it. */}
      {liveInvoice ? (
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

      <JobGapsPanel gaps={gaps} />

      {/* §16/§17/§25 Phase 7 — sales and financial standing, beside the
          money the rail already shows. Same gate as everything else here. */}
      <div className="space-y-4">
        <StatusMiniCard
          eyebrow="Sales"
          label={salesCard.label}
          description={salesCard.description}
          badge={salesCard.badge}
          secondaryDetail={salesCard.secondaryDetail}
          action={salesCard.action}
        />
        <StatusMiniCard
          eyebrow="Financial"
          label={financialCard.label}
          description={financialCard.description}
          badge={financialCard.badge}
          secondaryDetail={financialCard.secondaryDetail}
          action={financialCard.action}
        />
      </div>
    </div>
  ) : null;

  const mainContent = (
    <div className="min-w-0 space-y-8">
      <JobStatusStepper jobId={job.id} status={job.status} workflowOverrides={workflowOverrides} />

      {job.status === "COMPLETED" && company.reviewUrl && can(role, "editJob") ? (
        <ReviewRequestPanel
          jobId={job.id}
          reviewUrl={company.reviewUrl}
          // A real instant, not a date-only value like incurredAt — this reads
          // in whichever timezone the server happens to run in. Good enough
          // for "we already asked," and unlike the Costs tab's date-only bug,
          // there's no calendar-day value being typed here to preserve.
          reviewRequestedAt={
            job.reviewRequestedAt
              ? job.reviewRequestedAt.toLocaleDateString("en-CA", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : null
          }
          clientEmail={client.email}
          emailConfigured={isEmailConfigured()}
        />
      ) : null}

      {/* §7.6/§25 Phase 4 — sits ahead of the scheduling panel below on
          purpose: the office reads it right before booking the work visit
          that moves this job to SCHEDULED. Warning-only, not a hard gate —
          see lib/pre-construction.ts and WORKFLOW_PHASE_4_IMPLEMENTATION.md. */}
      {approvedQuote && showsMoney ? (
        <PreConstructionChecklistPanel
          jobId={job.id}
          data={preConstructionData}
          gaps={preConstructionGapList}
          editable={canEditJob}
        />
      ) : null}

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

      {/* §7.8/§14.5/§25 Phase 9 — a read/review signal, not a gate; its own
          calm empty state handles a job with nothing to report yet, so
          this renders on every job status rather than only IN_PROGRESS. */}
      <JobProgressPanel
        jobId={job.id}
        display={progressDisplay}
        officePercent={job.progressPercent}
        editable={canEditJob}
      />

      {/* §14.3/§20 — relevant once crew is actually on site working toward
          completion, and kept visible after, as the record of it. */}
      {job.status === "IN_PROGRESS" || job.status === "COMPLETED" ? (
        <QualityCheckPanel
          jobId={job.id}
          data={qualityCheckData}
          editable={canCompleteQualityCheck}
        />
      ) : null}

      {/* §14.4/§20/§25 Phase 10 — a closeout document, alongside the
          Financial Completion Panel's own closeout framing but never
          money-gated: a warranty carries no cost/margin data at all. */}
      <WarrantyPanel
        jobId={job.id}
        warranty={warrantyRow}
        builtInTemplates={warrantyTemplateRows(builtInWarrantyTemplates, false)}
        companyTemplates={warrantyTemplateRows(companyWarrantyTemplates, true)}
        editable={canEditJob}
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

            {approvedQuote ? (
              <ChangeOrdersPanel
                jobId={job.id}
                quoteId={approvedQuote.id}
                changeOrders={job.changeOrders.filter((co) => co.quoteId === approvedQuote.id)}
              />
            ) : null}

            <AdditionalWorkPanel
              jobId={job.id}
              thresholdCents={billableAddOnThresholdCents}
              existingInvoices={job.invoices
                .filter((invoice) => invoice.quoteId === null)
                .map((invoice) => ({
                  id: invoice.id,
                  invoiceNumber: invoice.invoiceNumber,
                  title: invoice.title,
                  status: invoice.status,
                  totalAmountCents: invoice.totalAmountCents,
                  requiresHomeownerReview: invoice.requiresHomeownerReview,
                  homeownerReviewConfirmedAt: invoice.homeownerReviewConfirmedAt
                    ? invoice.homeownerReviewConfirmedAt.toISOString()
                    : null,
                }))}
            />

            <FinancialCompletionPanel
              jobId={job.id}
              summary={financialSummary}
              approvedQuoteId={approvedQuote?.id ?? null}
              latestInvoiceId={liveInvoice?.id ?? null}
            />
          </>
          )
        }
        costs={
          !showsMoney ? null : (
            <JobExpensesPanel
              jobId={job.id}
              canManage={canManageJobCosts}
              expenses={expenseRows}
              quotedCostCents={quotedCostCents}
              defaultLabourRateCents={company.defaultLabourRateCents}
            />
          )
        }
      />
    </div>
  );

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        eyebrow={job.jobNumber ? `JOB-${job.jobNumber}` : undefined}
        title={job.name}
        description={[client.name, formatAddress(address) ?? "No address yet"]
          .filter(Boolean)
          .join(" • ")}
        status={<Status tone={statusTone(job.status)} label={statusLabel(job.status)} />}
        // The report is pricing/margin end to end, same reason the rail's
        // quote figure is money-gated: not rendered for crew, since the page
        // it links to is gated on viewMoney too.
        primaryAction={
          showsMoney ? (
            <Link
              href={`/jobs/${job.id}/report`}
              className="inline-flex rounded-xl border border-hairline bg-surface-raised px-4 py-2 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
            >
              Open printable report
            </Link>
          ) : undefined
        }
      />

      {inspectorContent ? (
        <JobWorkspaceShell main={mainContent} inspector={inspectorContent} inspectorTitle="Job details" />
      ) : (
        mainContent
      )}

      <AssistantDrawer jobId={job.id} />
    </div>
  );
}
