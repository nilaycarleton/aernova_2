"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { can, type Capability } from "@/lib/permissions";
import type { CompanyRole } from "@prisma/client";

/**
 * Only destinations that exist.
 *
 * This list used to carry eight entries — Measurements, Inspections, Reports,
 * CRM, Operations, Customer Portal — every one of them pointing at
 * `/dashboard?view=…`, a parameter nothing reads. All eight rendered as working
 * links and all eight did the same nothing. A nav that lies about what the
 * product does is worse than a short one, and "calm is a function of sequence"
 * (PRODUCT.md) does not survive a click that goes nowhere.
 *
 * Entries come back as their routes land. With Phase 5 all five nouns have
 * their own address, and they are listed in the order the work happens —
 * somebody asks, it becomes a job, you price it, you schedule it, you bill for
 * it, and the person who asked becomes a client.
 */
type NavItem = { href: string; label: string; needs?: Capability };

/**
 * A crew member's nav is three entries shorter, and the entries are *absent*
 * rather than disabled. A greyed-out "Quotes" tells somebody exactly what they
 * are missing and invites them to try the URL; a nav that simply doesn't
 * mention it is both quieter and more honest about what this person's job is.
 * The pages guard themselves regardless — see `requirePageCapability`.
 */
const navItems: NavItem[] = [
  { href: "/today", label: "Today" },
  { href: "/dashboard", label: "Dashboard", needs: "viewAllJobs" },
  { href: "/requests", label: "Requests", needs: "viewAllJobs" },
  { href: "/pipeline", label: "Pipeline", needs: "viewAllJobs" },
  { href: "/jobs", label: "Jobs", needs: "viewAllJobs" },
  { href: "/quotes", label: "Quotes", needs: "viewMoney" },
  { href: "/schedule", label: "Schedule" },
  { href: "/invoices", label: "Invoices", needs: "viewMoney" },
  { href: "/reports", label: "Reports", needs: "viewMoney" },
  { href: "/clients", label: "Clients", needs: "viewAllJobs" },
  { href: "/team", label: "Team", needs: "manageTeam" },
  { href: "/settings", label: "Settings", needs: "manageCompany" },
  { href: "/jobs/new", label: "New job", needs: "editJob" },
];

/**
 * Which entry is the page you are on.
 *
 * Exact match rather than a prefix, because `/jobs/new` is its own entry and a
 * prefix test would light both it and Jobs at once. `/jobs/<id>` is the one
 * case that wants the prefix: a job detail page belongs under Jobs, and a nav
 * with nothing lit reads as if you have left the app.
 */
function isCurrent(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/jobs") return pathname.startsWith("/jobs/") && pathname !== "/jobs/new";
  // `/requests/new` has no entry of its own, so it lights Requests. Nothing lit
  // at all reads as if you have left the app.
  if (href === "/requests") return pathname.startsWith("/requests/");
  return false;
}

export function AppSidebar({ role }: { role: CompanyRole }) {
  const pathname = usePathname();

  return (
    <aside className="min-w-0 border-r border-hairline bg-surface-sidebar p-4">
      <div className="mb-8 rounded-xl border border-hairline bg-surface-raised p-4">
        <div className="text-xl font-semibold tracking-wide text-ink-primary">
          Aernova
        </div>
        {/* Not "Roofing intelligence platform". This line sits on every screen
            in the product, including the ones a plumber or a lawn-care company
            will read — a trade word is allowed inside a module-gated surface
            and nowhere else (PLAN-CRM.md, design constraints). */}
        <p className="mt-1 text-sm text-ink-muted">
          Jobs, clients and quotes
        </p>
      </div>

      <nav className="space-y-2">
        {navItems
          .filter((item) => !item.needs || can(role, item.needs))
          .map((item) => {
          const current = isCurrent(pathname, item.href);
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              // Tone and weight, never cyan: where you are is *state*, and the
              // Readout Rule keeps cyan for numbers a contractor can act on.
              // `aria-current` carries the same fact to a screen reader, which
              // a background tint alone never would.
              aria-current={current ? "page" : undefined}
              className={`block rounded-lg px-4 py-3 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument ${
                current
                  ? "bg-surface-lifted font-medium text-ink-primary"
                  : "text-ink-secondary hover:bg-surface-raised hover:text-ink-primary"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
