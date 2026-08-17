import { ConceptHeader } from "../_shared";
import { DASHBOARD_ACTIONS, JOBS, STATUS_LABEL, STATUS_TIER, TODAY_SCHEDULE, money } from "../../_fixtures";

/**
 * Concept B — "Workbench". A stable split pane: job list on the left, a
 * persistent inspector on the right showing the selected job's detail (here,
 * statically the first flagged job, since this seed isn't interactive).
 * Grouped, labeled nav (matching the approved IA groups). Moderate density —
 * structured rows for the dashboard action center instead of a table or cards.
 */
const NAV_GROUPS = [
  { label: "Work", items: ["Dashboard", "Jobs", "Today", "Schedule"] },
  { label: "Pipeline", items: ["Pipeline"] },
  { label: "Relationships", items: ["Requests", "Clients"] },
  { label: "Business", items: ["Invoices", "Reports"] },
];

const selected = JOBS[0];

export default function ConceptBPage() {
  return (
    <div>
      <ConceptHeader
        eyebrow="Concept B"
        title="Workbench"
        description="A stable split pane — list, then a persistent inspector — with grouped, labeled navigation. Optimized for moving through jobs without losing place, and for the job-workspace task specifically."
      />
      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 pb-16 md:px-6">
        <nav className="w-44 shrink-0 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`block w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                      item === "Jobs"
                        ? "bg-surface-lifted font-medium text-ink-primary"
                        : "text-ink-secondary hover:bg-surface-raised hover:text-ink-primary"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          <div className="mb-5 space-y-2">
            {DASHBOARD_ACTIONS.slice(0, 2).map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 rounded-md bg-surface-raised px-3 py-2 text-sm"
              >
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    a.severity === "danger" ? "bg-danger" : a.severity === "warning" ? "bg-caution" : "bg-info"
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink-primary">{a.title}</p>
                  <p className="text-ink-muted">{a.detail}</p>
                </div>
                <button type="button" className="shrink-0 text-xs font-medium text-ink-secondary hover:text-ink-primary">
                  Open →
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <h2 className="font-semibold text-ink-primary">Jobs</h2>
                <span className="text-ink-muted">{JOBS.length} total</span>
              </div>
              <ul className="divide-y divide-hairline rounded-lg border border-hairline">
                {JOBS.map((job, i) => (
                  <li key={job.id}>
                    <button
                      type="button"
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-raised ${
                        i === 0 ? "bg-surface-lifted" : ""
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink-primary">{job.client}</span>
                        <span className="block truncate text-xs text-ink-muted">{job.address}</span>
                      </span>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${
                          STATUS_TIER[job.status] === "complete"
                            ? "bg-confirm/10 text-confirm-fg"
                            : "bg-surface-lifted text-ink-secondary"
                        }`}
                      >
                        {STATUS_LABEL[job.status]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Stable inspector — same position regardless of which row is
                selected, collapses to a full-screen sheet under 1024px
                (demonstrated live in the interactive prototype, not this
                static seed). */}
            <aside className="h-fit rounded-lg border border-hairline p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Selected job</p>
              <h3 className="mt-1 text-base font-semibold text-ink-primary">{selected.client}</h3>
              <p className="text-sm text-ink-secondary">{selected.address}</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Status</dt>
                  <dd className="text-ink-primary">{STATUS_LABEL[selected.status]}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Value</dt>
                  <dd className="tabular-nums text-ink-primary">{money(selected.valueCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Owner</dt>
                  <dd className="text-ink-primary">{selected.owner}</dd>
                </div>
              </dl>
              <p className="mt-4 border-t border-hairline pt-3 text-sm text-ink-secondary">{selected.nextAction}</p>
              <button type="button" className="mt-4 w-full rounded-md bg-action px-3 py-2 text-sm font-medium text-on-action">
                Open job workspace
              </button>
            </aside>
          </div>

          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-ink-primary">Today</h2>
            <ul className="divide-y divide-hairline rounded-lg border border-hairline text-sm">
              {TODAY_SCHEDULE.map((s) => (
                <li key={s.label} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-16 shrink-0 tabular-nums text-ink-muted">{s.time}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-primary">{s.label}</span>
                  <span className="shrink-0 text-ink-muted">{s.crew}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] border-t border-hairline px-4 py-6 text-sm md:px-6">
        <h2 className="font-semibold text-ink-primary">Where this works</h2>
        <p className="mt-1 max-w-[70ch] text-ink-secondary">
          The job workspace itself (browse → inspect without losing context), and any Office/Estimator
          task that means comparing several jobs while keeping one open. Reads as &ldquo;a real tool,&rdquo;
          not a dashboard.
        </p>
        <h2 className="mt-4 font-semibold text-ink-primary">Where it breaks down</h2>
        <p className="mt-1 max-w-[70ch] text-ink-secondary">
          The two-column layout needs a deliberate breakpoint plan — it cannot just reflow at 1024px,
          it has to choose (stack, or collapse the inspector to a sheet) or the inspector gets
          uncomfortably narrow. Doesn&rsquo;t suit Crew&rsquo;s single-task mobile view at all; that surface should
          look nothing like this.
        </p>
      </div>
    </div>
  );
}
