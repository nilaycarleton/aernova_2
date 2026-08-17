import { ConceptHeader } from "../_shared";
import { DASHBOARD_ACTIONS, JOBS, STATUS_LABEL, TODAY_SCHEDULE, money } from "../../_fixtures";

/**
 * Concept C — "Dossier". Grouped, document-like sections with generous
 * vertical rhythm — still card-light (sections are unframed, divided by
 * spacing and a section rule, not boxes) but paced for a slower, higher-
 * stakes review moment rather than fast scanning. Top nav + a settings-style
 * left rail, no split pane.
 */
const NAV = ["Dashboard", "Jobs", "Today", "Schedule", "Pipeline", "Clients", "Invoices", "Reports"];

export default function ConceptCPage() {
  return (
    <div>
      <ConceptHeader
        eyebrow="Concept C"
        title="Dossier"
        description="Generous rhythm, section rules instead of boxes, a top-anchored identity moment. Paced for a daily-digest read or a high-stakes single-job review, not fast multi-row scanning."
      />
      <div className="border-b border-hairline">
        <nav className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-4 md:px-6">
          {NAV.map((item) => (
            <button
              key={item}
              type="button"
              className={`shrink-0 border-b-2 px-3 py-2.5 text-sm transition-colors ${
                item === "Dashboard"
                  ? "border-ink-primary font-medium text-ink-primary"
                  : "border-transparent text-ink-secondary hover:text-ink-primary"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>
      </div>

      <div className="mx-auto max-w-[900px] px-4 py-10 md:px-6">
        <section>
          <h2 className="text-base font-semibold text-ink-primary">Needs your attention</h2>
          <div className="mt-4 space-y-4">
            {DASHBOARD_ACTIONS.map((a) => (
              <div key={a.id} className="flex items-baseline justify-between gap-4 border-b border-hairline pb-4">
                <div>
                  <p className="text-sm font-medium text-ink-primary">{a.title}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">{a.detail}</p>
                </div>
                <button type="button" className="shrink-0 text-sm font-medium text-ink-secondary hover:text-ink-primary">
                  Review →
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-base font-semibold text-ink-primary">Today</h2>
          <p className="mt-1 text-sm text-ink-secondary">{TODAY_SCHEDULE.length} visits scheduled</p>
          <div className="mt-4 space-y-3">
            {TODAY_SCHEDULE.map((s) => (
              <div key={s.label} className="flex items-baseline gap-4 text-sm">
                <span className="w-16 shrink-0 tabular-nums text-ink-muted">{s.time}</span>
                <span className="flex-1 text-ink-primary">{s.label}</span>
                <span className="shrink-0 text-ink-muted">{s.crew}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-ink-primary">Recent jobs</h2>
            <span className="text-sm text-ink-muted">{JOBS.length} total</span>
          </div>
          <div className="mt-4 space-y-6">
            {JOBS.slice(0, 4).map((job) => (
              <div key={job.id} className="border-b border-hairline pb-6 last:border-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-sm font-medium text-ink-primary">{job.client}</h3>
                  <span className="shrink-0 tabular-nums text-sm text-ink-primary">
                    {job.valueCents ? money(job.valueCents) : "—"}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-ink-muted">{job.address}</p>
                <p className="mt-2 text-sm text-ink-secondary">
                  <span className="font-medium text-ink-primary">{STATUS_LABEL[job.status]}.</span> {job.nextAction}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mx-auto max-w-[1400px] border-t border-hairline px-4 py-6 text-sm md:px-6">
        <h2 className="font-semibold text-ink-primary">Where this works</h2>
        <p className="mt-1 max-w-[70ch] text-ink-secondary">
          Owner&rsquo;s daily digest — a calmer, slower read that still avoids cards. Single-job review
          moments (quote/invoice/warranty) where document-like pacing is the point, not a limitation.
        </p>
        <h2 className="mt-4 font-semibold text-ink-primary">Where it breaks down</h2>
        <p className="mt-1 max-w-[70ch] text-ink-secondary">
          Too much scrolling for Estimator/Office&rsquo;s actual daily task (comparing many jobs at once);
          the top-tab nav doesn&rsquo;t scale to the full approved IA group count without a second overflow
          mechanism, and it competes for the same horizontal space a global search/command entry would
          want.
        </p>
      </div>
    </div>
  );
}
