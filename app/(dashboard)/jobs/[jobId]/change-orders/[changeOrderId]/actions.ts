"use server";

import { revalidatePath } from "next/cache";
import { ActivityKind, ChangeOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireJobAccess } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { generateShareToken } from "@/lib/share-token";
import { changeOrderLineTotalCents, changeOrderTotalCents } from "@/lib/change-order";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

type IncomingLine = {
  id?: string;
  name?: string;
  description?: string | null;
  quantity?: number;
  unit?: string;
  unitCostCents?: number | null;
  unitPriceCents?: number;
};

function revalidateChangeOrder(jobId: string, changeOrderId: string) {
  revalidatePath(`/jobs/${jobId}/change-orders/${changeOrderId}`);
  revalidatePath(`/jobs/${jobId}`);
}

export type SaveChangeOrderState = { error?: string; savedAt?: number };

/**
 * The whole document, saved at once — same "one Save, one consistent total,
 * recomputed server-side" doctrine as `saveQuoteAction`, without the
 * tax/discount/deposit machinery a change order doesn't have (§14.2).
 *
 * Frozen once `APPROVED`, same reasoning `Quote` itself uses post-approval:
 * money that's already been agreed to shouldn't silently change under it.
 */
export async function saveChangeOrderAction(
  _prevState: SaveChangeOrderState,
  formData: FormData
): Promise<SaveChangeOrderState> {
  const jobId = getString(formData, "jobId");
  const changeOrderId = getString(formData, "changeOrderId");
  if (!jobId || !changeOrderId) throw new Error("Missing jobId or changeOrderId");

  const { companyId } = await requireJobAccess(jobId, "editQuote");

  const existing = await prisma.changeOrder.findFirst({
    where: { id: changeOrderId, jobId, companyId },
    select: { id: true, status: true },
  });
  if (!existing) throw new Error("Change order not found");
  if (existing.status === ChangeOrderStatus.APPROVED) {
    return { error: "This change order has been approved and can't be edited." };
  }

  const title = getString(formData, "title");
  if (!title) return { error: "Give the change order a title before saving." };
  const description = getString(formData, "description") || null;

  let lines: IncomingLine[];
  try {
    lines = JSON.parse(getString(formData, "lines") || "[]");
  } catch {
    return { error: "Something went wrong reading the line items. Nothing was saved." };
  }
  if (!Array.isArray(lines)) {
    return { error: "Something went wrong reading the line items. Nothing was saved." };
  }

  const normalized = lines.map((line, index) => {
    const quantity = Number.isFinite(line.quantity) ? Math.max(0, Number(line.quantity)) : 1;
    const unitPriceCents = Number.isFinite(line.unitPriceCents)
      ? Math.max(0, Math.round(Number(line.unitPriceCents)))
      : 0;
    const unitCostCents =
      line.unitCostCents == null || !Number.isFinite(line.unitCostCents)
        ? null
        : Math.max(0, Math.round(Number(line.unitCostCents)));

    return {
      id: line.id,
      name: (line.name ?? "").trim(),
      description: line.description?.trim() || null,
      quantity,
      unit: (line.unit ?? "each").trim() || "each",
      unitCostCents,
      unitPriceCents,
      amountCents: changeOrderLineTotalCents({ quantity, unitPriceCents }),
      sortOrder: index,
    };
  });

  const amountCents = changeOrderTotalCents(normalized);
  const keptIds = normalized.map((line) => line.id).filter(Boolean) as string[];

  await prisma.$transaction([
    prisma.changeOrderLineItem.deleteMany({
      where: { changeOrderId, ...(keptIds.length > 0 ? { id: { notIn: keptIds } } : {}) },
    }),
    ...normalized.map((line) =>
      line.id
        ? prisma.changeOrderLineItem.update({ where: { id: line.id }, data: { ...line, id: undefined } })
        : prisma.changeOrderLineItem.create({ data: { ...line, id: undefined, changeOrderId } })
    ),
    prisma.changeOrder.update({
      where: { id: changeOrderId },
      data: { title, description, amountCents },
    }),
  ]);

  revalidateChangeOrder(jobId, changeOrderId);
  return { savedAt: Date.now() };
}

