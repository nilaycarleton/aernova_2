import { Project, Proposal } from "@prisma/client";

type ProjectWithProposals = Project & {
  proposals: Proposal[];
};

type Props = {
  projects: ProjectWithProposals[];
};

const pipeline = [
  "INSPECTION",
  "READY_FOR_QUOTE",
  "QUOTED",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
];

export function OperationsOverview({ projects }: Props) {
  const totalEstimated = projects.reduce(
    (sum, project) => sum + (project.proposals[0]?.totalAmount ?? 0),
    0
  );
  const estimatedMaterial = Math.round(totalEstimated * 0.38);
  const estimatedLabor = Math.round(totalEstimated * 0.34);
  const grossProfit = totalEstimated - estimatedMaterial - estimatedLabor;
  const margin = totalEstimated > 0 ? Math.round((grossProfit / totalEstimated) * 100) : 0;

  return (
    <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
          Job Management
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-white">
          Pipeline board
        </h3>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pipeline.map((status) => {
            const statusProjects = projects.filter((project) => project.status === status);
            return (
              <div key={status} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">
                    {status.replaceAll("_", " ")}
                  </p>
                  <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-300">
                    {statusProjects.length}
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  {statusProjects.slice(0, 2).map((project) => (
                    <div key={project.id} className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">
                      {project.name}
                    </div>
                  ))}
                  {statusProjects.length === 0 ? (
                    <p className="text-sm text-ink-muted">No jobs</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
            CRM & Scheduling
          </p>
          <div className="mt-4 space-y-3">
            {projects.slice(0, 4).map((project) => (
              <div key={project.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="font-medium text-white">{project.clientName}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {project.clientPhone ?? "No phone"} · Follow up on estimate
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
            Profit Tracking
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-950/50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">Revenue</p>
              <p className="mt-2 text-xl font-semibold text-white">${totalEstimated.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-slate-950/50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">Gross Margin</p>
              <p className="mt-2 text-xl font-semibold text-white">{margin}%</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
