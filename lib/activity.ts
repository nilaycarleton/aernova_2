import { ActivityKind, type ActivityEvent } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { jobExpenseCategoryLabel } from "@/lib/format";

/**
 * The job's history. Every phase of the CRM work appends here; the job
 * timeline and the client detail page read it back.
 */

export type ActivityMeta = {
  /** STATUS_CHANGED */
  from?: string;
  to?: string;
  /** QUOTE_* — which quote, and what it was worth at the time. */
  quoteId?: string;
  quoteNumber?: number;
  amountCents?: number;
  /**
   * QUOTE_APPROVED — the optional extras the homeowner ticked for themselves,
   * by name. Recorded because the total they approved can be larger than the
   * total that was sent, and "why is this $800 more than I quoted" deserves an
   * answer that does not require diffing two documents.
   */
  extras?: string[];
  /**
   * QUOTE_APPROVED — a team member recorded the yes rather than the homeowner
   * clicking it. The timeline says so, because "approved" and "we were told
   * it was approved" are different facts and only one of them has evidence.
   */
  recordedByHand?: boolean;
  /** QUOTE_CHANGES_REQUESTED — what the homeowner asked for. */
  message?: string;
  /** QUOTE_SENT / INVOICE_SENT — which door it went out: a link, or an email. */
  channel?: "link" | "email";
  /** INVOICE_* / PAYMENT_RECORDED — which invoice, and what it was worth. */
  invoiceId?: string;
  invoiceNumber?: number;
  /**
   * PAYMENT_RECORDED — how the money came in, already in the words a person
   * says ("e-Transfer", "Cheque"). Resolved by the caller through
   * `paymentMethodLabel` rather than stored raw, for the same reason every
   * other enum is: a timeline is a screen, and `CARD_OFFLINE` is not a sentence.
   */
  method?: string;
  /** PAYMENT_RECORDED — what is still owed after it, so the line reads on its own. */
  balanceCents?: number;
  /** QUOTE_DECLINED — why, in the closed set the win-rate view (item 42) groups by. */
  reason?: string;
  /** QUOTE_DECLINED — whatever's worth remembering beyond the reason code. */
  note?: string;
  /** JOB_EXPENSE_LOGGED — MATERIALS / LABOUR / EQUIPMENT / OTHER, already in the words a roofer uses. */
  category?: string;
};

export async function recordActivity(input: {
  companyId: string;
  jobId?: string | null;
  kind: ActivityKind;
  actorUserId?: string | null;
  actorLabel?: string | null;
  meta?: ActivityMeta;
}): Promise<void> {
  try {
    await prisma.activityEvent.create({
      data: {
        companyId: input.companyId,
        jobId: input.jobId ?? null,
        kind: input.kind,
        actorUserId: input.actorUserId ?? null,
        actorLabel: input.actorLabel ?? null,
        metaJson: input.meta ? (input.meta as object) : undefined,
      },
    });
  } catch (error) {
    // A history row is never worth failing the thing that produced it. If a
    // homeowner approves a quote and the timeline write fails, the approval must
    // still stand — losing the audit line is recoverable, losing the approval is
    // not. Reported, not thrown.
    console.error("[activity] failed to record", input.kind, error);
  }
}

/**
 * The timeline sentence, in the words a roofer would use. Enum names never reach
 * a screen — same rule `lib/format.ts` enforces for every other enum.
 *
 * `actor` is resolved by the caller (a team member's name, or the homeowner's
 * typed name from `actorLabel`), since only the caller knows the User rows.
 */
