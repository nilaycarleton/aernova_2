import type { CompanyRole } from "@prisma/client";
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  FileText,
  GitBranch,
  Hammer,
  Inbox,
  LayoutDashboard,
  Receipt,
  Settings2,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { can, type Capability } from "./permissions.ts";

/**
 * The ONE central shell navigation definition (Premium UI Redesign Phase 2,
 * Step 3). Every nav surface — desktop SideNav, the mobile drawer, the
 * mobile bottom bar, the command palette, and the page-identity title — reads
 * from this module rather than each carrying its own hardcoded array. This
 * is display-only: `needs` mirrors the exact capability each page's own
 * `requirePageCapability`/`requireCapability` call already enforces
 * server-side (see the table in docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_PHASE_2_IMPLEMENTATION.md);
 * this file grants nothing on its own and duplicates no authorization logic.
 *
 * Groups match the approved IA (docs/AERNOVA_DESIGN_REFERENCE.md §9.1):
 * Work, Pipeline, Relationships, Business, Company.
 */

export type NavGroupId = "work" | "pipeline" | "relationships" | "business" | "company";

export const NAV_GROUPS: { id: NavGroupId; label: string }[] = [
  { id: "work", label: "Work" },
  { id: "pipeline", label: "Pipeline" },
  { id: "relationships", label: "Relationships" },
  { id: "business", label: "Business" },
  { id: "company", label: "Company" },
];

export type NavItemDef = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  group: NavGroupId;
  /** Undefined = every authenticated role (matches the current /today, /schedule pages, which call requireCompanyContext with no capability gate). */
  needs?: Capability;
  /** "exact" matches only the literal href; "prefix" also matches nested routes (e.g. /jobs/[id]). */
  match: "exact" | "prefix";
};

/**
 * Real routes only — verified against each page's own server guard, not
 * guessed. `/jobs/new`, `/requests/new`, `/jobs/quick`, `/jobs/capture` are
 * creation entry points, not stable work areas — they live behind
 * `+ Create` (`components/dashboard/quick-create-menu.tsx`), not here.
 * `/internal/*` are OWNER-only dev previews, deliberately absent from nav —
 * see docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_PHASE_0_IMPLEMENTATION.md.
 */
export const NAV_ITEMS: NavItemDef[] = [
  { id: "today", label: "Today", href: "/today", icon: CalendarCheck, group: "work", match: "exact" },
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "work", needs: "viewAllJobs", match: "exact" },
  { id: "jobs", label: "Jobs", href: "/jobs", icon: Hammer, group: "work", needs: "viewAllJobs", match: "prefix" },
  { id: "schedule", label: "Schedule", href: "/schedule", icon: CalendarDays, group: "work", match: "exact" },
  { id: "requests", label: "Requests", href: "/requests", icon: Inbox, group: "pipeline", needs: "viewAllJobs", match: "prefix" },
  { id: "pipeline", label: "Pipeline", href: "/pipeline", icon: GitBranch, group: "pipeline", needs: "viewAllJobs", match: "exact" },
  { id: "clients", label: "Clients", href: "/clients", icon: Users, group: "relationships", needs: "viewAllJobs", match: "prefix" },
  { id: "quotes", label: "Quotes", href: "/quotes", icon: FileText, group: "business", needs: "viewAllJobs", match: "exact" },
  { id: "invoices", label: "Invoices", href: "/invoices", icon: Receipt, group: "business", needs: "viewMoney", match: "exact" },
  { id: "reports", label: "Reports", href: "/reports", icon: BarChart3, group: "business", needs: "viewMoney", match: "prefix" },
  { id: "team", label: "Team", href: "/team", icon: UsersRound, group: "company", needs: "manageTeam", match: "exact" },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings2, group: "company", needs: "manageCompany", match: "prefix" },
];

/** Every item a role may see, in NAV_ITEMS' own order. Absence, never a disabled item — matches components/dashboard/app-sidebar.tsx's existing precedent. */
export function visibleNavItems(role: CompanyRole): NavItemDef[] {
  return NAV_ITEMS.filter((item) => !item.needs || can(role, item.needs));
}

export function navItemsByGroup(role: CompanyRole): { group: (typeof NAV_GROUPS)[number]; items: NavItemDef[] }[] {
  const visible = visibleNavItems(role);
  return NAV_GROUPS.map((group) => ({
    group,
    items: visible.filter((item) => item.group === group.id),
  })).filter((entry) => entry.items.length > 0);
}

/**
 * Which destination is "current." Exact items match only the literal path;
 * prefix items also match their own nested routes (e.g. `/jobs/[id]/quotes/
 * [quoteId]` lights Jobs) — mirroring `app-sidebar.tsx`'s existing
 * `isCurrent()` precedent, generalized to every item instead of two
 * hand-written special cases. `/jobs/new` deliberately does NOT match Jobs:
 * it's a creation destination reached through `+ Create`, not a stable work
 * area, and lighting a nav item for a page that isn't itself in the nav
 * would misrepresent where the user is.
 */
