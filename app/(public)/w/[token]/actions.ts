"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { ActivityKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { isWellFormedShareToken } from "@/lib/share-token";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function callerIp(): Promise<string | null> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || list.get("x-real-ip") || null;
}

/**
 * Mark the warranty seen, the first time it's opened — same "only the
 * first view counts" reasoning as `markChangeOrderViewed`/`markQuoteViewed`.
 * Scoped to `status: "SENT"` specifically so this can never walk a
 * `CONFIRMED` (or already-`VIEWED`) row backwards — the exact rule §20
 * asks for: record `viewedAt` only if doing so doesn't overwrite a later
 * status.
 */
export async function markWarrantyViewed(token: string): Promise<void> {
  if (!isWellFormedShareToken(token)) return;

  await prisma.warranty.updateMany({
    where: { shareToken: token, viewedAt: null, status: "SENT" },
    data: { viewedAt: new Date(), status: "VIEWED" },
  });
}

export type ConfirmWarrantyState = { error?: string; confirmedAt?: number };

/**
 * The homeowner's one action — not approval, not acceptance, just
 * "I received and looked at this." Same evidence shape `Quote`'s own
 * `acceptedByName`/`acceptedIp` already sets as this codebase's bar for
 * "the homeowner did a thing," and the same "answered once, stays
 * answered" idempotency `approveChangeOrderAction` uses: confirming twice
 * is a double-click, not a second decision, so no second activity event
 * is ever recorded for the same warranty.
 */
export async function confirmWarrantyAction(
  _prevState: ConfirmWarrantyState,
  formData: FormData
): Promise<ConfirmWarrantyState> {
  const token = getString(formData, "token");
  const checked = formData.get("confirmationChecked") === "on";
  const name = getString(formData, "signerName");

  if (!isWellFormedShareToken(token)) throw new Error("This warranty is no longer available.");

  const warranty = await prisma.warranty.findFirst({ where: { shareToken: token } });
  if (!warranty) throw new Error("This warranty is no longer available.");

  // Already confirmed. A second submit (double-tap, back button) is not a
  // second decision — same doctrine `approveChangeOrderAction` follows.
  if (warranty.status === "CONFIRMED") return { confirmedAt: warranty.confirmedAt?.getTime() };

  if (!checked) return { error: "Check the box to confirm you received this." };
  if (!name) return { error: "Type your name to confirm." };

  await prisma.warranty.update({
    where: { id: warranty.id },
    data: {
      confirmationChecked: true,
      signerName: name,
      confirmedAt: new Date(),
      signerIp: await callerIp(),
      status: "CONFIRMED",
    },
  });

  await recordActivity({
    companyId: warranty.companyId,
    jobId: warranty.jobId,
    kind: ActivityKind.WARRANTY_CONFIRMED,
    actorLabel: name,
    meta: { warrantyId: warranty.id, warrantyVersion: warranty.version },
  });

  revalidatePath(`/w/${token}`);
  revalidatePath(`/jobs/${warranty.jobId}`);
  return { confirmedAt: Date.now() };
}
