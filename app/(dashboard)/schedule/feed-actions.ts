"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth";
import { generateShareToken } from "@/lib/share-token";

/**
 * Mint the calendar link, or turn it off.
 *
 * Minted on demand rather than for every company at signup: a token that
 * exists is a URL that works, and there is no reason for one to exist before
 * somebody has asked for it.
 */
export async function createCalendarFeedAction() {
  const { company } = await requireCapability("viewAllJobs");
  if (company.calendarToken) return;

  await prisma.company.update({
    where: { id: company.id },
    data: { calendarToken: generateShareToken() },
  });

  revalidatePath("/schedule");
}

/**
 * Revoke it.
 *
 * Every subscription dies at once, including the one on a phone belonging to
 * somebody who has left — which is the reason this button exists. The next
 * link minted is a different one, so the old URL never comes back to life.
 */
export async function revokeCalendarFeedAction() {
  const { company } = await requireCapability("viewAllJobs");

  await prisma.company.update({
    where: { id: company.id },
    data: { calendarToken: null },
  });

  revalidatePath("/schedule");
}
