"use client";

import { formatMoney } from "@/lib/money";
import { useQuoteDecision } from "@/components/public/quote-decision";

/**
 * The extras, and the homeowner's say over them.
 *
 * The contractor put these on the quote before sending it — the roof was
 * already discussed, this is the "while we're up there" list. Which of them get
 * done is the homeowner's call, made here, alone, at the kitchen table without
 * anyone standing over them. That is the whole point: an upsell nobody has to
 * say no to a person's face is an upsell that gets read on its merits.
 *
 * Not a table. The required work is a document and reads as one; this is a set
 * of choices, and choices on a phone want a big target and a short line, not
 * four columns.
 */
export type ExtraLine = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  amountCents: number;
};

export function QuoteExtras({
  lines,
  formId,
  showQuantities,
  showUnitPrices,
}: {
  lines: ExtraLine[];
  /** The approve form, elsewhere on the page. See the note on the input below. */
  formId: string;
  showQuantities: boolean;
  showUnitPrices: boolean;
}) {
  const { selected, toggle } = useQuoteDecision();

  // Answered. Both halves stay on the page: what they took *and* what they
  // didn't. Hiding the declined ones would make the approved document a
  // shorter story than the one that was agreed to, and "I never saw that
  // option" is the argument this record exists to settle.
  if (!toggle) {
    return (
      <section className="mt-8 rounded-xl border border-dashed border-paper-rule p-5">
        <h2 className="font-semibold text-paper-ink-strong">The extras that were offered</h2>
        <ul className="mt-3 space-y-3">
          {lines.map((line) => {
            const taken = selected.has(line.id);
            return (
              <li key={line.id} className="flex items-baseline justify-between gap-4 text-sm">
                <span className={taken ? "text-paper-ink-body" : "text-paper-ink-faint"}>
                  {line.name}
                  <span className="ml-2 text-xs">
                    {taken ? "· added" : "· not included"}
                  </span>
                </span>
                <span
                  className={`shrink-0 tabular-nums ${
                    taken ? "text-paper-ink-strong" : "text-paper-ink-faint line-through"
                  }`}
                >
                  {formatMoney(line.amountCents)}
                </span>
              </li>
            );
          })}
        </ul>
        {selected.size > 0 ? (
          <p className="mt-3 text-sm text-paper-ink-muted">
            What you added is in the total below.
          </p>
        ) : null}
      </section>
    );
  }

  const addedCents = lines
    .filter((line) => selected.has(line.id))
    .reduce((sum, line) => sum + line.amountCents, 0);

  return (
    <section className="mt-8 rounded-xl border border-dashed border-paper-rule p-5">
      <h2 className="font-semibold text-paper-ink-strong">
        Anything else while we&rsquo;re up there?
      </h2>
      <p className="mt-1 text-sm text-paper-ink-muted">
        None of this is in the price above. Tick what you&rsquo;d like and it gets added.
      </p>

      <ul className="mt-4 space-y-2">
        {lines.map((line) => {
          const on = selected.has(line.id);
          return (
            <li key={line.id}>
              {/* The label wraps the row, so the whole row is the target — on a
                  phone, a 16px checkbox is not a thing you hit while holding a
                  coffee. */}
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal-blue ${
                  on
                    ? "border-paper-rule-strong bg-paper-inset"
                    : "border-transparent hover:bg-paper"
                }`}
              >
                <input
                  type="checkbox"
                  /* Belongs to the approve form two columns away, via `form`.
                     That is not a trick to avoid plumbing: it means the tick
                     survives a browser with no JavaScript, where the checkbox
                     still posts with the approval and the server still adds it
                     up. Nothing about agreeing to pay for something should
                     depend on a script loading. */
                  form={formId}
                  name="extras"
                  value={line.id}
                  checked={on}
                  onChange={(event) => toggle(line.id, event.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-signal-blue"
                />
                {/* An extra with a picture sells itself; an extra described in
                    six words does not. This is the row where it matters most. */}
                {line.imageUrl ? (
                  <img
                    src={line.imageUrl}
                    alt={line.name}
                    loading="lazy"
                    decoding="async"
                    className="size-14 shrink-0 rounded-lg border border-paper-rule object-cover"
                  />
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="font-medium text-paper-ink-strong">{line.name}</span>
                    {/* Shown whatever the visibility settings say. A contractor
                        may choose to quote the roof as one number; they may not
                        ask someone to agree to a charge without naming it. */}
                    <span className="shrink-0 tabular-nums text-paper-ink-strong">
                      +{formatMoney(line.amountCents)}
                    </span>
                  </span>
                  {showQuantities && showUnitPrices && line.quantity !== 1 ? (
                    <span className="mt-0.5 block text-xs tabular-nums text-paper-ink-faint">
                      {line.quantity} {line.unit} at {formatMoney(line.unitPriceCents)} each
                    </span>
                  ) : null}
                  {line.description ? (
                    <span className="mt-1.5 block max-w-prose text-sm leading-6 text-paper-ink-muted">
                      {line.description}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {/* Announced, because on a phone the total it changed is off-screen. */}
      <p aria-live="polite" className="mt-3 min-h-5 text-sm text-paper-ink-body">
        {addedCents > 0
          ? `Added ${formatMoney(addedCents)}. It's in the total below.`
          : ""}
      </p>
    </section>
  );
}
