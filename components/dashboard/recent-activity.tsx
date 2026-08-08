import { List, ListItem } from "@astryxdesign/core/List";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { prisma } from "@/lib/prisma";
import { describeActivity } from "@/lib/activity";
import { personName } from "@/lib/job-identity";

/**
 * The company's history, read back for the first time. `recordActivity()` has
 * written an `ActivityEvent` on every phase of this build — job creation,
 * quotes sent/approved/declined, invoices raised/paid, reminders — and
 * `describeActivity()` has always turned each one into a plain-language
 * sentence. Nothing ever displayed it: no job timeline, no client feed, no
 * dashboard section. This is that first reader, chosen over a bigger
 * dashboard expansion because the data and the copy already existed —
 * building the display, not inventing the content.
 *
 * List/ListItem/Timestamp are Astryx primitives (Phase 3 of the Astryx
 * integration); the outer panel stays hand-built at `rounded-2xl` to match
 * DESIGN.md's own panel radius, which has no Astryx equivalent (see
 * lib/astryx/theme.ts's radius comment).
 */
export async function RecentActivity({ companyId }: { companyId: string }) {
  const events = await prisma.activityEvent.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const actorIds = [...new Set(events.map((event) => event.actorUserId).filter((id) => id != null))];
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    : [];
  const actorNameById = new Map(actors.map((actor) => [actor.id, personName(actor)]));

  return (
    <section className="min-w-0 rounded-2xl border border-hairline bg-surface-raised p-6">
      <h2 className="text-sm font-semibold text-ink-primary">Recent activity</h2>

      {events.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-hairline p-8 text-center text-sm text-ink-muted">
          Nothing yet. Activity shows up here as quotes get sent, invoices get paid, and jobs move
          along.
        </p>
      ) : (
        <div className="mt-3">
          <List hasDividers density="compact">
            {events.map((event) => {
              const actor = event.actorUserId ? actorNameById.get(event.actorUserId) : undefined;
              return (
                <ListItem
                  key={event.id}
                  label={describeActivity(event, actor)}
                  href={event.jobId ? `/jobs/${event.jobId}` : undefined}
                  endContent={<Timestamp value={event.createdAt.toISOString()} format="relative" />}
                />
              );
            })}
          </List>
        </div>
      )}
    </section>
  );
}