export function isNavItemActive(pathname: string, item: NavItemDef): boolean {
  if (item.href === "/jobs") {
    return pathname === "/jobs" || (pathname.startsWith("/jobs/") && !pathname.startsWith("/jobs/new") && !pathname.startsWith("/jobs/quick") && !pathname.startsWith("/jobs/capture"));
  }
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function activeNavItemId(pathname: string, role: CompanyRole): string | undefined {
  return visibleNavItems(role).find((item) => isNavItemActive(pathname, item))?.id;
}

/**
 * Bottom-nav priority order per role (Step 21) — one shared model, role-
 * aware priority, never a separate product per role. The bottom nav takes
 * the first `MOBILE_PRIMARY_COUNT` ids from this list that the role is
 * actually authorized for (via `visibleNavItems`); everything else — for
 * every role — remains reachable through the "More" drawer. CREW's list is
 * short because CREW is authorized for only Today/Schedule today, not
 * because this list hides anything from them.
 */
export const MOBILE_PRIORITY: Record<CompanyRole, string[]> = {
  OWNER: ["today", "dashboard", "jobs", "schedule"],
  ADMIN: ["today", "dashboard", "jobs", "schedule"],
  ESTIMATOR: ["today", "dashboard", "jobs", "schedule"],
  SALES: ["today", "requests", "pipeline", "jobs"],
  VIEWER: ["today", "dashboard", "jobs", "schedule"],
  CREW: ["today", "schedule"],
};

export const MOBILE_PRIMARY_COUNT = 4;

export function mobilePrimaryItems(role: CompanyRole): NavItemDef[] {
  const visible = visibleNavItems(role);
  const priority = MOBILE_PRIORITY[role] ?? [];
  const byId = new Map(visible.map((item) => [item.id, item]));
  const primary = priority
    .map((id) => byId.get(id))
    .filter((item): item is NavItemDef => item !== undefined)
    .slice(0, MOBILE_PRIMARY_COUNT);
  return primary;
}

/** Everything authorized but not in the mobile bottom bar — the "More" drawer's content, grouped the same way desktop nav is. */
export function mobileOverflowGroups(role: CompanyRole): { group: (typeof NAV_GROUPS)[number]; items: NavItemDef[] }[] {
  const primaryIds = new Set(mobilePrimaryItems(role).map((item) => item.id));
  const grouped = navItemsByGroup(role);
  return grouped
    .map((entry) => ({ group: entry.group, items: entry.items.filter((item) => !primaryIds.has(item.id)) }))
    .filter((entry) => entry.items.length > 0);
}

/**
 * Route -> page identity, for the top bar (Step 13). Deliberately shallow —
 * a stable shell identity, not the final page-header primitive Phase 4 will
 * build. Longest-prefix match first so `/settings/workflow` doesn't fall
 * through to the generic `/settings` entry before its own.
 */
const ROUTE_TITLES: { prefix: string; title: string }[] = [
  { prefix: "/settings/workflow", title: "Workflow" },
  { prefix: "/settings", title: "Settings" },
  { prefix: "/today", title: "Today" },
  { prefix: "/dashboard", title: "Dashboard" },
  { prefix: "/jobs/new", title: "New job" },
  { prefix: "/jobs/quick", title: "New job" },
  { prefix: "/jobs/capture", title: "Capture" },
  { prefix: "/jobs", title: "Jobs" },
  { prefix: "/schedule", title: "Schedule" },
  { prefix: "/requests/new", title: "New request" },
  { prefix: "/requests", title: "Requests" },
  { prefix: "/pipeline", title: "Pipeline" },
  { prefix: "/clients", title: "Clients" },
  { prefix: "/quotes", title: "Quotes" },
  { prefix: "/invoices", title: "Invoices" },
  { prefix: "/reports/aged-receivables", title: "Aged receivables" },
  { prefix: "/reports/revenue", title: "Revenue" },
  { prefix: "/reports", title: "Reports" },
  { prefix: "/team", title: "Team" },
];

export function routeTitle(pathname: string): string {
  const nestedJobEntity = matchNestedJobEntity(pathname);
  if (nestedJobEntity) return nestedJobEntity;

  const sorted = [...ROUTE_TITLES].sort((a, b) => b.prefix.length - a.prefix.length);
  const match = sorted.find((entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`));
  return match?.title ?? "Aernova";
}

/** /jobs/[id] -> "Job", /jobs/[id]/quotes/[id] -> "Quote", etc. — page bodies already show the entity's real name; the shell only needs the noun. */
function matchNestedJobEntity(pathname: string): string | undefined {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "jobs" || segments.length < 2) return undefined;
  if (["new", "quick", "capture"].includes(segments[1])) return undefined;

  if (segments.length === 2) return "Job";
  const noun = segments[2];
  if (noun === "quotes") return "Quote";
  if (noun === "invoices") return "Invoice";
  if (noun === "change-orders") return "Change order";
  if (noun === "report") return "Report";
  return "Job";
}
