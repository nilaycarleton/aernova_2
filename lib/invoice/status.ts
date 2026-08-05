import { InvoiceStatus } from "@prisma/client";

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

// Tone, not colour — the Readout Rule keeps cyan for numbers.
const NEUTRAL = "text-ink-secondary bg-surface-lifted";
const QUIET = "text-ink-muted bg-surface-lifted";

type InvoiceStatusMeta = {
  label: string;
  /** What it means, in the words a roofer would use. */
  hint: string;
  badge: string;
};

export const INVOICE_STATUS_META: Record<InvoiceStatus, InvoiceStatusMeta> = {
  DRAFT: {
    label: "Draft",
    hint: "Not sent. Nobody has been asked for this money yet.",
    badge: QUIET,
  },
  SENT: {
    label: "Awaiting payment",
    hint: "Sent. Nothing has come in against it.",
    badge: NEUTRAL,
  },
  PARTIALLY_PAID: {
    label: "Part paid",
    hint: "Some of it has come in. The rest is still owed.",
    badge: NEUTRAL,
  },
  OVERDUE: {
    label: "Overdue",
    hint: "Past its due date and still owing. Worth a call.",
    badge: "text-danger-fg bg-danger/10",
  },
  PAID: {
    label: "Paid",
    hint: "Settled in full. Nothing to chase.",
    badge: "text-confirm-fg bg-confirm/10",
  },
  VOID: {
    label: "Cancelled",
    hint: "Written off. It stays on the record rather than disappearing.",
    badge: QUIET,
  },
};

export function invoiceStatusLabel(status: InvoiceStatus): string {
  return INVOICE_STATUS_META[status]?.label ?? "Draft";
}
