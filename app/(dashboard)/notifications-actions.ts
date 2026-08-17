"use server";

import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth";
import { unreadNotificationCount, recentNotifications, type NotificationRow } from "@/lib/notifications";

/**
 * `viewMoney`, not just company membership: every curated notification kind
 * (lib/notifications.ts's NOTIFICATION_KINDS) either names a dollar amount
 * or is company-wide visibility a crew member has no reason to see — the
 * bell is already hidden from that role in the UI, but scope is not
 * permission, and these are directly callable server actions.
 */

/** Polled from the client every 30s to keep the bell's badge current without a page reload. */
export async function unreadNotificationCountAction(): Promise<number> {
  const { membership } = await requireCapability("viewMoney");
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
  const { membership } = await requireCapability("viewMoney");
  const rows = await recentNotifications(membership.companyId, membership.notificationsSeenAt);
  await prisma.companyMembership.update({
    where: { id: membership.id },
    data: { notificationsSeenAt: new Date() },
  });
  return rows;
}
