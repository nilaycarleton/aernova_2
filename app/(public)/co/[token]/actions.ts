"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { ActivityKind, ChangeOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { isWellFormedShareToken } from "@/lib/share-token";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/**
 * The homeowner's one action on a change order.
 *
 * No public "decline" door, same reasoning `Quote`'s own REJECTED status
 * uses: item 42 deliberately kept that the roofer's call, not a button a
 * homeowner clicks, and a change order's DECLINED status follows the same
 * doctrine — see `markChangeOrderDeclinedAction`.
 */
async function changeOrderForToken(token: string) {
  if (!isWellFormedShareToken(token)) return null;
  return prisma.changeOrder.findFirst({
    where: { shareToken: token },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });
}

async function callerIp(): Promise<string | null> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || list.get("x-real-ip") || null;
}

export async function approveChangeOrderAction(formData: FormData) {
  const token = getString(formData, "token");
  const name = getString(formData, "name");

  const changeOrder = await changeOrderForToken(token);
  if (!changeOrder) throw new Error("This change order is no longer available.");

  // Already answered. Approving twice is a double-click, not a second decision.
  if (changeOrder.status === ChangeOrderStatus.APPROVED) return;
  if (changeOrder.status === ChangeOrderStatus.DECLINED) return;

  await prisma.changeOrder.update({
    where: { id: changeOrder.id },
    data: {
      status: ChangeOrderStatus.APPROVED,
      approvedAt: new Date(),
      approvedByName: name || null,
      approvedIp: await callerIp(),
    },
  });

  await recordActivity({
    companyId: changeOrder.companyId,
    jobId: changeOrder.jobId,
    kind: ActivityKind.CHANGE_ORDER_APPROVED,
    actorLabel: name || "The client",
    meta: { changeOrderId: changeOrder.id, amountCents: changeOrder.amountCents },
  });

  revalidatePath(`/co/${token}`);
}

/**
 * Mark the change order seen, the first time it's opened — same "only the
 * first view counts" reasoning as `markQuoteViewed`.
 */
export async function markChangeOrderViewed(token: string): Promise<void> {
  if (!isWellFormedShareToken(token)) return;

  const updated = await prisma.changeOrder.updateMany({
    where: { shareToken: token, viewedAt: null, status: ChangeOrderStatus.SENT },
    data: { viewedAt: new Date() },
  });
  if (updated.count === 0) return;
}
