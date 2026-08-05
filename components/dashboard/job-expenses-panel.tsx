"use client";

import { useActionState, useState } from "react";
import type { JobExpenseCategory } from "@prisma/client";
import {
  addJobExpenseWithState,
  deleteJobExpenseAction,
  type JobExpenseFormState,
} from "@/app/(dashboard)/jobs/[jobId]/expense-actions";
import { formatMoney } from "@/lib/money";
import { JOB_EXPENSE_CATEGORY_OPTIONS, jobExpenseCategoryLabel } from "@/lib/format";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { fieldClass, errorAttrs, FieldError, FormError } from "@/components/dashboard/form-feedback";
import { DeletableItem } from "@/components/dashboard/deletable-item";

export type JobExpenseRow = {
  id: string;
  category: JobExpenseCategory;
  description: string | null;
  amountCents: number;
  hours: number | null;
  hourlyRateCents: number | null;
  incurredAt: string;
  loggedBy: string;
};

/**
 * `incurredAt` is stored as UTC midnight of the calendar day the `<input
 * type="date">` collected — no time of day was ever meant, same convention
 * `lib/schedule/day.ts` documents for an all-day visit. Formatting it in the
 * browser's local zone would roll it back a day for anyone west of UTC (the
 * live check caught exactly this: picking Aug 5 rendered back as Aug 4), so
 * this reads the UTC calendar parts back out rather than letting
 * `toLocaleDateString` reinterpret the instant in local time.
 */
function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/**
 * Item 46: what this job actually cost, against what it was quoted to cost.
 *
 * Read-only for anyone who can see money at all — the summary is `viewMoney`
 * tier, same as the quote figure in the rail above it. Logging or removing an
 * entry needs `manageJobCosts`, one tier narrower: a salesperson can *see* the
 * variance the same way they can see the quote's margin, but costing the job
 * after the fact is the estimator's and the office's business, not sales'.
 */
