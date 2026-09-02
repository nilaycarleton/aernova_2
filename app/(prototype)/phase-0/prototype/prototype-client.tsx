"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import {
  DASHBOARD_ACTIONS,
  JOBS,
  ROLES,
  STATUS_LABEL,
  STATUS_TIER,
  TODAY_SCHEDULE,
  money,
  type ProtoJob,
  type ProtoRole,
} from "../_fixtures";

/**
 * Phase 0 interactive prototype — the selected direction (Concept B,
 * "Workbench," extended with A's row density and the severity-dot pattern;
 * see docs/phase-0/03-concept-seeds.md). Covers: authenticated shell, grouped
 * nav, dashboard, jobs index, job workspace with a stable desktop inspector /
 * mobile bottom-sheet inspector, and role-adaptive nav (matching
 * components/dashboard/app-sidebar.tsx's real "absent, not disabled" rule).
 *
 * No Motion/Anime.js — CSS transitions + React state only, per
 * docs/phase-0/01-redesign-brief.md's motion-philosophy scoping (Motion is a
 * Phase 1 runtime decision, not made here). Every transition has a
 * `motion-reduce:` fallback that resolves instantly.
 */

type View = "dashboard" | "jobs" | "job";

const NAV_GROUPS: { label: string; items: { id: View | "today" | "schedule" | "pipeline" | "clients" | "invoices" | "reports"; label: string; roles?: ProtoRole[] }[] }[] = [
  {
    label: "Work",
    items: [
      { id: "dashboard", label: "Dashboard", roles: ["OWNER", "ESTIMATOR", "SALES"] },
      { id: "jobs", label: "Jobs", roles: ["OWNER", "ESTIMATOR", "SALES"] },
      { id: "today", label: "Today" },
      { id: "schedule", label: "Schedule" },
    ],
  },
  { label: "Pipeline", items: [{ id: "pipeline", label: "Pipeline", roles: ["OWNER", "ESTIMATOR", "SALES"] }] },
  { label: "Relationships", items: [{ id: "clients", label: "Clients", roles: ["OWNER", "ESTIMATOR", "SALES"] }] },
  {
    label: "Business",
    items: [
      { id: "invoices", label: "Invoices", roles: ["OWNER", "ESTIMATOR"] },
      { id: "reports", label: "Reports", roles: ["OWNER", "ESTIMATOR"] },
    ],
  },
];

function visibleForRole(role: ProtoRole) {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}

function SeverityDot({ severity }: { severity: "warning" | "danger" | "info" }) {
  const cls = severity === "danger" ? "bg-danger" : severity === "warning" ? "bg-caution" : "bg-info";
  return <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${cls}`} aria-hidden="true" />;
}

function StatusBadge({ status }: { status: ProtoJob["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs ${
        STATUS_TIER[status] === "complete" ? "bg-confirm/10 text-confirm-fg" : "bg-surface-lifted text-ink-secondary"
      }`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PrototypeClient() {
  const [role, setRole] = useState<ProtoRole>("OWNER");
  const [view, setView] = useState<View>("dashboard");
  const [selectedJobId, setSelectedJobId] = useState<string>(JOBS[0].id);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  const nav = visibleForRole(role);
  const selectedJob = JOBS.find((j) => j.id === selectedJobId) ?? JOBS[0];

  function openJob(id: string) {
    setSelectedJobId(id);
    setView("job");
    setMobileMenuOpen(false);
  }

  // Crew is a field-first role: default to a single-task, no-table view even
  // at desktop width — matching AppSidebar's real precedent (crew's nav is
  // shorter because entries are *absent*, not because they're disabled). Set
  // directly from the event that causes it, not an effect reacting to it.
  function handleRoleChange(next: ProtoRole) {
    setRole(next);
    if (next === "CREW") setView("dashboard");
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1600px] grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)]">
      <DesktopNav nav={nav} view={view} onSelect={(v) => (v === "dashboard" || v === "jobs" ? setView(v) : undefined)} role={role} />

      <div className="flex min-h-full min-w-0 flex-col pb-16 lg:pb-0">
        <TopBar
          role={role}
          onRoleChange={handleRoleChange}
          view={view}
          selectedJob={view === "job" ? selectedJob : undefined}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          createMenuOpen={createMenuOpen}
          onToggleCreateMenu={() => setCreateMenuOpen((v) => !v)}
        />

        <main id="phase0-proto-main" className="min-w-0 flex-1 px-4 py-6 md:px-6">
          {role === "CREW" ? (
            <CrewTodayView onOpenJob={openJob} />
          ) : view === "dashboard" ? (
            <DashboardView onSelectJob={openJob} onSeeAllJobs={() => setView("jobs")} />
          ) : view === "jobs" ? (
            <JobsView onSelectJob={openJob} />
          ) : (
            <JobWorkspaceView
              job={selectedJob}
              onBack={() => setView("jobs")}
              onOpenMobileSheet={() => setMobileSheetOpen(true)}
            />
          )}
        </main>
      </div>

      <MobileBottomNav
        view={role === "CREW" ? "dashboard" : view}
        onSelect={setView}
        onMore={() => setMobileMenuOpen(true)}
      />
      <MobileMenuSheet open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} nav={nav} onSelect={(v) => (v === "dashboard" || v === "jobs" ? setView(v) : undefined)} />
      {view === "job" ? (
        <JobInspectorSheet job={selectedJob} open={mobileSheetOpen} onClose={() => setMobileSheetOpen(false)} />
      ) : null}
    </div>
  );
}

