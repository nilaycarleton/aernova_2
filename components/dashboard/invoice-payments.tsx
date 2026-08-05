"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PaymentMethod } from "@prisma/client";
import {
  deletePaymentAction,
  recordPaymentAction,
  type RecordPaymentState,
} from "@/app/(dashboard)/jobs/[jobId]/invoices/[invoiceId]/actions";
import {
  MANUAL_PAYMENT_METHODS,
  paymentMethodLabel,
  paymentReferenceLabel,
} from "@/lib/invoice/payment-methods";
import { formatMoney } from "@/lib/money";
import { SubmitButton } from "@/components/dashboard/submit-button";

export type PaymentRow = {
  id: string;
  amountCents: number;
  method: PaymentMethod;
  paidAt: string;
  reference: string | null;
  notes: string | null;
};

/**
 * Writing down money that arrived.
 *
 * The primary path in Canada, not a fallback — most of these invoices are
 * settled by e-transfer or a cheque handed over at the door, and a tool that
 * treats that as the awkward case sends a contractor back to a paper book.
 *
 * **The balance is the one cyan figure on this surface** (the Readout Rule):
 * what is still owed is the number somebody acts on. The total and the paid
 * figure sit beside it in ink, because they are context for it rather than
 * three competing readings.
 *
 * The form is open by default while there is a balance and folded away once
 * there isn't — the common visit to a settled invoice is to *look*, and a
 * payment form is a strange thing to be greeted by on an invoice that is done.
 * It is a real disclosure button, not a hover trick: it toggles `aria-expanded`
 * and the fields simply are not there until it is pressed.
 */
