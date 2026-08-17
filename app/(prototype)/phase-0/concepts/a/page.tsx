import { ConceptHeader } from "../_shared";
import { DASHBOARD_ACTIONS, JOBS, STATUS_LABEL, STATUS_TIER, money } from "../../_fixtures";

/**
 * Concept A — "Ledger". Maximum density, table-first, almost no containers.
 * Icon-only nav rail by default (labels on hover/focus). Toolbar-driven
 * actions instead of per-row buttons. Optimized for scanning many jobs fast —
 * an estimator's or owner's power-user view, not a first-open experience.
 */
const NAV = [
  { icon: "▣", label: "Dashboard" },
  { icon: "⚙", label: "Pipeline" },
  { icon: "☷", label: "Jobs", active: true },
  { icon: "◯", label: "Schedule" },
  { icon: "¤", label: "Invoices" },
  { icon: "△", label: "Reports" },
];

function severityDot(sev: "warning" | "danger" | "info") {
  if (sev === "danger") return "bg-danger";
  if (sev === "warning") return "bg-caution";
  return "bg-info";
}

export default function ConceptAPage() {
  return (
    <div>
      <ConceptHeader
        eyebrow="Concept A"
        title="Ledger"
        description="Density first. A 44px icon-only nav rail, one toolbar, and a full-width table with no card wrapping anything. Every row is scannable; nothing floats."
      />
      <div className="mx-auto flex max-w-[1400px] gap-0 px-4 pb-16 md:px-6">
        <nav className="mr-4 flex w-11 shrink-0 flex-col items-center gap-1 border-r border-hairline py-2">
          {NAV.map((item) => (
            <button
              key={item.label}
              type="button"
              title={item.label}
              aria-label={item.label}
              className={`flex h-9 w-9 items-center justify-center rounded-md text-base transition-colors ${
                item.active
                  ? "bg-surface-lifted text-ink-primary"
                  : "text-ink-muted hover:bg-surface-raised hover:text-ink-secondary"
              }`}
            >
              <span aria-hidden="true">{item.icon}</span>
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          {/* Action strip: one line per item, no cards, severity carried by a
              4px dot + text (never color alone) and by weight. */}
          <div className="mb-4 divide-y divide-hairline border-y border-hairline text-sm">
            {DASHBOARD_ACTIONS.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-2 py-2">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${severityDot(a.severity)}`} aria-hidden="true" />
                <span className="font-medium text-ink-primary">{a.title}</span>
                <span className="text-ink-muted">&middot; {a.detail}</span>
              </div>
            ))}
          </div>

          {/* Toolbar: filters + count, no button chrome beyond a hairline. */}
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
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

          <div className="overflow-x-auto border-y border-hairline">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs text-ink-muted">
                  <th className="px-2 py-1.5 font-medium">Client</th>
                  <th className="px-2 py-1.5 font-medium">Status</th>
                  <th className="px-2 py-1.5 font-medium">Next action</th>
                  <th className="px-2 py-1.5 font-medium">Owner</th>
                  <th className="px-2 py-1.5 text-right font-medium">Value</th>
                  <th className="px-2 py-1.5 text-right font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {JOBS.map((job) => (
                  <tr
                    key={job.id}
                    tabIndex={0}
                    className="cursor-pointer border-b border-hairline transition-colors last:border-0 hover:bg-surface-raised focus-visible:bg-surface-raised focus-visible:outline-none"
                  >
                    <td className="px-2 py-1.5 font-medium text-ink-primary">{job.client}</td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs ${
                          STATUS_TIER[job.status] === "complete"
                            ? "bg-confirm/10 text-confirm-fg"
                            : "bg-surface-lifted text-ink-secondary"
                        }`}
                      >
                        {STATUS_LABEL[job.status]}
                      </span>
                    </td>
                    <td className="max-w-[240px] truncate px-2 py-1.5 text-ink-secondary">{job.nextAction}</td>
                    <td className="px-2 py-1.5 text-ink-secondary">{job.owner}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-ink-primary">
                      {job.valueCents ? money(job.valueCents) : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-right text-ink-muted">{job.updatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] border-t border-hairline px-4 py-6 text-sm md:px-6">
        <h2 className="font-semibold text-ink-primary">Where this works</h2>
        <p className="mt-1 max-w-[70ch] text-ink-secondary">
          Estimator/Office scanning 20+ jobs a day. Owner doing a fast morning pass. Anywhere the task
          is &ldquo;find the one row that needs me,&rdquo; not &ldquo;get oriented.&rdquo;
        </p>
        <h2 className="mt-4 font-semibold text-ink-primary">Where it breaks down</h2>
        <p className="mt-1 max-w-[70ch] text-ink-secondary">
          Icon-only nav has real memorability cost for infrequent users (Sales, occasional Crew
          desktop use) even with tooltips. First-open/onboarding moments need more orientation than
          this gives. Mobile requires the icon rail to fully disappear, not just collapse — it doesn&rsquo;t
          shrink gracefully below 768px.
        </p>
      </div>
    </div>
  );
}
