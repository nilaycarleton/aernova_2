"use client";

import { formatMoney } from "@/lib/money";
import { useQuoteDecision } from "@/components/public/quote-decision";

/**
 * The foot of the document, live.
 *
 * It moves when they tick an extra because it is computed from the same
 * function the server will run on Approve — this is not a preview of a total,
 * it is the total.
 */
export function QuoteTotals({
  showTotals,
  taxLabel,
}: {
  showTotals: boolean;
  taxLabel: string | null;
}) {
  const { totals } = useQuoteDecision();

  return (
    <dl className="w-full max-w-xs space-y-2 text-sm">
      {showTotals ? (
        <>
          <TotalRow label="Subtotal" value={formatMoney(totals.subtotalCents)} />
          {totals.discountCents > 0 ? (
            <TotalRow label="Discount" value={`−${formatMoney(totals.discountCents)}`} />
          ) : null}
        </>
      ) : null}

      {/* Outside the visibility gate. A contractor may quote the roof as one
          number; a number that grew because the homeowner ticked a box has to
          say so, or the page has changed the price without explaining itself. */}
      {totals.acceptedOptionalCents > 0 ? (
        <TotalRow
          label="Extras you added"
          value={formatMoney(totals.acceptedOptionalCents)}
        />
      ) : null}

      {showTotals && taxLabel ? (
        <TotalRow label={taxLabel} value={formatMoney(totals.taxCents)} />
      ) : null}

      {/* `paper-rule-strong` appears once on a document, above the number the
          homeowner signs. */}
      <div className="flex items-baseline justify-between gap-4 border-t-2 border-paper-rule-strong pt-3">
        <dt className="font-semibold text-paper-ink">Total</dt>
        <dd className="text-xl font-semibold tabular-nums text-paper-ink">
          {formatMoney(totals.totalCents)}
        </dd>
      </div>

      {totals.depositCents > 0 ? (
        <TotalRow label="Deposit to start" value={formatMoney(totals.depositCents)} emphasis />
      ) : null}
    </dl>
  );
}

function TotalRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={emphasis ? "font-medium text-paper-ink-strong" : "text-paper-ink-muted"}>
        {label}
      </dt>
      <dd
        className={`tabular-nums ${
          emphasis ? "font-medium text-paper-ink-strong" : "text-paper-ink-body"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
