import Link from "next/link";
import { Quote } from "@prisma/client";
import {
  createBlankQuoteAction,
  generateQuoteAction,
} from "@/app/(dashboard)/jobs/[jobId]/quote-actions";
import {
  QuoteStartDialog,
  type StartTemplate,
} from "@/components/dashboard/quote-start-dialog";
import { formatMoney } from "@/lib/money";

type Props = {
  jobId: string;
  quotes: Quote[];
  /** Saved templates for this company. Empty is the common first-run case. */
  templates: StartTemplate[];
  /** Whether the job has any roof measurements to build a quote from. */
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

/** The accelerator beside it — offered, never required. */
const secondaryAction =
  "shrink-0 rounded-xl border border-hairline bg-surface-raised px-5 py-3 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline py-2.5 last:border-b-0">
      <dt className="text-sm text-ink-secondary">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-ink-primary">{value}</dd>
    </div>
  );
}

export function QuoteGeneratorCard({ jobId, quotes, templates, hasMeasurements }: Props) {
  const latest = quotes[0];

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
                {formatMoney(latest.totalAmountCents)}
              </p>
              <p className="mt-3 text-sm text-ink-secondary">
                {latest.title} · latest draft
                {basis ? ` · based on ${basis}` : ""}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              {/* Opening the document is the action here. Rebuilding is the
                  rarer, more destructive one, so it reads as the quieter of the
                  two rather than sitting where a thumb lands. */}
              <Link href={`/jobs/${jobId}/quotes/${latest.id}`} className={primaryAction}>
                Open this quote
              </Link>

              {/* Rebuilding is only offered where there is something to rebuild
                  *from*. With no measurements it would replace a hand-written
                  quote with a report of zeroes — the one way this button could
                  destroy work. */}
              {hasMeasurements ? (
                <form action={generateQuoteAction}>
                  <input type="hidden" name="jobId" value={jobId} />
                  <button type="submit" className={secondaryAction}>
                    Rebuild from measurements
                  </button>
                </form>
              ) : null}
            </div>
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
                Write it yourself, or let the roof measurements fill in the size, materials
                and pricing for you.
              </p>
            </div>

            {/* Create quote is always here. Measurements are an accelerator —
                they save the typing, they were never the price of admission,
                and a repair or a call-out is a real quote that no measuring
                helps with. */}
            <div className="flex flex-wrap gap-3">
              {/* With templates saved, the button opens the list first — that is
                  what a contractor with a saved re-roof actually wants. With
                  none, it stays one click to a blank draft: a chooser with one
                  option is a step, not a choice. */}
              {templates.length > 0 ? (
                <QuoteStartDialog jobId={jobId} templates={templates} />
              ) : (
                <form action={createBlankQuoteAction}>
                  <input type="hidden" name="jobId" value={jobId} />
                  <button type="submit" className={primaryAction}>
                    Create quote
                  </button>
                </form>
              )}

              {hasMeasurements ? (
                <form action={generateQuoteAction}>
                  <input type="hidden" name="jobId" value={jobId} />
                  <button type="submit" className={secondaryAction}>
                    Build from roof measurements
                  </button>
                </form>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-hairline p-8 text-ink-muted">
            {hasMeasurements
              ? "No quote yet. Start a blank one, or build it from the roof measurements you already have."
              : "No quote yet. Start a blank one and price it by hand — or measure the roof first and have it priced for you."}
          </div>
        </>
      )}
    </section>
  );
}
