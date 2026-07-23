import Link from "next/link";
import { Proposal } from "@prisma/client";
import { generateProposalAction } from "@/app/(dashboard)/projects/[projectId]/proposal-actions";

type Props = {
  projectId: string;
  proposals: Proposal[];
  /** Whether the project has any roof measurements to build a quote from. */
  hasMeasurements: boolean;
};

// Format a possibly-float summary value for display (e.g. 3664.1000000000004 ->
// "3,664.1") so long raw numbers don't overflow their cards.
function num(value: unknown, decimals = 1) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

export function ProposalGeneratorCard({ projectId, proposals, hasMeasurements }: Props) {
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
    <section className="space-y-4 rounded-3xl border border-hairline bg-surface-raised p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-ink-muted">
            Quote
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-ink-primary">
            Create the client quote
          </h3>
          <p className="mt-2 max-w-3xl text-sm text-ink-muted">
            Turns your roof measurements into a client-ready quote — roof size, materials needed,
            pricing, and scope of work.
          </p>
        </div>

        {/* The quote is built from measurements, so the action only appears once
            there are some. With none, the empty state below points to Scan &
            measure instead of offering a button that would build a hollow quote. */}
        {hasMeasurements || latest ? (
          <form action={generateProposalAction}>
            <input type="hidden" name="projectId" value={projectId} />
            <button
              type="submit"
              className="rounded-xl bg-instrument px-5 py-3 text-sm font-semibold text-ground transition hover:bg-instrument-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
            >
              {latest ? "Rebuild quote" : "Create quote"}
            </button>
          </form>
        ) : null}
      </div>

      {latest ? (
        <div className="rounded-2xl border border-hairline bg-ground/40 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h4 className="text-lg font-semibold text-ink-primary">{latest.title}</h4>
              <p className="mt-1 text-sm text-ink-muted">
                Latest draft quote
              </p>
            </div>
            <div className="text-left md:text-right">
              <div className="text-xs uppercase tracking-[0.15em] text-ink-muted">
                Quote total
              </div>
              <div className="mt-1 text-3xl font-semibold tabular-nums text-instrument-bright">
                ${latest.totalAmount?.toLocaleString() ?? "0"}
              </div>
            </div>
          </div>

          {parsed?.summary ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="min-w-0 rounded-2xl border border-instrument/25 bg-instrument/5 p-4">
                <div className="text-xs uppercase tracking-[0.15em] text-instrument-bright">Roof area</div>
                <div className="mt-2 text-2xl font-semibold tabular-nums text-instrument-bright">
                  {num(parsed.summary.roofAreaSqft, 1) ?? "0"} sq ft
                </div>
              </div>
              <div className="min-w-0 rounded-2xl border border-hairline bg-surface-raised p-4">
                <div className="text-xs uppercase tracking-[0.15em] text-ink-muted">Pitch</div>
                <div className="mt-2 text-lg font-semibold text-ink-primary">
                  {String(parsed.summary.predominantPitch ?? "—")}
                </div>
              </div>
              <div className="min-w-0 rounded-2xl border border-hairline bg-surface-raised p-4">
                <div className="text-xs uppercase tracking-[0.15em] text-ink-muted">Waste</div>
                <div className="mt-2 text-lg font-semibold tabular-nums text-ink-primary">
                  {num(parsed.summary.wasteFactorPercent, 0) ?? "0"}%
                </div>
              </div>
              <div className="min-w-0 rounded-2xl border border-hairline bg-surface-raised p-4">
                <div className="text-xs uppercase tracking-[0.15em] text-ink-muted">Squares needed</div>
                <div className="mt-2 text-lg font-semibold tabular-nums text-ink-primary">
                  {num(parsed.summary.suggestedSquares, 1) ?? "0"}
                </div>
              </div>
              <div className="min-w-0 rounded-2xl border border-hairline bg-surface-raised p-4">
                <div className="text-xs uppercase tracking-[0.15em] text-ink-muted">Complexity</div>
                <div className="mt-2 text-lg font-semibold capitalize text-ink-primary">
                  {String(parsed.summary.complexity ?? "—")}
                </div>
              </div>
              <div className="min-w-0 rounded-2xl border border-hairline bg-surface-raised p-4">
                <div className="text-xs uppercase tracking-[0.15em] text-ink-muted">Labor factor</div>
                <div className="mt-2 text-lg font-semibold tabular-nums text-ink-primary">
                  {num(parsed.summary.laborMultiplier, 2) ?? "—"}x
                </div>
              </div>
            </div>
          ) : null}

          {parsed?.sections?.length ? (
            <div className="mt-6 space-y-4">
              {parsed.sections.map((section) => (
                <div
                  key={section.title}
                  className="rounded-2xl border border-hairline bg-surface-raised p-4"
                >
                  <h5 className="text-sm font-semibold uppercase tracking-[0.15em] text-ink-secondary">
                    {section.title}
                  </h5>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">
                    {section.body}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : hasMeasurements ? (
        <div className="rounded-2xl border border-dashed border-hairline p-8 text-ink-muted">
          No quote yet. Create one from your roof measurements.
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-hairline p-8">
          <p className="font-medium text-ink-secondary">Measure the roof first</p>
          <p className="mt-1 max-w-md text-sm leading-6 text-ink-muted">
            A quote is built from your roof measurements — area, pitch, and squares. Add them in
            Scan &amp; measure, then come back here to build the priced quote.
          </p>
          <Link
            href={`/projects/${projectId}?tab=scan`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-hairline bg-surface-raised px-4 py-2 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-instrument"
          >
            Go to Scan &amp; measure
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      )}
    </section>
  );
}
