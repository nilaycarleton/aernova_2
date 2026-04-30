import Link from "next/link";
import { Project, Proposal, Measurement, RoofIssue } from "@prisma/client";

type ProjectWithRelations = Project & {
  measurements: Measurement[];
  issues: RoofIssue[];
  proposals: Proposal[];
};

function statusColor(status: string) {
  switch (status) {
    case "READY_FOR_QUOTE":
      return "text-emerald-300 bg-emerald-500/10";
    case "QUOTED":
      return "text-blue-300 bg-blue-500/10";
    case "PROCESSING":
      return "text-amber-300 bg-amber-500/10";
    case "COMPLETED":
      return "text-slate-200 bg-slate-500/10";
    default:
      return "text-slate-300 bg-slate-500/10";
  }
}

export function ProjectList({
  projects,
}: {
  projects: ProjectWithRelations[];
}) {
  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-400">
        No projects yet. Seed your database or create the first one.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.id}`}
          className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h4 className="text-lg font-semibold text-white">{project.name}</h4>
              <p className="mt-1 text-sm text-slate-400">{project.clientName}</p>
              <p className="mt-2 text-sm text-slate-500">
                {project.addressLine1}, {project.city}, {project.province}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor(project.status)}`}
            >
              {project.status.replaceAll("_", " ")}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-400">
            <span>{project.captureSource}</span>
            <span>•</span>
            <span>{project.measurements.length} measurements</span>
            <span>•</span>
            <span>{project.issues.length} issues</span>
            <span>•</span>
            <span>{project.proposals.length} proposals</span>
          </div>
        </Link>
      ))}
    </div>
  );
}