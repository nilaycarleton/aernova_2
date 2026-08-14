/**
 * How a client's standing reads on screen.
 *
 * Same doctrine as `lib/job-status.ts`: standing is *state*, so it reads
 * tonally, not in colour. Cyan stays reserved for a number a contractor can
 * act on, and amber for something wrong. A lead is neither — it is the most
 * ordinary thing in the product.
 */
import type { ClientStatus } from "@prisma/client";
import type { StatusTone } from "@/lib/status-tone";

type ClientStatusMeta = {
  label: string;
  /** Tailwind classes for a badge. */
  badge: string;
};

export const CLIENT_STATUS_META: Record<ClientStatus, ClientStatusMeta> = {
  LEAD: { label: "Lead", badge: "text-ink-secondary bg-surface-lifted" },
  ACTIVE: { label: "Active", badge: "text-confirm-fg bg-confirm/10" },
  ARCHIVED: { label: "Archived", badge: "text-ink-muted bg-surface-lifted" },
};

/**
 * Minimal Phase 5 adapter for the client detail page's PageHeader `status`
 * slot (the shared `Status` primitive) — same pattern as `lib/job-status.ts`'s
 * `statusTone`. `CLIENT_STATUS_META` keeps owning label/badge for the list
 * table; this only adds the tonal reading the one Status usage needs.
 */
export function clientStatusTone(status: ClientStatus): StatusTone {
  if (status === "ACTIVE") return "success";
  return "neutral";
}

/**
 * The filter above the list. "Leads and active" is the default and the reason
 * this is a named set rather than a status dropdown: the everyday question is
 * "everyone I might still work for", which is two statuses, not one. Archived
 * is reachable, never shown by default — putting a client away should mean
 * they stop being in the way.
 */
export type ClientFilter = "LEADS_AND_ACTIVE" | "LEAD" | "ACTIVE" | "ARCHIVED";

export const CLIENT_FILTERS: { value: ClientFilter; label: string }[] = [
  { value: "LEADS_AND_ACTIVE", label: "Leads and active" },
  { value: "LEAD", label: "Leads" },
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
];

export function matchesClientFilter(status: ClientStatus, filter: ClientFilter): boolean {
  if (filter === "LEADS_AND_ACTIVE") return status !== "ARCHIVED";
  return status === filter;
}
