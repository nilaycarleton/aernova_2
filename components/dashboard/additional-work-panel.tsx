"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createDirectInvoiceAction,
  type CreateDirectInvoiceState,
} from "@/app/(dashboard)/jobs/[jobId]/additional-work-actions";
import { AddOnOverrideFields } from "@/components/dashboard/addon-override-fields";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { formatMoney } from "@/lib/money";
import { lineTotalCents } from "@/lib/quote/totals";

type DraftLine = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
};

let nextDraftId = 0;

export type AdditionalWorkInvoiceRow = {
  id: string;
  invoiceNumber: number | null;
  title: string;
  status: string;
  totalAmountCents: number;
  requiresHomeownerReview: boolean;
  homeownerReviewConfirmedAt: string | null;
};

/**
 * §19.2 — a small no-quote bill, straight from the job. Below the company's
 * threshold this is the whole story: name it, price it, save it, send it
 * like any other invoice. At or above it, the homeowner-review gate (or a
 * named override, right here) is what decides whether it can send at all —
 * `createDirectInvoiceAction` is the one place that decision gets made.
 */
export function AdditionalWorkPanel({
  jobId,
  thresholdCents,
  existingInvoices,
}: {
  jobId: string;
  thresholdCents: number;
  existingInvoices: AdditionalWorkInvoiceRow[];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { id: `draft-${nextDraftId++}`, name: "", quantity: 1, unit: "each", unitPriceCents: 0 },
  ]);
  const [state, formAction] = useActionState<CreateDirectInvoiceState, FormData>(
    createDirectInvoiceAction,
    {}
  );

  const totalCents = lines.reduce((sum, line) => sum + lineTotalCents(line), 0);
  const atOrAboveThreshold = totalCents >= thresholdCents;

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { id: `draft-${nextDraftId++}`, name: "", quantity: 1, unit: "each", unitPriceCents: 0 },
    ]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <section className="rounded-lg border border-hairline bg-surface-raised p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink-primary">Additional work</h3>
          <p className="mt-1 text-sm text-ink-muted">
            A small extra worth billing for, with no quote behind it — under{" "}
            {formatMoney(thresholdCents)} goes straight out; at or above it, the homeowner reviews
            it first by default.
          </p>
        </div>
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-lg border border-hairline px-4 py-2 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted"
          >
            Bill for something extra
          </button>
        ) : null}
      </div>

      {existingInvoices.length > 0 ? (
        <ul className="mt-4 divide-y divide-hairline border-t border-hairline">
          {existingInvoices.map((invoice) => (
            <li key={invoice.id} className="flex items-center justify-between gap-4 py-3 text-sm">
              <Link
                href={`/jobs/${jobId}/invoices/${invoice.id}`}
                className="min-w-0 truncate text-ink-primary underline underline-offset-4 hover:text-ink-secondary"
              >
                {invoice.invoiceNumber ? `#${invoice.invoiceNumber} — ` : ""}
                {invoice.title}
              </Link>
              <span className="shrink-0 tabular-nums text-ink-muted">
                {formatMoney(invoice.totalAmountCents)}
                {invoice.requiresHomeownerReview && !invoice.homeownerReviewConfirmedAt
                  ? " · awaiting review"
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <form action={formAction} className="mt-5 space-y-4 border-t border-hairline pt-5">
          <input type="hidden" name="jobId" value={jobId} />
          <input
            type="hidden"
            name="lines"
            value={JSON.stringify(
              lines.map((line) => ({
                name: line.name,
                quantity: line.quantity,
                unit: line.unit,
                unitPriceCents: line.unitPriceCents,
              }))
            )}
          />

          <div>
            <label htmlFor="aw-title" className="mb-1.5 block text-xs font-medium text-ink-secondary">
              What&rsquo;s this for?
            </label>
            <input
              id="aw-title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Extra downspout"
              required
              className="w-full rounded-md border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition focus:border-signal-blue"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-hairline text-ink-muted">
                  <th scope="col" className="pb-2 font-medium">Item</th>
                  <th scope="col" className="pb-2 pl-3 font-medium">Qty</th>
                  <th scope="col" className="pb-2 pl-3 font-medium">Unit</th>
                  <th scope="col" className="pb-2 pl-3 font-medium">Price</th>
                  <th scope="col" className="pb-2 pl-3 text-right font-medium">Amount</th>
                  <th scope="col" className="pb-2 pl-3" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={line.id} className="border-b border-hairline align-top">
                    <td className="py-2 pr-2">
                      <input
                        value={line.name}
                        onChange={(e) => updateLine(index, { name: e.target.value })}
                        placeholder="What's being billed"
                        className="w-full rounded-lg border border-hairline bg-ground/50 px-2 py-1.5 text-sm text-ink-primary outline-none focus:border-signal-blue"
                      />
                    </td>
                    <td className="py-2 pl-3">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={line.quantity}
                        onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                        className="w-20 rounded-lg border border-hairline bg-ground/50 px-2 py-1.5 text-sm text-ink-primary outline-none focus:border-signal-blue"
                      />
                    </td>
                    <td className="py-2 pl-3">
                      <input
                        value={line.unit}
                        onChange={(e) => updateLine(index, { unit: e.target.value })}
                        className="w-20 rounded-lg border border-hairline bg-ground/50 px-2 py-1.5 text-sm text-ink-primary outline-none focus:border-signal-blue"
                      />
                    </td>
                    <td className="py-2 pl-3">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitPriceCents / 100}
                        onChange={(e) =>
                          updateLine(index, { unitPriceCents: Math.round(Number(e.target.value) * 100) })
                        }
                        className="w-24 rounded-lg border border-hairline bg-ground/50 px-2 py-1.5 text-sm text-ink-primary outline-none focus:border-signal-blue"
                      />
                    </td>
                    <td className="py-2 pl-3 text-right tabular-nums text-ink-primary">
                      {formatMoney(lineTotalCents(line))}
                    </td>
                    <td className="py-2 pl-3 text-right">
                      {lines.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="text-xs text-ink-muted underline underline-offset-4 transition hover:text-danger-fg"
                        >
                          Remove
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              onClick={addLine}
              className="mt-3 text-sm text-ink-secondary underline underline-offset-4 transition hover:text-ink-primary"
            >
              + Add a line
            </button>
          </div>

          <div className="flex items-baseline justify-between border-t border-hairline pt-3">
            <p className="text-sm font-medium text-ink-secondary">Total</p>
            <p className="text-lg font-semibold tabular-nums text-ink-primary">{formatMoney(totalCents)}</p>
          </div>

          {atOrAboveThreshold ? (
            <div className="rounded-lg border border-caution/30 bg-caution/5 p-4">
              <p className="text-sm text-caution-fg">
                This is at or above your {formatMoney(thresholdCents)}{" "}
                review threshold. By default it&rsquo;ll be shared to the homeowner for review
                before it can send — leave the reason below blank for that. Only pick one if you
                need to skip review.
              </p>
              <div className="mt-3">
                <AddOnOverrideFields idPrefix="aw-create-override" reasonRequired={false} />
              </div>
            </div>
          ) : null}

          {state.error ? <p className="text-sm text-danger-fg">{state.error}</p> : null}

          <div className="flex gap-3">
            <SubmitButton
              pendingText="Creating…"
              className="rounded-md bg-action px-5 py-2.5 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60"
            >
              Create invoice
            </SubmitButton>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-ink-muted underline underline-offset-4"
            >
              Never mind
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
