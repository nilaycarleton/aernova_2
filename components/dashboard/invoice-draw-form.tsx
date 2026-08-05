"use client";

import { useEffect, useRef, useState } from "react";
import { createInvoiceFromQuoteAction } from "@/app/(dashboard)/jobs/[jobId]/invoices/actions";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { formatMoney } from "@/lib/money";

/**
 * Item 35, the ad hoc version. One button for the common case — bill
 * everything left on the quote — and a disclosure beside it for a deposit or
 * a progress payment: a $ or % amount, and a word for what it's for. No
 * schedule is asked for up front; a contractor raises the next draw when they
 * need it, and `createInvoiceFromQuoteAction` is where the amount gets
 * checked against what the quote actually has left.
 */
export function InvoiceDrawForm({
  jobId,
  quoteId,
  remainingCents,
  isFirstDraw,
}: {
  jobId: string;
  quoteId: string;
  remainingCents: number;
  isFirstDraw: boolean;
}) {
  const [partial, setPartial] = useState(false);
  const [amountKind, setAmountKind] = useState<"PERCENT" | "AMOUNT">("PERCENT");

  // Same reasoning as the payments disclosure: land keyboard focus in the
  // field the disclosure just revealed, but only when a person pressed the
  // button — never on first render.
  const valueRef = useRef<HTMLInputElement>(null);
  const openedByUser = useRef(false);
  useEffect(() => {
    if (partial && openedByUser.current) valueRef.current?.focus();
  }, [partial]);

  return (
    <form action={createInvoiceFromQuoteAction} className="space-y-4">
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="quoteId" value={quoteId} />
      <input type="hidden" name="mode" value={partial ? "partial" : "full"} />

      {!partial ? (
        <div className="flex flex-wrap items-center gap-4">
          <SubmitButton
            pendingText="Raising…"
            className="rounded-xl bg-ink-primary px-5 py-3 text-sm font-semibold text-ground transition hover:bg-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60"
          >
            {isFirstDraw ? "Raise an invoice" : `Bill the remaining ${formatMoney(remainingCents)}`}
          </SubmitButton>
          <button
            type="button"
            onClick={() => {
              openedByUser.current = true;
              setPartial(true);
            }}
            className="text-sm text-ink-muted underline underline-offset-4 transition hover:text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
          >
            {isFirstDraw ? "Bill a deposit instead" : "Bill a portion instead"}
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-secondary">Amount</span>
              <div className="flex gap-2">
                <select
                  value={amountKind}
                  onChange={(event) => setAmountKind(event.target.value as "PERCENT" | "AMOUNT")}
                  name="amountKind"
                  className={`${inputClass} w-20 shrink-0`}
                >
                  <option value="PERCENT">%</option>
                  <option value="AMOUNT">$</option>
                </select>
                <input
                  ref={valueRef}
                  name="amountValue"
                  inputMode="decimal"
                  required
                  placeholder={amountKind === "PERCENT" ? "50" : "0.00"}
                  className={inputClass}
                />
              </div>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-ink-secondary">
                What&rsquo;s this for
              </span>
              <input
                name="label"
                defaultValue={isFirstDraw ? "Deposit" : "Progress payment"}
                className={inputClass}
              />
            </label>
          </div>
          <p className="text-xs text-ink-muted">
            {formatMoney(remainingCents)} left to invoice on this quote.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <SubmitButton
              pendingText="Raising…"
              className="rounded-xl bg-ink-primary px-5 py-3 text-sm font-semibold text-ground transition hover:bg-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60"
            >
              Raise this draw
            </SubmitButton>
            <button
              type="button"
              onClick={() => setPartial(false)}
              className="text-sm text-ink-muted underline underline-offset-4 transition hover:text-ink-primary"
            >
              Never mind
            </button>
          </div>
        </>
      )}
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument";
