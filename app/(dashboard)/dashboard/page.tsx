import { prisma } from "@/lib/prisma";
import { requireCompanyContext } from "@/lib/auth";
import { ProjectsBrowser } from "@/components/dashboard/projects-browser";
import { DashboardCommandBand } from "@/components/dashboard/dashboard-command-band";
import { OperationsOverview } from "@/components/dashboard/operations-overview";

export default async function DashboardPage() {
  const { company } = await requireCompanyContext();

  const projects = await prisma.project.findMany({
    where: {
      companyId: company.id,
    },
    include: {
      measurements: true,
      issues: true,
      proposals: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const totalProjects = projects.length;

  const readyForQuote = projects.filter(
    (project) => project.status === "READY_FOR_QUOTE"
  ).length;

  const quoted = projects.filter(
    (project) => project.status === "QUOTED"
  ).length;

  const totalDraftProposalValue = projects.reduce((sum, project) => {
    const latestProposal = project.proposals[0];
    return sum + (latestProposal?.totalAmount ?? 0);
  }, 0);

  return (
    <div className="min-w-0 space-y-8">
      <DashboardCommandBand
        totalProjects={totalProjects}
        readyForQuote={readyForQuote}
        quoted={quoted}
        totalValue={totalDraftProposalValue}
      />

      <OperationsOverview projects={projects} />

      <section className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-ink-primary">Projects</h3>
          <p className="text-sm text-ink-muted">
            Search, filter, and sort jobs across your roofing workspace
          </p>
        </div>

        <ProjectsBrowser
          projects={projects.map((project) => ({
            id: project.id,
            name: project.name,
            clientName: project.clientName,
            addressLine1: project.addressLine1,
            city: project.city,
            province: project.province,
            status: project.status,
            captureSource: project.captureSource,
            updatedAt: project.updatedAt,
            measurements: project.measurements.length,
            issues: project.issues.length,
            proposals: project.proposals.length,
          }))}
        />
      </section>
    </div>
  );
}
