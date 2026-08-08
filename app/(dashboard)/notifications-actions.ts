"use server";

import { prisma } from "@/lib/prisma";
import { requireCompanyContext } from "@/lib/auth";
import { unreadNotificationCount, recentNotifications, type NotificationRow } from "@/lib/notifications";

/** Polled from the client every 30s to keep the bell's badge current without a page reload. */
export async function unreadNotificationCountAction(): Promise<number> {
  const { membership } = await requireCompanyContext();
  return unreadNotificationCount(membership.companyId, membership.notificationsSeenAt);
}

/**
 * Called when the bell opens: fetches the list (computing isUnread against
 * the *current* notificationsSeenAt), then advances notificationsSeenAt to
 * now. In that order, so the row that was new a second ago still renders
 * with its unread mark this one time, instead of clearing before the user
 * ever saw it.
 */
export async function openNotificationsAction(): Promise<NotificationRow[]> {
  const { membership } = await requireCompanyContext();
  const rows = await recentNotifications(membership.companyId, membership.notificationsSeenAt);
  await prisma.companyMembership.update({
    where: { id: membership.id },
    data: { notificationsSeenAt: new Date() },
  });
  return rows;
}