function DesktopNav({
  nav,
  view,
  onSelect,
  role,
}: {
  nav: ReturnType<typeof visibleForRole>;
  view: View;
  onSelect: (v: string) => void;
  role: ProtoRole;
}) {
  if (role === "CREW") {
    return (
      <nav className="hidden border-r border-hairline p-4 lg:block">
        <p className="text-sm font-semibold text-ink-primary">Aernova</p>
        <p className="mt-1 text-xs text-ink-muted">Signed in as Crew</p>
        <p className="mt-6 text-sm text-ink-secondary">
          Crew&rsquo;s nav is shorter because entries are absent, not disabled — same rule as the
          production sidebar.
        </p>
      </nav>
    );
  }
  return (
    <nav className="hidden border-r border-hairline p-4 lg:block">
      <p className="mb-6 text-sm font-semibold text-ink-primary">Aernova</p>
      <div className="space-y-5">
        {nav.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-2.5 text-xs font-medium uppercase tracking-wide text-ink-muted">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = (item.id === "dashboard" || item.id === "jobs") && view === item.id;
                const isLive = item.id === "dashboard" || item.id === "jobs";
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => isLive && onSelect(item.id)}
                    disabled={!isLive}
                    aria-current={active ? "page" : undefined}
                    className={`block w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument ${
                      active
                        ? "bg-surface-lifted font-medium text-ink-primary"
                        : isLive
                          ? "text-ink-secondary hover:bg-surface-raised hover:text-ink-primary"
                          : "text-ink-muted/60"
                    }`}
                  >
                    {item.label}
                    {!isLive ? <span className="ml-1.5 text-xs">(not wired in this seed)</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}

function TopBar({
  role,
  onRoleChange,
  view,
  selectedJob,
  onOpenMobileMenu,
  createMenuOpen,
  onToggleCreateMenu,
}: {
  role: ProtoRole;
  onRoleChange: (r: ProtoRole) => void;
  view: View;
  selectedJob?: ProtoJob;
  onOpenMobileMenu: () => void;
  createMenuOpen: boolean;
  onToggleCreateMenu: () => void;
}) {
  const title =
    role === "CREW" ? "Today" : view === "dashboard" ? "Dashboard" : view === "jobs" ? "Jobs" : selectedJob?.client ?? "Job";
  const subtitle = view === "job" && selectedJob ? selectedJob.address : undefined;

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b border-hairline px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-raised lg:hidden"
          aria-label="Open navigation"
        >
          <span aria-hidden="true">≡</span>
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-ink-primary">{title}</h1>
          {subtitle ? <p className="truncate text-xs text-ink-muted">{subtitle}</p> : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <label className="hidden items-center gap-1.5 text-xs text-ink-muted sm:flex">
          Viewing as
          <select
            value={role}
            onChange={(e) => onRoleChange(e.target.value as ProtoRole)}
            className="rounded-md border border-hairline bg-surface-raised px-2 py-1 text-xs text-ink-primary"
          >
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        {role !== "CREW" ? (
          <div className="relative">
            <button
              type="button"
              onClick={onToggleCreateMenu}
              aria-expanded={createMenuOpen}
              aria-haspopup="menu"
              className="rounded-md bg-action px-3 py-1.5 text-sm font-medium text-on-action"
            >
              + Create
            </button>
            {createMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-hairline bg-surface-raised p-1 shadow-none"
              >
                {["New job", "New quote", "New invoice", "New client"].map((item) => (
                  <button
                    key={item}
                    role="menuitem"
                    type="button"
                    className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm text-ink-secondary hover:bg-surface-lifted hover:text-ink-primary"
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <ThemeToggle />
      </div>
    </header>
  );
}

function DashboardView({ onSelectJob, onSeeAllJobs }: { onSelectJob: (id: string) => void; onSeeAllJobs: () => void }) {
  return (
    <div className="max-w-[1000px] space-y-8">
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-ink-primary">Needs your attention</h2>
          <span className="text-xs text-ink-muted">{DASHBOARD_ACTIONS.length}</span>
        </div>
        <div className="divide-y divide-hairline rounded-lg border border-hairline">
          {DASHBOARD_ACTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelectJob(a.href)}
              className="flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-raised focus-visible:bg-surface-raised focus-visible:outline-none"
            >
              <SeverityDot severity={a.severity} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink-primary">{a.title}</span>
                <span className="block text-ink-muted">{a.detail}</span>
              </span>
              <span className="shrink-0 self-center text-ink-muted" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-primary">Today</h2>
        <ul className="divide-y divide-hairline rounded-lg border border-hairline text-sm">
          {TODAY_SCHEDULE.map((s) => (
            <li key={s.label} className="flex items-center gap-3 px-3 py-2">
              <span className="w-16 shrink-0 tabular-nums text-ink-muted">{s.time}</span>
              <span className="min-w-0 flex-1 truncate text-ink-primary">{s.label}</span>
              <span className="shrink-0 text-ink-muted">{s.crew}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-ink-primary">Recent jobs</h2>
          <button type="button" onClick={onSeeAllJobs} className="text-xs font-medium text-ink-secondary hover:text-ink-primary">
            See all →
          </button>
        </div>
        <ul className="divide-y divide-hairline rounded-lg border border-hairline">
          {JOBS.slice(0, 4).map((job) => (
            <li key={job.id}>
              <button
                type="button"
                onClick={() => onSelectJob(job.id)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-raised focus-visible:bg-surface-raised focus-visible:outline-none"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink-primary">{job.client}</span>
                  <span className="block truncate text-xs text-ink-muted">{job.nextAction}</span>
                </span>
                <StatusBadge status={job.status} />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function JobsView({ onSelectJob }: { onSelectJob: (id: string) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-md border border-hairline px-2.5 py-1 text-ink-secondary hover:bg-surface-raised">
            All trades
          </button>
          <button type="button" className="rounded-md border border-hairline px-2.5 py-1 text-ink-secondary hover:bg-surface-raised">
            All statuses
          </button>
        </div>
        <span className="text-ink-muted">{JOBS.length} jobs</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-hairline">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs text-ink-muted">
              <th className="px-3 py-2 font-medium">Client</th>
              <th className="hidden px-3 py-2 font-medium sm:table-cell">Status</th>
              <th className="hidden px-3 py-2 font-medium md:table-cell">Next action</th>
              <th className="px-3 py-2 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {JOBS.map((job) => (
              <tr key={job.id} className="border-b border-hairline last:border-0">
                <td className="p-0">
                  <button
                    type="button"
                    onClick={() => onSelectJob(job.id)}
                    className="block w-full px-3 py-2.5 text-left transition-colors hover:bg-surface-raised focus-visible:bg-surface-raised focus-visible:outline-none"
                  >
                    <span className="block font-medium text-ink-primary">{job.client}</span>
                    <span className="block truncate text-xs text-ink-muted sm:hidden">{STATUS_LABEL[job.status]}</span>
                  </button>
                </td>
                <td className="hidden px-3 py-2.5 sm:table-cell">
                  <StatusBadge status={job.status} />
                </td>
                <td className="hidden max-w-[260px] truncate px-3 py-2.5 text-ink-secondary md:table-cell">
                  {job.nextAction}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink-primary">
                  {job.valueCents ? money(job.valueCents) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const TABS = ["Overview", "Activity", "Documents"] as const;

function JobWorkspaceView({
  job,
  onBack,
  onOpenMobileSheet,
}: {
  job: ProtoJob;
  onBack: () => void;
  onOpenMobileSheet: () => void;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-4 text-xs text-ink-muted hover:text-ink-primary">
        &larr; Jobs
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <div role="tablist" aria-label="Job workspace sections" className="mb-4 flex gap-1 border-b border-hairline">
            {TABS.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`border-b-2 px-3 py-2 text-sm transition-colors ${
                  tab === t ? "border-ink-primary font-medium text-ink-primary" : "border-transparent text-ink-secondary hover:text-ink-primary"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "Overview" ? (
            <div className="space-y-4 text-sm">
              <p className="text-ink-secondary">{job.nextAction}</p>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-ink-muted">Trade</dt>
                  <dd className="text-ink-primary">{job.trade}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Owner</dt>
                  <dd className="text-ink-primary">{job.owner}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Value</dt>
                  <dd className="tabular-nums text-ink-primary">{job.valueCents ? money(job.valueCents) : "—"}</dd>
                </div>
              </dl>
            </div>
          ) : tab === "Activity" ? (
            <ul className="space-y-3 text-sm">
              <li className="text-ink-secondary">
                <span className="text-ink-muted">{job.updatedAt} &middot; </span>Status updated to{" "}
                <span className="text-ink-primary">{STATUS_LABEL[job.status]}</span>
              </li>
              <li className="text-ink-secondary">
                <span className="text-ink-muted">2 days ago &middot; </span>Quote sent to client
              </li>
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">No documents attached to this fixture job.</p>
          )}
        </div>

        {/* Stable desktop inspector. */}
        <aside className="hidden h-fit rounded-lg border border-hairline p-4 lg:block">
          <InspectorContent job={job} />
        </aside>
      </div>

      {/* Mobile: the inspector becomes a bottom-sheet, opened on demand
          instead of always-visible real estate. */}
      <button
        type="button"
        onClick={onOpenMobileSheet}
        className="fixed bottom-20 right-4 z-30 rounded-full bg-action px-4 py-2.5 text-sm font-medium text-on-action shadow-none lg:hidden"
      >
        Job details
      </button>
    </div>
  );
}

function InspectorContent({ job }: { job: ProtoJob }) {
  return (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Job details</p>
      <h3 className="mt-1 text-base font-semibold text-ink-primary">{job.client}</h3>
      <p className="text-sm text-ink-secondary">{job.address}</p>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-muted">Status</dt>
          <dd className="text-ink-primary">{STATUS_LABEL[job.status]}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-muted">Value</dt>
          <dd className="tabular-nums text-ink-primary">{job.valueCents ? money(job.valueCents) : "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-muted">Owner</dt>
          <dd className="text-ink-primary">{job.owner}</dd>
        </div>
      </dl>
      <button type="button" className="mt-4 w-full min-h-11 rounded-md bg-action px-3 py-2 text-sm font-medium text-on-action">
        {STATUS_LABEL[job.status] === "Completed" ? "View invoice" : "Advance status"}
      </button>
    </>
  );
}

function CrewTodayView({ onOpenJob }: { onOpenJob: (id: string) => void }) {
  return (
    <div className="max-w-[520px] space-y-3">
      <p className="text-sm text-ink-secondary">{TODAY_SCHEDULE.length} visits today</p>
      {TODAY_SCHEDULE.map((s, i) => (
        <button
          key={s.label}
          type="button"
          onClick={() => onOpenJob(JOBS[i % JOBS.length].id)}
          className="flex w-full min-h-11 items-center gap-3 rounded-lg border border-hairline p-4 text-left transition-colors hover:bg-surface-raised focus-visible:bg-surface-raised focus-visible:outline-none"
        >
          <span className="w-16 shrink-0 tabular-nums text-sm text-ink-muted">{s.time}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-ink-primary">{s.label}</span>
            <span className="block text-xs text-ink-muted">{s.crew}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function MobileBottomNav({
  view,
  onSelect,
  onMore,
}: {
  view: View;
  onSelect: (v: View) => void;
  onMore: () => void;
}) {
  const items: { id: View; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "jobs", label: "Jobs" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-hairline bg-surface-sidebar lg:hidden">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          aria-current={view === item.id ? "page" : undefined}
          className={`min-h-11 flex-1 py-2.5 text-xs font-medium transition-colors ${
            view === item.id ? "text-ink-primary" : "text-ink-muted"
          }`}
        >
          {item.label}
        </button>
      ))}
      <button type="button" onClick={onMore} className="min-h-11 flex-1 py-2.5 text-xs font-medium text-ink-muted">
        More
      </button>
    </nav>
  );
}

function MobileMenuSheet({
  open,
  onClose,
  nav,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  nav: ReturnType<typeof visibleForRole>;
  onSelect: (v: string) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const headingId = useId();

  useEffect(() => {
    if (!open) return;
    // Reliable focus return (docs/AERNOVA_DESIGN_REFERENCE.md §17): remember
    // what had focus before the sheet opened — the mobile "≡" trigger in
    // TopBar, out of this component's own tree — and give it back on close,
    // rather than leaving focus stranded on the (now hidden) close button.
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-40 lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-ground/70 transition-opacity motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-hairline bg-surface-sidebar p-4 transition-transform duration-200 ease-out motion-reduce:transition-none motion-reduce:duration-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={headingId} className="text-sm font-semibold text-ink-primary">
            Menu
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface-raised"
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
        <div className="space-y-5">
          {nav.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isLive = item.id === "dashboard" || item.id === "jobs";
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => isLive && (onSelect(item.id), onClose())}
                      className="block min-h-11 w-full rounded-md px-2.5 py-2 text-left text-sm text-ink-secondary hover:bg-surface-raised hover:text-ink-primary"
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <Link href="/phase-0" className="mt-6 block text-xs text-ink-muted hover:text-ink-primary">
          ← Back to Phase 0 index
        </Link>
      </div>
    </div>
  );
}

function JobInspectorSheet({ job, open, onClose }: { job: ProtoJob; open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const headingId = useId();

  useEffect(() => {
    if (!open) return;
    // Same focus-return contract as MobileMenuSheet above — restore focus to
    // the "Job details" trigger button rather than stranding it on the
    // sheet's own (now hidden) close control.
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-40 lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-ground/70 transition-opacity motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}
      />
      {/* Symmetric entry/exit sheet, sourced from the bottom (the trigger's
          own edge) — matches the Apple-design-skill principle cited in
          docs/AERNOVA_DESIGN_REFERENCE.md §12.2 without adding a library. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className={`absolute inset-x-0 bottom-0 rounded-t-xl border-t border-hairline bg-surface-sidebar p-4 pb-8 transition-transform duration-200 ease-out motion-reduce:transition-none motion-reduce:duration-0 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id={headingId} className="sr-only">
            Job details
          </h2>
          <span className="mx-auto h-1 w-10 rounded-full bg-hairline" aria-hidden="true" />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface-raised"
            aria-label="Close job details"
          >
            ×
          </button>
        </div>
        <InspectorContent job={job} />
      </div>
    </div>
  );
}
