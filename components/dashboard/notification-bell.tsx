"use client";

import { useCallback, useEffect, useState } from "react";
import { Popover } from "@astryxdesign/core/Popover";
import { List, ListItem } from "@astryxdesign/core/List";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import {
  openNotificationsAction,
  unreadNotificationCountAction,
} from "@/app/(dashboard)/notifications-actions";
import type { NotificationRow } from "@/lib/notifications";

/**
 * Curated milestones (quote sent/viewed/accepted/declined, invoice sent/
 * paid, payment received, new request) in a header dropdown — the counter-
 * part to the dashboard's fuller Recent Activity panel, not a duplicate of
 * it. Polls for the unread count every 30s (there's no push/websocket
 * infrastructure in this app yet, and nothing else here is real-time either,
 * so polling is the plain, consistent choice over adding a new transport for
 * one component). Opening the bell fetches the list and advances
 * `notificationsSeenAt` server-side — see app/(dashboard)/notifications-
 * actions.ts for why the list is read before that timestamp moves.
 *
 * Rendered only when the caller has `viewMoney` — every curated kind here
 * either names a dollar amount or is company-wide visibility a crew member
 * has no reason to see. See lib/permissions.ts's CREW grant.
 */

const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationRow[] | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const refreshCount = useCallback(() => {
    unreadNotificationCountAction()
      .then(setUnreadCount)
      .catch(() => {
        // A missed poll just means a stale badge until the next tick — never worth surfacing.
      });
  }, []);

  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refreshCount]);

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (!open) return;
    openNotificationsAction()
      .then((rows) => {
        setNotifications(rows);
        setUnreadCount(0);
      })
      .catch(() => {
        setNotifications([]);
      });
  }

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      placement="below"
      alignment="end"
      width={340}
      label="Notifications"
      content={<NotificationList notifications={notifications} />}
    >
      <button
        type="button"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-surface-raised text-ink-secondary transition hover:bg-surface-lifted hover:text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-caution px-1 text-xs font-semibold leading-none text-on-accent">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>
    </Popover>
  );
}

function NotificationList({ notifications }: { notifications: NotificationRow[] | null }) {
  if (notifications === null) {
    return <p className="p-4 text-sm text-ink-muted">Loading…</p>;
  }

  if (notifications.length === 0) {
    return (
      <p className="p-4 text-sm text-ink-muted">
        Nothing yet. This fills up as quotes get sent, invoices get paid, and requests come in.
      </p>
    );
  }

  return (
    <List hasDividers density="compact">
      {notifications.map((notification) => (
        <ListItem
          key={notification.id}
          label={notification.label}
          href={notification.href ?? undefined}
          startContent={
            notification.isUnread ? (
              <span aria-hidden="true" className="block h-1.5 w-1.5 shrink-0 rounded-full bg-caution" />
            ) : (
              <span className="block h-1.5 w-1.5 shrink-0" />
            )
          }
          endContent={<Timestamp value={notification.createdAt.toISOString()} format="relative" />}
        />
      ))}
    </List>
  );
}
