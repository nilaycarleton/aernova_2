import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProjectList } from "@/components/dashboard/project-list";
import { StatsStrip } from "@/components/dashboard/stats-strip";

export default async function DashboardPage() {
  // Temporary no-auth dashboard:
  // pull the seeded demo company directly so the UI works while
  // we finish the app shell and database flows first.
  const company = await prisma.company.findUnique({
    where: { slug: "aernova-demo" },
  });

  if (!company) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-white">No demo company found</h2>
        <p className="text-slate-400">
          Run the seed script first so the dashboard has data to display.
        </p>
        <pre className="rounded-xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300">
{`npx tsx prisma/seed.ts`}
        </pre>
      </div>
    );
  }

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
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Dashboard
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              Roofing workflow command center
            </h2>
            <p className="mt-3 max-w-2xl text-slate-400">
              Track measurements, inspection issues, quote readiness, and client
              proposal progress from one place.
            </p>
          </div>

          <Link
            href="/projects/new"
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            New Project
          </Link>
        </div>
      </section>

      <StatsStrip
        totalProjects={totalProjects}
        readyForQuote={readyForQuote}
        quoted={quoted}
        totalValue={totalDraftProposalValue}
      />

      <section className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-white">Projects</h3>
          <p className="text-sm text-slate-400">
            Recent jobs across your roofing workspace
          </p>
        </div>

        <ProjectList projects={projects} />
      </section>
    </div>
  );
}