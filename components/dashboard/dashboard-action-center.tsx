import { List, ListItem } from "@astryxdesign/core/List";
import { EmptyState } from "@/components/ui/empty-state";
import type { ActionCenterItem, ActionCenterTone } from "@/lib/dashboard-action-center";

const TONE_DOT: Record<ActionCenterTone, string> = {
  danger: "bg-danger",
  caution: "bg-caution",
  info: "bg-info",
  neutral: "bg-ink-muted",
};

/**
 * docs/AERNOVA_PROJECT_WORKFLOW.md §3/§11/§15/§25 Phase 12 — the one
 * "needs your attention" list, replacing the dashboard's previously
 * separate `ReceivablesSummary`/`NewRequestsSummary` tiles (which said the
 * same two facts this now says once). `PipelineSnapshot` and
 * `RevenueTrendSummary` stay where they are — a stage-by-stage breakdown
 * and a revenue trend are "where things stand" reading, not an attention
 * list, so they don't compete with this.
 *
 * `List`/`ListItem` are the same Astryx primitives `RecentActivity` and
 * the notification bell's own dropdown already use for a link-row list —
 * this reuses that exact pattern rather than a hand-rolled `<ul>`. Every
 * row's `href` already points at the exact filtered work (see
 * `lib/dashboard-action-center.ts`), never a generic page the owner still
 * has to search from.
 */
export function DashboardActionCenter({ items }: { items: ActionCenterItem[] }) {
  return (
    <section className="min-w-0 rounded-2xl border border-hairline bg-surface-raised p-6">
      <h2 className="text-sm font-semibold text-ink-primary">Needs attention</h2>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState kind="clear" title="Nothing needs your attention right now." compact />
        </div>
      ) : (
        <div className="mt-3">
          <List hasDividers density="compact">
            {items.map((item) => (
              <ListItem
                key={item.id}
                label={item.title}
                description={item.description}
                href={item.href}
                startContent={
                  <span
                    aria-hidden="true"
                    className={`block h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[item.tone]}`}
                  />
                }
                endContent={
                  item.count != null ? (
                    <span className="text-sm tabular-nums text-ink-secondary">{item.count}</span>
                  ) : undefined
                }
              />
            ))}
          </List>
        </div>
      )}
    </section>
  );
}
