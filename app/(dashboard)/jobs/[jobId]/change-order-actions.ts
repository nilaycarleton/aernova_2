"use server";

import { redirect } from "next/navigation";
import { ActivityKind, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireJobAccess } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";

/**
 * A change order with nothing in it yet, against a job's approved quote.
 *
 * §19.1's rule, enforced here rather than left to the UI: a change order
 * only exists against an *approved* quote — `ChangeOrder.quoteId` is a
 * required foreign key precisely because there is nothing else it could
 * mean. A job with no approved quote uses Additional Work instead (see
 * `additional-work-actions.ts`), which needs no quote at all.
 */
export async function createChangeOrderAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "").trim();
  const quoteId = String(formData.get("quoteId") ?? "").trim();
  if (!jobId || !quoteId) throw new Error("Missing jobId or quoteId");

  const { companyId, userId } = await requireJobAccess(jobId, "editQuote");

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, jobId, companyId },
    select: { id: true, status: true, title: true },
  });
  if (!quote) throw new Error("Quote not found");
  if (quote.status !== QuoteStatus.APPROVED) {
    throw new Error("Change orders can only be created against an approved quote.");
  }

  const changeOrder = await prisma.changeOrder.create({
    data: {
      companyId,
      jobId,
      quoteId,
      title: `${quote.title} — Change Order`,
      status: "DRAFT",
      amountCents: 0,
      createdByUserId: userId,
    },
  });

  await recordActivity({
    companyId,
    jobId,
    kind: ActivityKind.CHANGE_ORDER_CREATED,
    actorUserId: userId,
    meta: { changeOrderId: changeOrder.id, amountCents: 0 },
  });

  redirect(`/jobs/${jobId}/change-orders/${changeOrder.id}`);
}
