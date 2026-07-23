import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompanyContext } from "@/lib/auth";
import Link from "next/link";
import { MeasurementManager } from "@/components/dashboard/measurement-manager";
import { ProposalGeneratorCard } from "@/components/dashboard/proposal-generator-card";
import { AssistantDrawer } from "@/components/dashboard/assistant-drawer";
import { ProjectIntelligence } from "@/components/dashboard/project-intelligence";
import { RoofSectionManager } from "@/components/dashboard/roof-section-manager";
import { InspectionWorkflow } from "@/components/dashboard/inspection-workflow";
import { ProposalEditor } from "@/components/dashboard/proposal-editor";
import { PricingTemplatePanel } from "@/components/dashboard/pricing-template-panel";
import { PhaseSixWorkflow } from "@/components/dashboard/phase-six-workflow";
import { RoofExtractionPanel } from "@/components/dashboard/roof-extraction-panel";
import { ProjectStatusStepper } from "@/components/dashboard/project-status-stepper";
import { ProposalPreview } from "@/components/dashboard/proposal-preview";
import { ProjectWorkspace } from "@/components/dashboard/project-workspace";
import { DisclosurePanel } from "@/components/dashboard/disclosure-panel";
import { getNodeOdmWorkerHealth } from "@/lib/nodeodm-client";
import { getModelTaskUuid } from "@/lib/roof-extraction-service";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ proposal?: string; tab?: string }>;
}) {
  const { projectId } = await params;
  const { proposal: proposalParam, tab: tabParam } = await searchParams;
  // Landing with a freshly generated proposal (or ?tab=quote) opens the Quote tab.
  const initialTab: "inspect" | "scan" | "quote" =
    tabParam === "inspect" || tabParam === "scan" || tabParam === "quote"
      ? tabParam
      : proposalParam
        ? "quote"
        : "scan";
  const { company } = await requireCompanyContext();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      sections: true,
      measurements: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      issues: true,
      proposals: {
        orderBy: { createdAt: "desc" },
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
    },
  });

  // Scope to the caller's company so projects can't be opened cross-tenant.
  if (!project || project.companyId !== company.id) {
    notFound();
  }

  const latestProposal = project.proposals[0];
  const workerHealth = await getNodeOdmWorkerHealth();

  // A model is extractable once it has a linked NodeODM task (the mesh assets
  // are resolved on demand from the worker / local cache).
  const extractableModel = project.imagery.find(
    (item) => item.type === "MODEL" && getModelTaskUuid(item.metadataJson) !== null
  );

  return (
    <div className="min-w-0 space-y-8">
      <section className="min-w-0 rounded-3xl border border-hairline bg-surface-raised p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.18em] text-ink-muted">
              Project
            </p>
            <h2 className="mt-2 break-words text-3xl font-semibold text-ink-primary">
              {project.name}
            </h2>
            <p className="mt-2 break-words text-ink-muted">
              {project.clientName} • {project.addressLine1}, {project.city}, {project.province}
            </p>
          </div>

          {/* Status lives in the stepper below; the header carries only what the
              stepper doesn't — the quote figure (the number a contractor stakes a
              bid on, so it's legible, not a caption) and the report link. */}
          <div className="shrink-0 rounded-2xl border border-hairline bg-ground/50 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Quote</p>
            {latestProposal ? (
              <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-primary">
                ${latestProposal.totalAmount?.toLocaleString() ?? 0}
              </p>
            ) : (
              <p className="mt-1 text-sm text-ink-muted">None yet</p>
            )}
          </div>
          <Link
            href={`/projects/${project.id}/report`}
            className="shrink-0 rounded-xl border border-hairline bg-surface-raised px-4 py-2 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted"
          >
            Open Printable Report
          </Link>
        </div>
      </section>

      <ProjectStatusStepper projectId={project.id} status={project.status} />

      <ProjectWorkspace
        initialTab={initialTab}
        inspect={
          <InspectionWorkflow
            projectId={project.id}
            issues={project.issues}
            photos={project.photos}
          />
        }
        scan={
          <>
            <PhaseSixWorkflow
              projectId={project.id}
              imagery={project.imagery}
              processingJobs={project.processingJobs}
              workerHealth={workerHealth}
              comparisons={project.comparisons}
              modelMeasurements={project.modelMeasurements}
            />

            <ProjectIntelligence measurements={project.measurements} sections={project.sections} />

            {/* The hands-on tools wait behind disclosure so the workflow and the
                numbers lead. Each opens itself once it has work in it. */}
            <DisclosurePanel
              title="Structures & facets"
              hint="Add or edit roof planes and detached structures by hand"
              count={project.sections.length}
              defaultOpen={project.sections.length > 0}
            >
              <RoofSectionManager projectId={project.id} sections={project.sections} />
            </DisclosurePanel>

            <DisclosurePanel
              title="Measurements"
              hint="Add or edit roof metrics by hand — area, ridge, pitch, and more"
              count={project.measurements.length}
              defaultOpen={project.measurements.length > 0}
            >
              <MeasurementManager projectId={project.id} measurements={project.measurements} />
            </DisclosurePanel>

            {extractableModel && (
              <DisclosurePanel
                title="Roof extraction"
                hint="Advanced — trace the roof outline on the 3D model to pull measurements"
              >
                <RoofExtractionPanel
                  projectId={project.id}
                  imageryId={extractableModel.id}
                  modelLabel={extractableModel.fileName ?? "Roof 3D model"}
                />
              </DisclosurePanel>
            )}
          </>
        }
        quote={
          <>
            <ProposalGeneratorCard
              projectId={project.id}
              proposals={project.proposals}
              hasMeasurements={project.measurements.length > 0 || project.modelMeasurements.length > 0}
            />
            <ProposalEditor projectId={project.id} latestProposal={latestProposal ?? null} />
            <ProposalPreview companyName={company.name} proposal={latestProposal ?? null} />
            <PricingTemplatePanel />
          </>
        }
      />

      <AssistantDrawer projectId={project.id} />
    </div>
  );
}
