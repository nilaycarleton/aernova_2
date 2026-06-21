import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MeasurementManager } from "@/components/dashboard/measurement-manager";
import { ProposalGeneratorCard } from "@/components/dashboard/proposal-generator-card";
import { AiSummary } from "@/components/dashboard/ai-summary";
import { ProjectIntelligence } from "@/components/dashboard/project-intelligence";
import { RoofSectionManager } from "@/components/dashboard/roof-section-manager";
import { InspectionWorkflow } from "@/components/dashboard/inspection-workflow";
import { ProposalEditor } from "@/components/dashboard/proposal-editor";
import { PricingTemplatePanel } from "@/components/dashboard/pricing-template-panel";
import { PhaseSixWorkflow } from "@/components/dashboard/phase-six-workflow";
import { getNodeOdmWorkerHealth } from "@/lib/nodeodm-client";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

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
    },
  });

  if (!project) {
    notFound();
  }

  const latestProposal = project.proposals[0];
  const workerHealth = await getNodeOdmWorkerHealth();

  return (
    <div className="min-w-0 space-y-8">
      <section className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
              Project
            </p>
            <h2 className="mt-2 break-words text-3xl font-semibold text-white">
              {project.name}
            </h2>
            <p className="mt-2 break-words text-slate-400">
              {project.clientName} • {project.addressLine1}, {project.city}, {project.province}
            </p>
          </div>

          <div className="shrink-0 rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
            <p>Status: {project.status.replaceAll("_", " ")}</p>
            <p className="mt-2">Capture: {project.captureSource}</p>
            <p className="mt-2">
              Proposal: {latestProposal ? `$${latestProposal.totalAmount?.toLocaleString() ?? 0}` : "None yet"}
            </p>
          </div>
          <Link
            href={`/projects/${project.id}/report`}
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Open Printable Report
          </Link>
        </div>
      </section>

      <AiSummary projectId={project.id} />

      <ProjectIntelligence
        measurements={project.measurements}
        sections={project.sections}
      />

      <RoofSectionManager
        projectId={project.id}
        sections={project.sections}
      />

      <MeasurementManager
        projectId={project.id}
        measurements={project.measurements}
      />

      <ProposalGeneratorCard
        projectId={project.id}
        proposals={project.proposals}
      />

      <ProposalEditor
        projectId={project.id}
        latestProposal={latestProposal ?? null}
      />

      <InspectionWorkflow
        projectId={project.id}
        issues={project.issues}
        photos={project.photos}
      />

      <PhaseSixWorkflow
        projectId={project.id}
        imagery={project.imagery}
        processingJobs={project.processingJobs}
        workerHealth={workerHealth}
        comparisons={project.comparisons}
      />

      <PricingTemplatePanel />
    </div>
  );
}
