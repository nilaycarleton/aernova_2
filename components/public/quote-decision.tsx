"use client";

import { createContext, useContext, useMemo, useState } from "react";
import {
  computeTotals,
  type DiscountInput,
  type QuoteTotals,
} from "@/lib/quote/totals";

/**
 * What the homeowner has decided so far, shared by the three places on the page
 * that have to agree about it: the extras they can tick, the totals block at the
 * foot of the document, and the price in the rail beside it.
 *
 * Context rather than props because those three sit in different corners of the
 * layout and the one thing that must never happen is two of them disagreeing —
 * a page where the box says $8,300 and the rail says $7,500 is a page nobody
 * signs.
 */
export type DecisionLine = {
  id: string;
  kind: "ITEM" | "TEXT";
  quantity: number;
  unitPriceCents: number;
  isOptional: boolean;
};

export type DecisionOptions = {
  discount: DiscountInput;
  taxRateMicros: number | null;
  deposit: DiscountInput;
};

type Decision = {
  totals: QuoteTotals;
  selected: ReadonlySet<string>;
  /** Null once they have answered — the document stops being a form. */
  toggle: ((id: string, on: boolean) => void) | null;
};

const DecisionContext = createContext<Decision | null>(null);

export function useQuoteDecision(): Decision {
  const value = useContext(DecisionContext);
  if (!value) throw new Error("Quote decision used outside the quote page.");
  return value;
}

/**
 * Note what is *not* passed in: cost, margin, markup. The public page has never
 * received them and must not start now — a context is exactly the sort of thing
 * a future component reaches into without asking where the numbers came from.
 */
export function QuoteDecisionProvider({
  lines,
  options,
  initialSelected,
  locked,
  children,
}: {
  lines: DecisionLine[];
  options: DecisionOptions;
  initialSelected: string[];
  locked: boolean;
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(initialSelected)
  );

  /**
   * The same `computeTotals` the server runs when they press Approve. One
   * function, two places it runs, no second implementation — the total on
   * screen when they click and the total recorded against the job are the same
   * arithmetic or this whole feature is a way of surprising people.
   */
  const totals = useMemo(
    () =>
      computeTotals(
        lines.map((line) => ({
          kind: line.kind,
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
          isOptional: line.isOptional,
          isAccepted: selected.has(line.id),
        })),
        options
      ),
    [lines, options, selected]
  );

  const value = useMemo<Decision>(
    () => ({
      totals,
      selected,
      toggle: locked
        ? null
        : (id, on) =>
            setSelected((current) => {
              const next = new Set(current);
              if (on) next.add(id);
              else next.delete(id);
              return next;
            }),
    }),
    [totals, selected, locked]
  );

  return <DecisionContext.Provider value={value}>{children}</DecisionContext.Provider>;
}
