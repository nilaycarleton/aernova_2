import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompanyContext } from "@/lib/auth";
import { buildProjectReportViewModel } from "@/lib/report-view-model";
import { PrintReport } from "@/components/dashboard/print-report";

export default async function ProjectReportPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { company } = await requireCompanyContext();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      measurements: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      sections: true,
      issues: true,
      photos: {
        orderBy: { createdAt: "desc" },
      },
      imagery: {
        orderBy: { createdAt: "desc" },
      },
      comparisons: {
        orderBy: { createdAt: "desc" },
      },
      proposals: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project || project.companyId !== company.id) {
    notFound();
  }

  const report = buildProjectReportViewModel({
    project,
    measurements: project.measurements,
    sections: project.sections,
    issues: project.issues,
    photos: project.photos,
    imagery: project.imagery,
    comparisons: project.comparisons,
    proposals: project.proposals,
  });

  return (
    <div className="min-h-screen bg-paper p-6">
      <div className="mx-auto mb-4 flex max-w-5xl items-center justify-between print:hidden">
        <Link
          href={`/projects/${project.id}`}
          className="rounded-xl border border-slate-300 bg-paper-document px-4 py-2 text-sm font-medium text-paper-ink-strong transition hover:bg-paper-inset"
        >
          Back to Project
        </Link>
      </div>

      <PrintReport report={report} />
    </div>
  );
}
