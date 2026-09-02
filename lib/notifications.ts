import { ActivityKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { describeActivity } from "@/lib/activity";
import { personName } from "@/lib/job-identity";

/**
 * The bell's curated subset of ActivityEvent — business milestones a
 * contractor would want interrupted for, not the full audit trail (stage
 * changes, notes, expense logs) that the dashboard's Recent Activity panel
 * already carries in full. Gated on the `viewMoney` capability at the
 * call site: every kind here either names a dollar amount or is company-wide
 * visibility a crew member (no `viewAllJobs`, no `viewMoney`) has no reason
 * to see.
 */
export const NOTIFICATION_KINDS: ActivityKind[] = [
  ActivityKind.QUOTE_SENT,
  ActivityKind.QUOTE_VIEWED,
  ActivityKind.QUOTE_APPROVED,
  ActivityKind.QUOTE_DECLINED,
  ActivityKind.INVOICE_SENT,
  ActivityKind.INVOICE_PAID,
  ActivityKind.PAYMENT_RECORDED,
  ActivityKind.REQUEST_CREATED,
];

const NOTIFICATION_LIMIT = 8;

export type NotificationRow = {
  id: string;
  label: string;
  href: string | null;
  createdAt: Date;
  isUnread: boolean;
};

/** A sensible landing page for a notification with no job of its own (e.g. a new request, pre-conversion). */
function fallbackHref(kind: ActivityKind): string | null {
  switch (kind) {
    case ActivityKind.REQUEST_CREATED:
      return "/requests";
    default:
      return null;
  }
}

async function resolveActorNames(actorUserIds: (string | null)[]): Promise<Map<string, string>> {
  const ids = [...new Set(actorUserIds.filter((id): id is string => id != null))];
  if (ids.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  return new Map(users.map((user) => [user.id, personName(user)]));
}

/**
 * The count that drives the badge. `seenAt` null means the bell has never
 * been opened — everything in the curated window counts as unread, same as
 * a fresh inbox.
 */
export async function unreadNotificationCount(companyId: string, seenAt: Date | null): Promise<number> {
  return prisma.activityEvent.count({
    where: {
      companyId,
      kind: { in: NOTIFICATION_KINDS },
      ...(seenAt ? { createdAt: { gt: seenAt } } : {}),
    },
  });
}

/**
 * The dropdown's content. Computes `isUnread` per row against the seenAt
 * value passed in — the caller reads membership.notificationsSeenAt
 * *before* updating it, so this reflects what was actually new at the
 * moment the bell was opened, not after.
 */
export async function recentNotifications(companyId: string, seenAt: Date | null): Promise<NotificationRow[]> {
  const events = await prisma.activityEvent.findMany({
    where: { companyId, kind: { in: NOTIFICATION_KINDS } },
    orderBy: { createdAt: "desc" },
    take: NOTIFICATION_LIMIT,
  });

  const actorNameById = await resolveActorNames(events.map((event) => event.actorUserId));

  return events.map((event) => {
    const actor = event.actorUserId ? actorNameById.get(event.actorUserId) : undefined;
    return {
      id: event.id,
      label: describeActivity(event, actor),
      href: event.jobId ? `/jobs/${event.jobId}` : fallbackHref(event.kind),
      createdAt: event.createdAt,
      isUnread: !seenAt || event.createdAt > seenAt,
    };
  });
}