export function JobExpensesPanel({
  jobId,
  canManage,
  expenses,
  quotedCostCents,
  defaultLabourRateCents,
}: {
  jobId: string;
  canManage: boolean;
  expenses: JobExpenseRow[];
  quotedCostCents: number;
  defaultLabourRateCents: number | null;
}) {
  const [state, formAction] = useActionState<JobExpenseFormState, FormData>(
    addJobExpenseWithState,
    {}
  );
  const errors = state.fieldErrors ?? {};
  const [category, setCategory] = useState<string>("MATERIALS");

  const actualCostCents = expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const varianceCents = actualCostCents - quotedCostCents;

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-hairline bg-surface-raised p-6">
        <p className="text-sm uppercase tracking-[0.18em] text-ink-muted">Costs</p>
        <h3 className="mt-2 text-2xl font-semibold text-ink-primary">Quoted vs. actual</h3>
        <p className="mt-2 text-sm text-ink-muted">
          What this job was quoted to cost, against what it has actually cost so far.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-ground/50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">Quoted cost</p>
            <p className="mt-2 text-xl font-semibold tabular-nums text-ink-primary">
              {formatMoney(quotedCostCents)}
            </p>
          </div>
          <div className="rounded-2xl bg-ground/50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">Actual cost</p>
            <p className="mt-2 text-xl font-semibold tabular-nums text-ink-primary">
              {formatMoney(actualCostCents)}
            </p>
          </div>
          <div className="rounded-2xl bg-ground/50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">
              {varianceCents > 0 ? "Over quote" : varianceCents < 0 ? "Under quote" : "Variance"}
            </p>
            <p
              className={`mt-2 text-xl font-semibold tabular-nums ${
                varianceCents > 0 ? "text-danger-fg" : "text-ink-primary"
              }`}
            >
              {formatMoney(Math.abs(varianceCents))}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-hairline bg-surface-raised p-6">
        <h3 className="text-lg font-semibold text-ink-primary">Logged costs</h3>

        {expenses.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">Nothing logged against this job yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-hairline">
            {expenses.map((expense) => {
              const row = (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink-primary">
                      {jobExpenseCategoryLabel(expense.category)}
                      {expense.description ? ` — ${expense.description}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {formatDate(expense.incurredAt)} · {expense.loggedBy}
                      {expense.hours != null && expense.hourlyRateCents != null
                        ? ` · ${expense.hours} hr at ${formatMoney(expense.hourlyRateCents)}/hr`
                        : ""}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums text-ink-primary">
                    {formatMoney(expense.amountCents)}
                  </p>
                </div>
              );
              return (
                <li key={expense.id} className="py-3 first:pt-0 last:pb-0">
                  {canManage ? (
                    <DeletableItem
                      jobId={jobId}
                      itemId={expense.id}
                      idField="expenseId"
                      label={jobExpenseCategoryLabel(expense.category)}
                      deleteAction={deleteJobExpenseAction}
                    >
                      {row}
                    </DeletableItem>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {canManage ? (
        <div className="rounded-3xl border border-hairline bg-surface-raised p-6">
          <h3 className="text-lg font-semibold text-ink-primary">Log a cost</h3>

          <FormError message={state.formError} />

          <form action={formAction} className="mt-4 grid gap-4 md:grid-cols-2">
            <input type="hidden" name="jobId" value={jobId} />

            <div>
              <label htmlFor="expense-category" className="mb-2 block text-sm text-ink-secondary">
                Category
              </label>
              <select
                id="expense-category"
                name="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className={fieldClass(errors.category)}
              >
                {JOB_EXPENSE_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FieldError fieldId="expense-category" message={errors.category} />
            </div>

            <div>
              <label htmlFor="expense-date" className="mb-2 block text-sm text-ink-secondary">
                Date
              </label>
              <input
                id="expense-date"
                name="incurredAt"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className={fieldClass()}
              />
            </div>

            {category === "LABOUR" ? (
              <>
                <div>
                  <label htmlFor="expense-hours" className="mb-2 block text-sm text-ink-secondary">
                    Hours worked
                  </label>
                  <input
                    id="expense-hours"
                    name="hours"
                    type="number"
                    step="0.25"
                    min="0"
                    placeholder="6"
                    className={fieldClass(errors.hours)}
                    {...errorAttrs("expense-hours", errors.hours)}
                  />
                  <FieldError fieldId="expense-hours" message={errors.hours} />
                </div>
                <div>
                  <label htmlFor="expense-rate" className="mb-2 block text-sm text-ink-secondary">
                    Hourly rate
                  </label>
                  <input
                    id="expense-rate"
                    name="hourlyRate"
                    type="text"
                    inputMode="decimal"
                    placeholder="$45.00"
                    defaultValue={
                      defaultLabourRateCents != null ? formatMoney(defaultLabourRateCents) : ""
                    }
                    className={fieldClass(errors.hourlyRate)}
                    {...errorAttrs("expense-rate", errors.hourlyRate)}
                  />
                  <FieldError fieldId="expense-rate" message={errors.hourlyRate} />
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="expense-amount" className="mb-2 block text-sm text-ink-secondary">
                  Amount
                </label>
                <input
                  id="expense-amount"
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="$120.00"
                  className={fieldClass(errors.amount)}
                  {...errorAttrs("expense-amount", errors.amount)}
                />
                <FieldError fieldId="expense-amount" message={errors.amount} />
              </div>
            )}

            <div className="md:col-span-2">
              <label htmlFor="expense-description" className="mb-2 block text-sm text-ink-secondary">
                Description (optional)
              </label>
              <input
                id="expense-description"
                name="description"
                type="text"
                placeholder="Shingle bundle from the supply yard"
                className={fieldClass()}
              />
            </div>

            <div className="md:col-span-2">
              <SubmitButton
                pendingText="Logging…"
                className="rounded-xl border border-hairline bg-surface-raised px-5 py-3 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-instrument disabled:opacity-40"
              >
                Log cost
              </SubmitButton>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