export function InvoicePayments({
  jobId,
  invoiceId,
  totalCents,
  paidCents,
  balanceCents,
  payments,
  canRecord,
  isVoid,
}: {
  jobId: string;
  invoiceId: string;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  payments: PaymentRow[];
  canRecord: boolean;
  isVoid: boolean;
}) {
  const [state, action] = useActionState<RecordPaymentState, FormData>(recordPaymentAction, {});
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.ETRANSFER);
  const [open, setOpen] = useState(balanceCents > 0);

  /**
   * Pressing "Record a payment" unmounts the button that was pressed. Without
   * this, a keyboard user's focus falls off the removed element and back to the
   * top of the document — they press enter and land nowhere, which is a
   * genuine failure of the disclosure and not a nicety. So focus follows the
   * disclosure into the first field it revealed.
   *
   * `openedByUser` is what keeps it from stealing focus on load, when the form
   * starts open because there is a balance. Nobody asked for it then.
   */
  const amountRef = useRef<HTMLInputElement>(null);
  const openedByUser = useRef(false);
  useEffect(() => {
    if (open && openedByUser.current) amountRef.current?.focus();
  }, [open]);

  const settled = balanceCents <= 0;

  return (
    <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
      <h3 className="text-lg font-semibold text-ink-primary">Money in</h3>

      <dl className="mt-4 space-y-2 border-b border-hairline pb-5">
        <Figure label="Invoiced" value={formatMoney(totalCents)} />
        <Figure label="Paid" value={formatMoney(paidCents)} />
        <div className="flex items-baseline justify-between gap-4 pt-1">
          <dt className="text-sm text-ink-secondary">
            {balanceCents < 0 ? "Overpaid by" : "Still owing"}
          </dt>
          <dd className="text-3xl font-semibold tabular-nums text-instrument-fg">
            {formatMoney(Math.abs(balanceCents))}
          </dd>
        </div>
      </dl>

      {balanceCents < 0 ? (
        <p className="mt-3 text-sm text-ink-secondary">
          They paid more than the invoice. Worth settling up before you close the job.
        </p>
      ) : null}

      {payments.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-hairline pb-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-sm text-ink-primary">
                  <span className="font-semibold tabular-nums">
                    {formatMoney(payment.amountCents)}
                  </span>{" "}
                  <span className="text-ink-secondary">
                    by {paymentMethodLabel(payment.method).toLowerCase()}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {payment.paidAt}
                  {payment.reference ? ` · ${payment.reference}` : ""}
                </p>
                {payment.notes ? (
                  <p className="mt-1 max-w-prose text-xs text-ink-muted">{payment.notes}</p>
                ) : null}
              </div>

              {canRecord ? (
                <form
                  action={deletePaymentAction}
                  onSubmit={(event) => {
                    if (
                      !window.confirm(
                        `Remove this ${formatMoney(payment.amountCents)} payment? Do this only if it was recorded by mistake — the balance goes back up.`
                      )
                    ) {
                      event.preventDefault();
                    }
                  }}
                >
                  <input type="hidden" name="jobId" value={jobId} />
                  <input type="hidden" name="invoiceId" value={invoiceId} />
                  <input type="hidden" name="paymentId" value={payment.id} />
                  <SubmitButton
                    pendingText="Removing…"
                    className="rounded-lg px-2 py-1 text-xs text-ink-muted underline underline-offset-4 transition hover:text-danger-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
                  >
                    Remove
                  </SubmitButton>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {isVoid ? (
        <p className="mt-5 text-sm text-ink-muted">
          This invoice was cancelled, so nothing can be paid against it.
        </p>
      ) : !canRecord ? (
        payments.length === 0 ? (
          <p className="mt-5 text-sm text-ink-muted">Nothing has come in yet.</p>
        ) : null
      ) : (
        <>
          {!open ? (
            <button
              type="button"
              onClick={() => {
                openedByUser.current = true;
                setOpen(true);
              }}
              aria-expanded={false}
              className="mt-5 rounded-xl border border-hairline px-4 py-2.5 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
            >
              {settled ? "Record another payment" : "Record a payment"}
            </button>
          ) : (
            <form action={action} className="mt-5 space-y-4">
              <input type="hidden" name="jobId" value={jobId} />
              <input type="hidden" name="invoiceId" value={invoiceId} />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="How much">
                  <input
                    ref={amountRef}
                    name="amount"
                    inputMode="decimal"
                    required
                    // Prefilled with what is owed, because "they paid the
                    // invoice" is what happens most of the time and retyping
                    // $8,475.00 to say so is work for nothing. Editable, since
                    // the deposit half is the other common case.
                    defaultValue={balanceCents > 0 ? (balanceCents / 100).toFixed(2) : ""}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </Field>

                <Field label="How">
                  <select
                    name="method"
                    value={method}
                    onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                    className={inputClass}
                  >
                    {MANUAL_PAYMENT_METHODS.map((value) => (
                      <option key={value} value={value}>
                        {paymentMethodLabel(value)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="When it came in" hint="Leave blank for today.">
                  <input type="date" name="paidAt" className={inputClass} />
                </Field>

                {/* The label follows the method — "Cheque number" is a question
                    somebody can answer without thinking; "Reference" is one
                    they have to interpret. */}
                <Field label={paymentReferenceLabel(method)} hint="Optional.">
                  <input name="reference" className={inputClass} />
                </Field>
              </div>

              <Field label="Note" hint="Optional — anything you'll want to remember.">
                <input name="notes" className={inputClass} />
              </Field>

              {state.error ? (
                <p role="alert" className="text-sm text-danger-fg">
                  {state.error}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <SubmitButton
                  pendingText="Recording…"
                  className="rounded-xl bg-ink-primary px-5 py-3 text-sm font-semibold text-ground transition hover:bg-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60"
                >
                  Record it
                </SubmitButton>
                {settled ? (
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-sm text-ink-muted underline underline-offset-4 transition hover:text-ink-primary"
                  >
                    Never mind
                  </button>
                ) : null}
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
}

const inputClass =
  "w-full rounded-xl border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-secondary">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-muted">{hint}</span> : null}
    </label>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-sm tabular-nums text-ink-secondary">{value}</dd>
    </div>
  );
}
