import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MeasurementManager } from "@/components/dashboard/measurement-manager";
import { ProposalGeneratorCard } from "@/components/dashboard/proposal-generator-card";
import { AiSummary } from "@/components/dashboard/ai-summary";

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
    },
  });

  if (!project) {
    notFound();
  }

  const latestProposal = project.proposals[0];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
              Project
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              {project.name}
            </h2>
            <p className="mt-2 text-slate-400">
              {project.clientName} • {project.addressLine1}, {project.city}, {project.province}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
            <p>Status: {project.status.replaceAll("_", " ")}</p>
            <p className="mt-2">Capture: {project.captureSource}</p>
            <p className="mt-2">
              Proposal: {latestProposal ? `$${latestProposal.totalAmount?.toLocaleString() ?? 0}` : "None yet"}
            </p>
          </div>
          <Link
            href={`/projects/${project.id}/report`}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Open Printable Report
          </Link>
        </div>
      </section>

      <AiSummary projectId={project.id} />

      <MeasurementManager
      projectId={project.id}
      measurements={project.measurements}
      />

      <ProposalGeneratorCard
        projectId={project.id}
        proposals={project.proposals}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-xl font-semibold text-white">Roof Sections</h3>
          <div className="mt-4 space-y-3">
            {project.sections.length === 0 ? (
              <p className="text-sm text-slate-400">No sections yet.</p>
            ) : (
              project.sections.map((section) => (
                <div
                  key={section.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                >
                  <p className="font-medium text-white">{section.label}</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Pitch: {section.pitchRatio ?? "—"} | Surface Area: {section.surfaceAreaSqft ?? 0} sq ft
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-xl font-semibold text-white">Inspection Issues</h3>
          <div className="mt-4 space-y-3">
            {project.issues.length === 0 ? (
              <p className="text-sm text-slate-400">No issues recorded.</p>
            ) : (
              project.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                >
                  <p className="font-medium text-white">{issue.title}</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Severity: {issue.severity}
                  </p>
                  {issue.description ? (
                    <p className="mt-2 text-sm text-slate-500">
                      {issue.description}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}