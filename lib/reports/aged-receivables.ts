/**
 * Item 47: how much is owed, and how late it is. Built on `lib/invoice/
 * balance.ts` rather than re-deriving overdue-ness — that file already knows
 * a draft is never late and a payment can leave a balance negative, and this
 * one would only get it wrong a second way.
 *
 * Callers are expected to have already excluded DRAFT and VOID invoices (the
 * same filter `/reports/revenue` applies) — a draft nobody has sent yet is
 * not a receivable, it is unfinished paperwork, and this file has no way to
 * tell the two apart on its own from an already-filtered row.
 */
import { invoiceBalance, type PaymentForBalance } from "../invoice/balance.ts";
import type { InvoiceStatus } from "@prisma/client";
import type { Cents } from "../money.ts";

export type AgingBucketKey = "current" | "0-30" | "31-60" | "60+";

export const AGING_BUCKETS: { key: AgingBucketKey; label: string }[] = [
  { key: "current", label: "Not yet due" },
  { key: "0-30", label: "1–30 days overdue" },
  { key: "31-60", label: "31–60 days overdue" },
  { key: "60+", label: "60+ days overdue" },
];

export type InvoiceForAging = {
  totalAmountCents: number;
  payments: PaymentForBalance[];
  status: InvoiceStatus;
  dueAt: Date | null;
};

export type AgingRow = { key: AgingBucketKey; label: string; cents: Cents; count: number };

function bucketFor(overdueDays: number | null): AgingBucketKey {
  if (overdueDays == null) return "current";
  if (overdueDays <= 30) return "0-30";
  if (overdueDays <= 60) return "31-60";
  return "60+";
}

export function agedReceivables(
  invoices: InvoiceForAging[],
  now: Date = new Date()
): { rows: AgingRow[]; totalCents: Cents } {
  const totals = new Map<AgingBucketKey, { cents: number; count: number }>(
    AGING_BUCKETS.map((bucket) => [bucket.key, { cents: 0, count: 0 }])
  );
  let totalCents = 0;

  for (const invoice of invoices) {
    const balance = invoiceBalance(invoice.totalAmountCents, invoice.payments, {
      status: invoice.status,
      dueAt: invoice.dueAt,
      now,
    });
    // Paid, or overpaid into a credit — nothing left to chase, so nothing to age.
    if (balance.balanceCents <= 0) continue;

    const key = bucketFor(balance.overdueDays);
    const bucket = totals.get(key)!;
    bucket.cents += balance.balanceCents;
    bucket.count += 1;
    totalCents += balance.balanceCents;
  }

  const rows = AGING_BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    ...totals.get(bucket.key)!,
  }));

  return { rows, totalCents };
}
