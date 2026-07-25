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
// "3,664.1") so long raw numbers don't overflow their row.
function num(value: unknown, decimals = 1) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

/**
 * The primary action, in high-contrast neutral rather than cyan. Cyan used to
 * mark both "this is the number" and "this is the button"; when one colour means
 * two things, neither reads as special. Here the ink/ground inversion carries
 * "clickable" and cyan is left to mean one thing only — the reading.
 *
 * `text-ground` is correct on this fill even though The Constant-On-Accent Rule
 * forbids it on a bright accent: there, cyan stays fixed while ground flips, so
 * the label would vanish. Here ink-primary and ground are inverses and flip
 * *together* — 20.3:1 in dark, 15.6:1 in light. Don't "fix" this to on-accent.
 */
const primaryAction =
  "shrink-0 rounded-xl bg-ink-primary px-5 py-3 text-sm font-semibold text-ground transition hover:bg-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline py-2.5 last:border-b-0">
      <dt className="text-sm text-ink-secondary">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-ink-primary">{value}</dd>
    </div>
  );
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

  const summary = parsed?.summary;

  // The prose line under the total, in the roofer's own words. This absorbs what
  // used to be two bordered tiles (roof area, pitch): the measurements the quote
  // is derived from belong in a sentence about the number, not in boxes beside it.
  const basis = summary
    ? [
        num(summary.roofAreaSqft, 1) ? `${num(summary.roofAreaSqft, 1)} sq ft of roof` : null,
        summary.predominantPitch ? `${String(summary.predominantPitch)} pitch` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <section className="min-w-0 space-y-6 rounded-3xl border border-hairline bg-surface-raised p-6 sm:p-8">
      {latest ? (
        /* With a quote in hand, the panel leads with the number instead of
           another eyebrow-and-headline. The total is the only cyan figure on
           this surface — the same Readout Rule shape the dashboard opens with,
           so the whole app reads as one instrument. */
        <>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">
                Quote total
              </p>
              <p className="mt-2 break-words text-5xl font-semibold tabular-nums text-instrument-fg">
                ${latest.totalAmount?.toLocaleString() ?? "0"}
              </p>
              <p className="mt-3 text-sm text-ink-secondary">
                {latest.title} · latest draft
                {basis ? ` · based on ${basis}` : ""}
              </p>
            </div>

            <form action={generateProposalAction}>
              <input type="hidden" name="projectId" value={projectId} />
              <button type="submit" className={primaryAction}>
                Rebuild quote
              </button>
            </form>
          </div>

          {summary ? (
            <dl className="grid gap-x-10 sm:grid-cols-2">
              <Row label="Waste" value={`${num(summary.wasteFactorPercent, 0) ?? "0"}%`} />
              <Row label="Squares needed" value={num(summary.suggestedSquares, 1) ?? "0"} />
              <Row label="Complexity" value={String(summary.complexity ?? "—")} />
              <Row label="Labor factor" value={`${num(summary.laborMultiplier, 2) ?? "—"}x`} />
            </dl>
          ) : null}

          {parsed?.sections?.length ? (
            <div className="border-t border-hairline pt-5">
              {parsed.sections.map((section) => (
                <div
                  key={section.title}
                  className="border-b border-hairline py-4 last:border-b-0 last:pb-0"
                >
                  <h4 className="text-sm font-semibold text-ink-primary">
                    {section.title}
                  </h4>
                  <p className="mt-1.5 text-sm leading-6 text-ink-muted">
                    {section.body}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        /* No quote yet, so there is no number to lead with — here the headline
           genuinely is the content. */
        <>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-ink-primary">
                Create the client quote
              </h3>
              <p className="mt-2 max-w-3xl text-sm text-ink-muted">
                Turns your roof measurements into a client-ready quote — roof size, materials
                needed, pricing, and scope of work.
              </p>
            </div>

            {/* The quote is built from measurements, so the action only appears
                once there are some. With none, the empty state below points to
                Scan & measure instead of offering a button that would build a
                hollow quote. */}
            {hasMeasurements ? (
              <form action={generateProposalAction}>
                <input type="hidden" name="projectId" value={projectId} />
                <button type="submit" className={primaryAction}>
                  Create quote
                </button>
              </form>
            ) : null}
          </div>

          {hasMeasurements ? (
            <div className="rounded-2xl border border-dashed border-hairline p-8 text-ink-muted">
              No quote yet. Create one from your roof measurements.
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-hairline p-8">
              <p className="font-medium text-ink-secondary">Measure the roof first</p>
              <p className="mt-1 max-w-md text-sm leading-6 text-ink-muted">
                A quote is built from your roof measurements — area, pitch, and squares. Add them
                in Scan &amp; measure, then come back here to build the priced quote.
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
        </>
      )}
    </section>
  );
}
