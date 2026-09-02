"use server";

import { revalidatePath } from "next/cache";
import { ActivityKind, InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { isWellFormedShareToken } from "@/lib/share-token";

/**
 * They opened it.
 *
 * `status: SENT` in the WHERE rather than just `viewedAt: null` — the same
 * guard `markQuoteViewed` carries, for the same reason: a homeowner who pays
 * and then re-opens the link to check must not have that fact overwritten by
 * the act of reading it again. Only an invoice sitting in "awaiting payment"
 * has anywhere to move.
 *
 * There is no matching status for "part paid and viewed again", and there does
 * not need to be. The question this answers is only ever asked once — *have
 * they even seen it* — and it is asked on the day the contractor is deciding
 * whether to chase the link or chase the money.
 *
 * Takes the token, not an id — this is an exported "use server" action, so
 * Next exposes it as a directly-callable endpoint regardless of how the page
 * happens to invoke it internally. The token is the only credential a public
 * caller actually holds; trusting a bare id let anyone who knew or guessed
 * one flip another company's invoice to "viewed" from outside the page.
 */
export async function markInvoiceViewed(token: string): Promise<void> {
  if (!isWellFormedShareToken(token)) return;

  const updated = await prisma.invoice.updateMany({
    where: { shareToken: token, viewedAt: null, status: InvoiceStatus.SENT },
    data: { viewedAt: new Date() },
  });
  if (updated.count === 0) return;

  const invoice = await prisma.invoice.findFirst({
    where: { shareToken: token },
    select: { id: true, companyId: true, jobId: true, invoiceNumber: true },
  });
  if (!invoice) return;

  await recordActivity({
    companyId: invoice.companyId,
    jobId: invoice.jobId,
    kind: ActivityKind.INVOICE_VIEWED,
    actorLabel: "The client",
    meta: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber ?? undefined },
  });
}

/**
 * §19.2's homeowner review, completed — the one click a review-pending
 * Additional Work invoice needs before it can reach SENT. Unlike a quote's
 * Approve, there's nothing to agree to here beyond "I've looked at this" —
 * see `ChangeOrderApproval`'s own reasoning for the same kind of
 * lighter-weight, non-negotiable confirmation.
 */
export async function confirmAdditionalWorkReviewAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "").trim();
  if (!isWellFormedShareToken(token)) throw new Error("This invoice is no longer available.");

  const invoice = await prisma.invoice.findFirst({
    where: { shareToken: token },
    select: {
      id: true,
      companyId: true,
      jobId: true,
      invoiceNumber: true,
      totalAmountCents: true,
      status: true,
      requiresHomeownerReview: true,
      homeownerReviewConfirmedAt: true,
    },
  });
  if (!invoice) throw new Error("This invoice is no longer available.");
  // Doesn't need a review, or already confirmed. A second click is a
  // double-click, not a second decision — same doctrine as approving a
  // quote twice.
  if (!invoice.requiresHomeownerReview || invoice.homeownerReviewConfirmedAt) return;

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      homeownerReviewConfirmedAt: new Date(),
      status: invoice.status === InvoiceStatus.DRAFT ? InvoiceStatus.SENT : invoice.status,
    },
  });

  await recordActivity({
    companyId: invoice.companyId,
    jobId: invoice.jobId,
    kind: ActivityKind.ADDITIONAL_WORK_HOMEOWNER_CONFIRMED,
    actorLabel: "The client",
    meta: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber ?? undefined,
      amountCents: invoice.totalAmountCents,
    },
  });

  revalidatePath(`/i/${token}`);
}
