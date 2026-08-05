import Link from "next/link";
import { VisitStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCompanyContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatAddress } from "@/lib/client-matching";
import { jobAddress, jobClient, jobIdentityInclude } from "@/lib/job-identity";
import { FieldCapturePanel } from "@/components/today/field-capture-panel";
import {
  dayToInstant,
  formatDayLong,
  isSameDay,
  shiftDays,
  todayIn,
} from "@/lib/schedule/day";
import { formatTimeOfDay, utcToZoned, visitCalendarDay } from "@/lib/schedule/timezone";

/**
 * The day, on a phone, in a driveway.
 *
 * The one screen a crew member actually lives in, and the only one in this
 * product designed for someone holding the device in one hand with a ladder in
 * the other. Everything about it is sized for that: one card per visit, one
 * action per card, addresses that open the phone's own maps app rather than
 * asking somebody to retype a postcode with gloves on.
 *
 * It is not a calendar. A calendar answers "what does my week look like"; this
 * answers "where am I going now, and what do I do when I've done it". Those are
 * different questions and the second one does not want a grid.
 *
 * Deliberately absent: money, the client's whole history, other crews' work.
 * A crew member's own scoping already hides most of it — see
 * `lib/permissions.ts` — but this page would not show it either way.
 */
export default async function TodayPage() {
  const { company, user, role } = await requireCompanyContext();
  const seesEveryone = can(role, "viewAllJobs");
  const zone = company.timeZone;

  // "Today" in the company's own zone once it has one — not the server's, and
  // not raw UTC. A crew member in Vancouver whose day starts at 7am UTC is
  // not asking what happened before their own midnight.
  const today = zone ? utcToZoned(new Date(), zone).date : todayIn();

  const mine = seesEveryone ? {} : { assignments: { some: { userId: user.id } } };

  // An all-day visit is stored at UTC midnight of its square; a timed one is a
  // real instant that can land on a different UTC date than its local one —
  // see `lib/schedule/timezone.ts`. Two different storage conventions can't
  // both be captured by one UTC range filter, so the query pulls a window wide
  // enough to contain "today" under any offset and `visitCalendarDay` sorts
  // out which square each visit actually belongs on.
  const windowStart = dayToInstant(shiftDays(today, -1));
  const windowEnd = dayToInstant(shiftDays(today, 2));

  const [windowVisits, upcoming] = await Promise.all([
    prisma.visit.findMany({
      where: {
        companyId: company.id,
        status: { not: VisitStatus.CANCELLED },
        ...mine,
        startAt: { gte: windowStart, lt: windowEnd },
      },
      orderBy: { startAt: "asc" },
      include: { job: { include: jobIdentityInclude } },
    }),
    // What's next, so an empty day isn't a dead end. One visit, not a list —
    // this page is about now, and tomorrow is a footnote on it.
    prisma.visit.findMany({
      where: {
        companyId: company.id,
        status: VisitStatus.SCHEDULED,
        ...mine,
        startAt: { gte: windowStart },
      },
      orderBy: { startAt: "asc" },
      take: 20,
      include: { job: { include: jobIdentityInclude } },
    }),
  ]);

  const todays = windowVisits.filter((visit) => isSameDay(visitCalendarDay(visit, zone), today));
  const next = upcoming.find((visit) => !isSameDay(visitCalendarDay(visit, zone), today)) ?? null;

  const outstanding = todays.filter((visit) => visit.status !== VisitStatus.COMPLETED);

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.18em] text-ink-muted">Today</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink-primary">
          {formatDayLong(today)}
        </h2>
        <p className="mt-2 text-ink-muted">
          {todays.length === 0
            ? "Nothing booked for you today."
            : outstanding.length === 0
              ? "All done. Nice one."
              : `${outstanding.length} to go.`}
        </p>
      </header>

      {todays.length === 0 && next ? (
        <section className="rounded-3xl border border-dashed border-hairline p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">Next up</p>
          <p className="mt-2 text-lg font-medium text-ink-primary">
            {jobClient(next.job).name}
          </p>
          <p className="mt-1 text-sm text-ink-secondary">
            {formatDayLong(visitCalendarDay(next, zone))}
            {!next.allDay && zone ? ` · ${formatTimeOfDay(utcToZoned(next.startAt, zone).minutes)}` : ""}
          </p>
        </section>
      ) : null}

      <ul className="space-y-4">
        {todays.map((visit) => {
          const client = jobClient(visit.job);
          const address = formatAddress(jobAddress(visit.job));
          const done = visit.status === VisitStatus.COMPLETED;
          return (
            <li
              key={visit.id}
              className={`rounded-3xl border border-hairline bg-surface-raised p-5 ${
                done ? "opacity-60" : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-lg font-semibold text-ink-primary">
                    {!visit.allDay && zone ? (
                      <span className="mr-2 text-ink-secondary">
                        {formatTimeOfDay(utcToZoned(visit.startAt, zone).minutes)}
                      </span>
                    ) : null}
                    {visit.title || client.name}
                    {visit.kind === "ASSESSMENT" ? (
                      <span className="ml-2 rounded-full bg-surface-lifted px-2 py-0.5 text-xs font-normal text-ink-secondary">
                        Inspection
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 break-words text-sm text-ink-secondary">
                    {visit.job.name}
                  </p>
                </div>
                {done ? (
                  <span className="shrink-0 rounded-full bg-confirm/10 px-3 py-1 text-xs font-medium text-confirm-fg">
                    Done
                  </span>
                ) : null}
              </div>

              {address ? (
                /* Opens the phone's own maps app. A crew member should never be
                   retyping a postcode with gloves on, and every phone already
                   has a better navigator than anything we would build. */
                <a
                  href={`https://maps.apple.com/?q=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block break-words rounded-xl border border-hairline px-4 py-3 text-sm text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
                >
                  {address}
                  <span className="mt-0.5 block text-xs text-ink-muted">Tap for directions</span>
                </a>
              ) : null}

              {visit.notes ? (
                <p className="mt-3 whitespace-pre-line rounded-xl bg-ground/40 px-4 py-3 text-sm leading-6 text-ink-secondary">
                  {visit.notes}
                </p>
              ) : null}

              {/* Note, photo, mark done — the field-capture group, tolerant of
                  a dropped connection. See `FieldCapturePanel`. */}
              <FieldCapturePanel jobId={visit.jobId} visitId={visit.id} initialDone={done} />

              <div className="mt-3">
                <Link
                  href={`/jobs/${visit.jobId}`}
                  className="block rounded-xl border border-hairline px-5 py-4 text-center text-base font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
                >
                  The job
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      {todays.length === 0 && !next ? (
        <p className="rounded-3xl border border-dashed border-hairline p-10 text-center text-ink-muted">
          Nothing booked. Your boss will put work here when it&rsquo;s scheduled.
        </p>
      ) : null}
    </div>
  );
}