/**
 * Open the change order to the homeowner. Same two-doors-one-token shape
 * `shareQuoteAction` established — the token is minted once and kept, so a
 * re-send never invalidates the link already sitting in an inbox. No
 * `ActivityKind` is recorded here: §13 scopes change-order timeline events
 * to CREATED and APPROVED only, unlike Quote's own SENT/VIEWED pair.
 */
export async function shareChangeOrderAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const changeOrderId = getString(formData, "changeOrderId");
  if (!jobId || !changeOrderId) throw new Error("Missing jobId or changeOrderId");

  const { companyId } = await requireJobAccess(jobId, "sendQuote");

  const changeOrder = await prisma.changeOrder.findFirst({
    where: { id: changeOrderId, jobId, companyId },
    select: { id: true, shareToken: true, status: true },
  });
  if (!changeOrder) throw new Error("Change order not found");

  const shareToken = changeOrder.shareToken ?? generateShareToken();

  await prisma.changeOrder.update({
    where: { id: changeOrder.id },
    data: {
      shareToken,
      sentAt: new Date(),
      status: changeOrder.status === ChangeOrderStatus.DRAFT ? ChangeOrderStatus.SENT : changeOrder.status,
    },
  });

  revalidateChangeOrder(jobId, changeOrderId);
}

/** Close the door again. The old link stops working. */
export async function unshareChangeOrderAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const changeOrderId = getString(formData, "changeOrderId");
  if (!jobId || !changeOrderId) throw new Error("Missing jobId or changeOrderId");

  const { companyId } = await requireJobAccess(jobId, "sendQuote");

  await prisma.changeOrder.updateMany({
    where: { id: changeOrderId, companyId, status: { not: ChangeOrderStatus.APPROVED } },
    data: { shareToken: null, status: ChangeOrderStatus.DRAFT },
  });

  revalidateChangeOrder(jobId, changeOrderId);
}

/**
 * They said yes on the phone — same "recorded, not clicked" shape as
 * `markQuoteApprovedAction`, including the same refusal to overwrite an
 * answer that already came in.
 */
export async function markChangeOrderApprovedAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const changeOrderId = getString(formData, "changeOrderId");
  if (!jobId || !changeOrderId) throw new Error("Missing jobId or changeOrderId");

  const { companyId, userId } = await requireJobAccess(jobId, "sendQuote");

  const changeOrder = await prisma.changeOrder.findFirst({
    where: { id: changeOrderId, jobId, companyId },
    select: { id: true, status: true, amountCents: true },
  });
  if (!changeOrder) throw new Error("Change order not found");
  if (changeOrder.status === ChangeOrderStatus.APPROVED || changeOrder.status === ChangeOrderStatus.DECLINED) {
    return;
  }

  await prisma.changeOrder.update({
    where: { id: changeOrder.id },
    data: { status: ChangeOrderStatus.APPROVED, approvedAt: new Date(), approvedByUserId: userId },
  });

  await recordActivity({
    companyId,
    jobId,
    kind: ActivityKind.CHANGE_ORDER_APPROVED,
    actorUserId: userId,
    meta: { changeOrderId: changeOrder.id, amountCents: changeOrder.amountCents, recordedByHand: true },
  });

  revalidateChangeOrder(jobId, changeOrderId);
}

/** The other answer — same shape as decline on a quote, office-recorded only. */
export async function markChangeOrderDeclinedAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const changeOrderId = getString(formData, "changeOrderId");
  if (!jobId || !changeOrderId) throw new Error("Missing jobId or changeOrderId");

  const { companyId } = await requireJobAccess(jobId, "sendQuote");

  const changeOrder = await prisma.changeOrder.findFirst({
    where: { id: changeOrderId, jobId, companyId },
    select: { id: true, status: true },
  });
  if (!changeOrder) throw new Error("Change order not found");
  if (changeOrder.status === ChangeOrderStatus.APPROVED || changeOrder.status === ChangeOrderStatus.DECLINED) {
    return;
  }

  await prisma.changeOrder.update({
    where: { id: changeOrder.id },
    data: { status: ChangeOrderStatus.DECLINED, declinedAt: new Date() },
  });

  revalidateChangeOrder(jobId, changeOrderId);
}