/** "the gutter guards", "the gutter guards and the skylight flashing". */
function listSentence(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function describeActivity(
  event: Pick<ActivityEvent, "kind" | "actorLabel" | "metaJson">,
  actor?: string | null
): string {
  const meta = (event.metaJson ?? {}) as ActivityMeta;
  const who = actor ?? event.actorLabel ?? null;
  const quote = meta.quoteNumber ? `Quote #${meta.quoteNumber}` : "The quote";
  const invoice = meta.invoiceNumber ? `Invoice #${meta.invoiceNumber}` : "The invoice";
  const amount = meta.amountCents != null ? ` for ${formatMoney(meta.amountCents)}` : "";

  switch (event.kind) {
    case ActivityKind.PROJECT_CREATED:
      return who ? `${who} created this job` : "Job created";
    case ActivityKind.STATUS_CHANGED:
      return meta.to ? `Moved to ${meta.to.toLowerCase()}` : "Stage changed";
    case ActivityKind.REQUEST_CREATED:
      return who ? `${who} logged a new request` : "A new request came in";
    case ActivityKind.REQUEST_CONVERTED:
      return who ? `${who} turned this request into a job` : "Request turned into a job";
    case ActivityKind.INVOICE_REMINDER_SENT:
      return `A reminder went out for ${invoice.toLowerCase()}${amount}`;
    case ActivityKind.QUOTE_REMINDER_SENT:
      return `A reminder went out for ${quote.toLowerCase()}${amount}`;
    case ActivityKind.QUOTE_CREATED:
      return `${quote} was built${amount}`;
    case ActivityKind.QUOTE_SENT:
      return who ? `${who} sent ${quote.toLowerCase()}${amount}` : `${quote} was sent${amount}`;
    case ActivityKind.QUOTE_VIEWED:
      return who ? `${who} opened ${quote.toLowerCase()}` : `${quote} was opened`;
    case ActivityKind.QUOTE_APPROVED: {
      const extras = meta.extras?.length ? `, and added ${listSentence(meta.extras)}` : "";
      if (meta.recordedByHand) {
        return who
          ? `${who} marked ${quote.toLowerCase()} approved${amount}`
          : `${quote} was marked approved${amount}`;
      }
      return who
        ? `${who} approved ${quote.toLowerCase()}${amount}${extras}`
        : `${quote} was approved${amount}${extras}`;
    }
    case ActivityKind.QUOTE_CHANGES_REQUESTED:
      return who ? `${who} asked for changes` : "Changes were requested";
    case ActivityKind.QUOTE_DECLINED:
      return who ? `${who} declined ${quote.toLowerCase()}` : `${quote} was declined`;
    case ActivityKind.QUOTE_EXPIRED:
      return `${quote} expired`;
    case ActivityKind.INVOICE_CREATED:
      return `${invoice} was raised${amount}`;
    case ActivityKind.INVOICE_SENT:
      return who
        ? `${who} sent ${invoice.toLowerCase()}${amount}`
        : `${invoice} was sent${amount}`;
    case ActivityKind.INVOICE_VIEWED:
      return who ? `${who} opened ${invoice.toLowerCase()}` : `${invoice} was opened`;
    case ActivityKind.PAYMENT_RECORDED: {
      const how = meta.method ? ` by ${meta.method.toLowerCase()}` : "";
      // The balance is the half of this line somebody actually acts on. It is
      // said only while there is one — "$0.00 still owing" is not a sentence a
      // contractor needs, and INVOICE_PAID lands beside it to say the same
      // thing properly.
      const left =
        meta.balanceCents != null && meta.balanceCents > 0
          ? `, ${formatMoney(meta.balanceCents)} still owing`
          : "";
      return `${formatMoney(meta.amountCents ?? 0)} came in${how} on ${invoice.toLowerCase()}${left}`;
    }
    case ActivityKind.INVOICE_PAID:
      return `${invoice} was paid in full${amount}`;
    case ActivityKind.INVOICE_VOIDED:
      return who ? `${who} cancelled ${invoice.toLowerCase()}` : `${invoice} was cancelled`;
    case ActivityKind.NOTE_ADDED:
      return who ? `${who} added a note` : "Note added";
    case ActivityKind.REVIEW_REQUESTED:
      return who ? `${who} asked for a review` : "Asked for a review";
    case ActivityKind.JOB_EXPENSE_LOGGED: {
      const category = meta.category ? jobExpenseCategoryLabel(meta.category).toLowerCase() : "a cost";
      return who
        ? `${who} logged ${category}${amount}`
        : `Logged ${category}${amount}`;
    }
    default:
      return "Something happened";
  }
}
