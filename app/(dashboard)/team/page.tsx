import { headers } from "next/headers";
import { CompanyRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { InviteLink } from "@/components/dashboard/invite-link";
import { ConfirmSubmit } from "@/components/dashboard/confirm-submit";
import {
  createInviteAction,
  removeMemberAction,
  revokeInviteAction,
} from "@/app/(dashboard)/team/actions";
import { PageHeader } from "@/components/ui/page-header";

/**
 * Who's on the team, and how somebody new gets on it.
 *
 * `requireCapability("manageTeam")` guards the whole page rather than each
 * control on it. A crew member who types /team in the address bar is stopped
 * before a single query runs, which is the only version of this that is
 * actually a permission rather than a hidden button.
 */
const ROLE_COPY: Partial<Record<CompanyRole, { label: string; hint: string }>> = {
  OWNER: { label: "Owner", hint: "Everything, including the team and the money." },
  ADMIN: { label: "Admin", hint: "Everything the owner can do." },
  ESTIMATOR: { label: "Estimator", hint: "Prices work, writes quotes, runs the calendar." },
  SALES: { label: "Sales", hint: "Wins work. Sees prices, doesn't run the calendar." },
  VIEWER: { label: "Office", hint: "Reads everything, changes nothing." },
  CREW: { label: "Crew", hint: "Only the jobs they're on. Never sees money." },
};

export default async function TeamPage() {
  const { company } = await requireCapability("manageTeam");

  const [members, invites] = await Promise.all([
    prisma.companyMembership.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "asc" },
      include: { user: true },
    }),
    prisma.companyInvite.findMany({
      where: { companyId: company.id, acceptedAt: null, revokedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const host = (await headers()).get("host") ?? "localhost:3000";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  const now = new Date();

  return (
    <div className="min-w-0 space-y-8">
      <PageHeader
        eyebrow="Team"
        title="Who works here"
        description="Crew see the jobs they're booked on and nothing else — no prices, no margins, no other crews' work."
      />

      <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
        <h3 className="text-lg font-semibold text-ink-primary">Add someone</h3>
        {/* No Send button. We can't send a text, and a button claiming we did
            would be the worst lie this screen could tell somebody waiting on a
            new hire. Same call as the quote share panel. */}
        <p className="mb-4 mt-1 max-w-2xl text-sm text-ink-muted">
          Makes a link you send them yourself — text, WhatsApp, however you normally
          reach them. They tap it, make an account, and they&rsquo;re on the team.
        </p>

        <form action={createInviteAction} className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="invite-label" className="mb-1.5 block text-xs font-medium text-ink-secondary">
              Who&rsquo;s it for
            </label>
            <input
              id="invite-label"
              name="label"
              type="text"
              placeholder="Dave"
              className="w-full rounded-xl border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-signal-blue"
            />
          </div>
          <div>
            <label htmlFor="invite-role" className="mb-1.5 block text-xs font-medium text-ink-secondary">
              What they do
            </label>
            <select
              id="invite-role"
              name="role"
              defaultValue="CREW"
              className="rounded-xl border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary"
            >
              {(["CREW", "ESTIMATOR", "SALES", "VIEWER", "ADMIN"] as const).map((role) => (
                <option key={role} value={role}>
                  {ROLE_COPY[role]?.label ?? role}
                </option>
              ))}
            </select>
          </div>
          <SubmitButton
            pendingText="Making the link…"
            className="rounded-xl bg-ink-primary px-5 py-2.5 text-sm font-semibold text-ground transition hover:bg-ink-secondary disabled:opacity-60"
          >
            Make a link
          </SubmitButton>
        </form>

        {invites.length > 0 ? (
          <ul className="mt-5 space-y-4 border-t border-hairline pt-5">
            {invites.map((invite) => {
              const expired = invite.expiresAt < now;
              return (
                <li key={invite.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p className="text-sm text-ink-primary">
                      {invite.label || "Unnamed"}{" "}
                      <span className="text-ink-muted">
                        · {ROLE_COPY[invite.role]?.label ?? invite.role}
                      </span>
                    </p>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${expired ? "text-caution-fg" : "text-ink-muted"}`}>
                        {expired
                          ? "Expired"
                          : `Good until ${invite.expiresAt.toLocaleDateString("en-CA", { dateStyle: "medium" })}`}
                      </span>
                      <form action={revokeInviteAction}>
                        <input type="hidden" name="inviteId" value={invite.id} />
                        {/* Impeccable audit finding (live at 420px): no
                            minimum touch-target height, same gap Phase 4
                            already found and fixed on the Jobs list. */}
                        <SubmitButton
                          pendingText="…"
                          className="inline-flex min-h-11 items-center text-xs text-ink-muted underline underline-offset-2 transition hover:text-danger-fg"
                        >
                          Cancel
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                  {!expired ? (
                    <div className="mt-2">
                      <InviteLink url={`${origin}/join/${invite.token}`} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
        <h3 className="text-lg font-semibold text-ink-primary">On the team</h3>
        <ul className="mt-4 divide-y divide-hairline border-t border-hairline">
          {members.map((member) => {
            const name =
              [member.user.firstName, member.user.lastName].filter(Boolean).join(" ") ||
              member.user.email;
            return (
              <li key={member.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-primary">{name}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {ROLE_COPY[member.role]?.hint ?? member.role}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-surface-lifted px-2.5 py-1 text-xs font-medium text-ink-secondary">
                  {ROLE_COPY[member.role]?.label ?? member.role}
                </span>
                {member.role !== CompanyRole.OWNER ? (
                  <form action={removeMemberAction}>
                    <input type="hidden" name="membershipId" value={member.id} />
                    {/* No confirmation existed here before — a genuine,
                        flagged pre-existing gap (Phase 5 inventory), not a
                        migrated window.confirm(). Added per the route's own
                        "irreversible actions require confirmation" doctrine:
                        their account survives, but what ends is their way in
                        to this company's work, worth saying before the click. */}
                    <ConfirmSubmit
                      pendingText="Removing…"
                      question={`Remove ${name} from this company? Their account stays theirs, but they'll lose access to this company's jobs, clients, and schedule.`}
                      className="inline-flex min-h-11 shrink-0 items-center text-xs text-ink-muted underline underline-offset-2 transition hover:text-danger-fg"
                    >
                      Remove
                    </ConfirmSubmit>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
