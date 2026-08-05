import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompanyContext } from "@/lib/auth";
import { buildJobReportViewModel } from "@/lib/report-view-model";
import { jobIdentityInclude } from "@/lib/job-identity";
import { PrintReport } from "@/components/dashboard/print-report";

export default async function JobReportPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const { company } = await requireCompanyContext();

  const job = await prisma.job.findUnique({
    where: { id: jobId },
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
      quotes: {
        orderBy: { createdAt: "desc" },
        include: { lineItems: { orderBy: { sortOrder: "asc" } } },
      },
      ...jobIdentityInclude,
    },
  });

  if (!job || job.companyId !== company.id) {
    notFound();
  }

  const report = buildJobReportViewModel({
    job,
    measurements: job.measurements,
    sections: job.sections,
    issues: job.issues,
    photos: job.photos,
    imagery: job.imagery,
    comparisons: job.comparisons,
    quotes: job.quotes,
  });

  return (
    <div className="min-h-screen bg-paper p-6">
      <div className="mx-auto mb-4 flex max-w-5xl items-center justify-between print:hidden">
        <Link
          href={`/jobs/${job.id}`}
          className="rounded-xl border border-slate-300 bg-paper-document px-4 py-2 text-sm font-medium text-paper-ink-strong transition hover:bg-paper-inset"
        >
          Back to Job
        </Link>
      </div>

      <PrintReport report={report} />
    </div>
  );
}
