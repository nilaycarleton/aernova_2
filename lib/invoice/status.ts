import { InvoiceStatus } from "@prisma/client";
import type { StatusTone } from "@/lib/status-tone";

/**
 * What an invoice's standing is called out loud.
 *
 * The rule `lib/job-status.ts` and `lib/quote-status.ts` both enforce: a
 * database enum never reaches a screen. `SENT` is the wrong word again for the
 * same reason it was wrong on a quote — the contractor knows they sent it; what
 * they want to know is that **nobody has paid**.
 *
 * Where this differs from the quote vocabulary: `OVERDUE` gets a hue, and it is
 * the only status in this product that gets the danger one. Everything else on
 * these screens is a state; late money is a thing to do today.
 */
export const INVOICE_STATUS_FLOW: InvoiceStatus[] = [
  InvoiceStatus.DRAFT,
  InvoiceStatus.SENT,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
  InvoiceStatus.PAID,
  InvoiceStatus.VOID,
];

/** Sent, not settled — the money a contractor is actually waiting on. */
export const UNPAID: InvoiceStatus[] = [
  InvoiceStatus.SENT,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
];

type InvoiceStatusMeta = {
  label: string;
  /** What it means, in the words a roofer would use. */
  hint: string;
};

export const INVOICE_STATUS_META: Record<InvoiceStatus, InvoiceStatusMeta> = {
  DRAFT: {
    label: "Draft",
    hint: "Not sent. Nobody has been asked for this money yet.",
  },
  SENT: {
    label: "Awaiting payment",
    hint: "Sent. Nothing has come in against it.",
  },
  PARTIALLY_PAID: {
    label: "Part paid",
    hint: "Some of it has come in. The rest is still owed.",
  },
  OVERDUE: {
    label: "Overdue",
    hint: "Past its due date and still owing. Worth a call.",
  },
  PAID: {
    label: "Paid",
    hint: "Settled in full. Nothing to chase.",
  },
  VOID: {
    label: "Cancelled",
    hint: "Written off. It stays on the record rather than disappearing.",
  },
};

export function invoiceStatusLabel(status: InvoiceStatus): string {
  return INVOICE_STATUS_META[status]?.label ?? "Draft";
}

/**
 * Status-consolidation adapter (Premium UI Redesign final completion pass) —
 * feeds the shared `Status` primitive instead of each call site hand-rolling
 * its own badge pill. OVERDUE is the one danger status in this product
 * (per this file's own header note); PAID is success; everything else reads
 * as an ordinary neutral state, matching the old badge strings' grouping.
 */
export function invoiceStatusTone(status: InvoiceStatus): StatusTone {
  if (status === InvoiceStatus.OVERDUE) return "danger";
  if (status === InvoiceStatus.PAID) return "success";
  return "neutral";
}
