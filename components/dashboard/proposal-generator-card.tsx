import { Proposal } from "@prisma/client";
import { generateProposalAction } from "@/app/(dashboard)/projects/[projectId]/proposal-actions";

type Props = {
  projectId: string;
  proposals: Proposal[];
};

export function ProposalGeneratorCard({ projectId, proposals }: Props) {
  const latest = proposals[0];

  let parsed: null | {
    summary?: Record<string, unknown>;
    sections?: { title: string; body: string }[];
    plainTextScope?: string;
  } = null;

  if (latest?.scopeOfWork) {
    try {
      parsed = JSON.parse(latest.scopeOfWork);
    } catch {
      parsed = null;
    }
  }

  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
            Report & Proposal
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-white">
            Generate a report-style roofing proposal
          </h3>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            This uses the project’s measurements to produce a contractor-friendly summary with roof metrics,
            waste guidance, material quantities, pricing summary, and scope of work.
          </p>
        </div>

        <form action={generateProposalAction}>
          <input type="hidden" name="projectId" value={projectId} />
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            Generate Proposal
          </button>
        </form>
      </div>

      {latest ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h4 className="text-lg font-semibold text-white">{latest.title}</h4>
              <p className="mt-1 text-sm text-slate-400">
                Latest draft proposal
              </p>
            </div>
            <div className="rounded-full bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
              ${latest.totalAmount?.toLocaleString() ?? "0"}
            </div>
          </div>

          {parsed?.summary ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.15em] text-slate-500">Roof Area</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {String(parsed.summary.roofAreaSqft ?? 0)} sq ft
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.15em] text-slate-500">Pitch</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {String(parsed.summary.predominantPitch ?? "—")}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.15em] text-slate-500">Waste</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {String(parsed.summary.wasteFactorPercent ?? 0)}%
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.15em] text-slate-500">Suggested Squares</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {String(parsed.summary.suggestedSquares ?? 0)}
                </div>
              </div>
            </div>
          ) : null}

          {parsed?.sections?.length ? (
            <div className="mt-6 space-y-4">
              {parsed.sections.map((section) => (
                <div
                  key={section.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <h5 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-300">
                    {section.title}
                  </h5>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {section.body}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-slate-400">
          No proposal yet. Generate one from the project measurements.
        </div>
      )}
    </section>
  );
}