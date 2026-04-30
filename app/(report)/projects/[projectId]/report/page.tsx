import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildProjectReportViewModel } from "@/lib/report-view-model";
import { PrintReport } from "@/components/dashboard/print-report";

export default async function ProjectReportPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      measurements: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      sections: true,
      issues: true,
      proposals: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const report = buildProjectReportViewModel({
    project,
    measurements: project.measurements,
    sections: project.sections,
    issues: project.issues,
    proposals: project.proposals,
  });

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto mb-4 flex max-w-5xl items-center justify-between print:hidden">
        <Link
          href={`/projects/${project.id}`}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
        >
          Back to Project
        </Link>
      </div>

      <PrintReport report={report} />
    </div>
  );
}