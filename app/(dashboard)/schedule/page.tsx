import Link from "next/link";
import { VisitStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCompanyContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatAddress } from "@/lib/client-matching";
import { jobAddress, jobClient, jobIdentityInclude, personName } from "@/lib/job-identity";
import { shareUrl as buildShareUrl } from "@/lib/share-token";
import { headers } from "next/headers";
import {
  dayToInstant,
  formatDayLong,
  formatDayShort,
  formatMonth,
  isSameDay,
  monthGrid,
  parseDayInput,
  shiftDays,
  shiftMonths,
  todayIn,
  toDayInput,
  weekOf,
  type CalendarDate,
} from "@/lib/schedule/day";
import { formatDateKey } from "@/lib/schedule/recurrence";
import {
  CANADIAN_TIME_ZONES,
  formatTimeOfDay,
  utcToZoned,
  visitCalendarDay,
} from "@/lib/schedule/timezone";
import { CalendarFeedPanel } from "@/components/dashboard/calendar-feed-panel";
import { DraggableVisit, DropDay } from "@/components/dashboard/visit-drag";
import { FilterPill } from "@/components/dashboard/filter-pill";
import { TeamFilterSelect } from "@/components/dashboard/team-filter-select";
import { setCompanyTimeZoneAction } from "@/app/(dashboard)/schedule/actions";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { findOverbookedDays, findOverlappingAssignments } from "@/lib/schedule/double-booking";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * The schedule.
 *
 * **Week** (the shape of what's coming), **Month** (how full the season
 * looks), **Schedule** (a plain list, the one that actually works on a phone),
 * and — once the company has said which clock it runs on — **Day**, an hour
 * grid with an `Anytime` lane above it for visits with no set time. Day earned
 * its place the moment `Company.timeZone` landed: an hour grid over dateless
 * visits is a screen of empty gridlines with two cards floating in it, which
 * is exactly why it waited. Year is a date picker rather than a schedule —
 * Google's own year view shows no events at all — so it stays out.
 */
type View = "week" | "month" | "agenda" | "day";

const VIEWS: { key: View; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "agenda", label: "Schedule" },
];

/** How far a plain list looks ahead before it stops being a list. */
const AGENDA_DAYS = 90;

/**
 * Cancelled is missing on purpose — the visit query already excludes it by
 * default (see the `status: { not: CANCELLED }` clause below), and a filter
 * offering to show what's already hidden would be a filter that lies.
 */
const STATUS_FILTERS = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "MISSED"] as const;
const STATUS_FILTER_LABEL: Record<(typeof STATUS_FILTERS)[number], string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Done",
  MISSED: "Missed",
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; kind?: string; team?: string; status?: string }>;
}) {
  const { view: viewParam, date: dateParam, kind: kindParam, team: teamParam, status: statusParam } =
    await searchParams;
  const { company, user, role } = await requireCompanyContext();
  // Crew see the days they are actually on, not the company's whole week.
  const seesEveryone = can(role, "viewAllJobs");
  const zone = company.timeZone;
  const runsSchedule = can(role, "manageSchedule");

  // Filters are an office tool — a crew member's own scoping already narrows
  // them to their own visits, and a full team roster in a dropdown is a
  // roster crew have no reason to see. Absent, not disabled, same as the
  // double-booking banner just above them.
  const kindFilter = kindParam === "ASSESSMENT" || kindParam === "WORK" ? kindParam : null;
  const statusFilter = (STATUS_FILTERS as readonly string[]).includes(statusParam ?? "")
    ? (statusParam as (typeof STATUS_FILTERS)[number])
    : null;
  const teamFilter = runsSchedule && teamParam ? teamParam : null;

  /**
   * Every current filter/view/date, so a link can change exactly one thing
   * and carry the rest — `undefined` means "keep it," `null` means "clear
   * it," matching every other overrides object in this file.
   */
  function scheduleHref(overrides: {
    view?: string;
    date?: string;
    kind?: string | null;
    team?: string | null;
    status?: string | null;
  }) {
    const params = new URLSearchParams();
    params.set("view", overrides.view ?? view);
    const date = overrides.date ?? toDayInput(anchor);
    if (date) params.set("date", date);
    const kind = overrides.kind === undefined ? kindFilter : overrides.kind;
    const team = overrides.team === undefined ? teamFilter : overrides.team;
    const status = overrides.status === undefined ? statusFilter : overrides.status;
    if (kind) params.set("kind", kind);
    if (team) params.set("team", team);
    if (status) params.set("status", status);
    return `/schedule?${params.toString()}`;
  }

  // Day only exists once there's a clock to draw the grid in.
  const view: View =
    viewParam === "month" || viewParam === "agenda" || viewParam === "week" || (viewParam === "day" && zone)
      ? viewParam
      : "week";
  // "Today" in the company's own zone once it has one, never the server's.
  const today = zone ? utcToZoned(new Date(), zone).date : todayIn();
  const anchor = parseDayInput(dateParam ?? "") ?? today;

  const days =
    view === "week" ? weekOf(anchor) : view === "month" ? monthGrid(anchor) : view === "day" ? [anchor] : [];

  const from = view === "agenda" ? anchor : days[0];
  const to = view === "agenda" ? shiftDays(anchor, AGENDA_DAYS) : days[days.length - 1];

  // An all-day visit is stored at UTC midnight of its square; a timed one is a
  // real instant that can land on a different UTC date than its local one.
  // One UTC range can't capture both conventions exactly, so the query window
  // is widened by a day on each side and `visitCalendarDay` buckets precisely
  // — see `lib/schedule/timezone.ts`.
  const visits = await prisma.visit.findMany({
    where: {
      companyId: company.id,
      status: { not: VisitStatus.CANCELLED },
      ...(seesEveryone ? {} : { assignments: { some: { userId: user.id } } }),
      startAt: {
        gte: dayToInstant(shiftDays(from, -1)),
        lt: dayToInstant(shiftDays(to, 2)),
      },
    },
    orderBy: { startAt: "asc" },
    include: { job: { include: jobIdentityInclude }, assignments: { include: { user: true } } },
  });

  // Re-filter to the visible window: the query fetched a day of padding on
  // each side purely so a boundary visit could be bucketed onto the right
  // square, not so it could leak into a square nobody asked to see.
  const visibleVisits = visits.filter((visit) => {
    const key = formatDateKey(visitCalendarDay(visit, zone));
    return key >= formatDateKey(from) && key <= formatDateKey(to);
  });

  // Who could go on a visit at all — the double-booking heads-up reads its
  // length as "how many hands does this company have," and the Team filter
  // reads it as a picklist. Office-only: crew have no reason to see the
  // roster (`viewAllJobs` is the same test the sidebar's own nav uses).
  const team = runsSchedule
    ? (
        await prisma.companyMembership.findMany({
          where: { companyId: company.id },
          orderBy: { createdAt: "asc" },
          include: { user: true },
        })
      ).map((member) => ({ userId: member.userId, name: personName(member.user) }))
    : [];

  // Filters narrow what's *drawn*, never what's counted for the double-
  // booking warnings below — a heads-up about Dave shouldn't disappear just
  // because somebody filtered the view down to Priya's jobs.
  const renderedVisits = visibleVisits.filter((visit) => {
    if (kindFilter && visit.kind !== kindFilter) return false;
    if (statusFilter && visit.status !== statusFilter) return false;
    if (teamFilter && !visit.assignments.some((a) => a.userId === teamFilter)) return false;
    return true;
  });

  const byDay = new Map<string, typeof visits>();
  for (const visit of renderedVisits) {
    const key = formatDateKey(visitCalendarDay(visit, zone));
    const bucket = byDay.get(key);
    if (bucket) bucket.push(visit);
    else byDay.set(key, [visit]);
  }

  const step =
    view === "month"
      ? shiftMonths
      : (date: CalendarDate, n: number) =>
          shiftDays(date, n * (view === "week" ? 7 : view === "day" ? 1 : AGENDA_DAYS));
  const previous = toDayInput(step(anchor, -1));
  const next = toDayInput(step(anchor, 1));

  const heading =
    view === "month"
      ? formatMonth(anchor)
      : view === "agenda"
        ? `From ${formatDayShort(anchor)}`
        : view === "day"
          ? formatDayLong(anchor)
          : `${formatDayShort(days[0])} – ${formatDayShort(days[6])}`;

  const host = (await headers()).get("host") ?? "localhost:3000";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  const feedUrl = company.calendarToken
    ? buildShareUrl("calendar", company.calendarToken, origin)
    : null;

  // Non-blocking — a company running two trucks with three people on the
  // schedule is a fact worth knowing, not a booking to refuse. See
  // `lib/schedule/double-booking.ts`. Reads the unfiltered set on purpose —
  // see the comment on `renderedVisits` above.
  const overlaps = runsSchedule ? findOverlappingAssignments(visibleVisits, zone) : [];
  const overbookedDays = runsSchedule ? findOverbookedDays(visibleVisits, team.length, zone) : [];

  return (
    <div className="min-w-0 space-y-8">
      <PageHeader
        eyebrow="Schedule"
        title={heading}
        description={
          renderedVisits.length === 0
            ? "Nothing booked here."
            : `${renderedVisits.length} ${renderedVisits.length === 1 ? "visit" : "visits"}.`
        }
        primaryAction={
          <div className="flex flex-wrap items-center gap-2">
            {/* Views are links, so each one is a place with a URL — the browser's
                own Back button then does what everybody expects it to. */}
            <div className="flex flex-wrap gap-1 rounded-lg border border-hairline p-1">
              {VIEWS.filter((option) => option.key !== "day" || zone).map((option) => (
                <Link
                  key={option.key}
                  href={scheduleHref({ view: option.key })}
                  aria-current={view === option.key ? "page" : undefined}
                  className={`rounded-lg px-3 py-1.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument ${
                    view === option.key
                      ? "bg-surface-lifted font-medium text-ink-primary"
                      : "text-ink-secondary hover:text-ink-primary"
                  }`}
                >
                  {option.label}
                </Link>
              ))}
            </div>

            <nav aria-label="Move through the calendar" className="flex items-center gap-2">
              <Nav href={scheduleHref({ date: previous })} label="Previous">←</Nav>
              <Nav href={scheduleHref({ date: toDayInput(today) })}>Today</Nav>
              <Nav href={scheduleHref({ date: next })} label="Next">→</Nav>
            </nav>
          </div>
        }
      />

      {runsSchedule ? (
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill
            href={scheduleHref({ kind: null, team: null, status: null })}
            active={!kindFilter && !teamFilter && !statusFilter}
          >
            All visits
          </FilterPill>
          {(["WORK", "ASSESSMENT"] as const).map((option) => (
            <FilterPill
              key={option}
              href={scheduleHref({ kind: kindFilter === option ? null : option })}
              active={kindFilter === option}
            >
              {option === "WORK" ? "Work" : "Inspection"}
            </FilterPill>
          ))}
          {STATUS_FILTERS.map((option) => (
            <FilterPill
              key={option}
              href={scheduleHref({ status: statusFilter === option ? null : option })}
              active={statusFilter === option}
            >
              {STATUS_FILTER_LABEL[option]}
            </FilterPill>
          ))}
          {team.length > 0 ? (
            <TeamFilterSelect
              href={scheduleHref({ team: null })}
              current={teamFilter ?? ""}
              team={team}
            />
          ) : null}
        </div>
      ) : null}

      {/* Asks rather than guesses — a crew shown 7am for an 8am start because
          the server runs in UTC arrives an hour late, and the mistake stays
          invisible until the day the clocks change. Nothing downstream (start
          times, Day view) works until this is answered once. */}
      {!zone && runsSchedule ? (
        <form
          action={setCompanyTimeZoneAction}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-hairline bg-surface-raised p-5"
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="company-timezone" className="mb-1.5 block text-sm font-medium text-ink-primary">
              What time zone do you work in?
            </label>
            <p className="mb-2 text-sm text-ink-muted">
              Needed once, before a visit can carry a start time or the Day view
              can open. Visits stay day-only until you set this.
            </p>
            <select id="company-timezone" name="timeZone" defaultValue="" className="w-full max-w-xs rounded-md border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition focus:border-signal-blue sm:w-auto">
              <option value="" disabled>
                Choose a time zone…
              </option>
              {CANADIAN_TIME_ZONES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <SubmitButton
            pendingText="Saving…"
            className="rounded-md bg-action px-5 py-2.5 text-sm font-semibold text-on-action transition hover:bg-action-active disabled:opacity-60"
          >
            Save
          </SubmitButton>
        </form>
      ) : null}

      {/* Non-blocking, and only for whoever runs the calendar — a heads-up,
          not a wall in front of booking. See `lib/schedule/double-booking.ts`. */}
      {overlaps.length > 0 || overbookedDays.length > 0 ? (
        <section className="rounded-lg border border-caution/30 bg-caution/10 p-5">
          <p className="text-sm font-medium text-caution-fg">Heads up</p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-secondary">
            {overlaps.map((conflict, index) => (
              <li key={index}>
                {conflict.userName} is booked on two jobs {formatDayLong(conflict.day)}:{" "}
                {conflict.jobNames.join(" and ")}.
              </li>
            ))}
            {overbookedDays.map((day) => (
              <li key={formatDateKey(day.day)}>
                {formatDayLong(day.day)} has {day.visitCount} visits booked but only{" "}
                {day.crewCount} {day.crewCount === 1 ? "person" : "people"} on the team.
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {view === "day" ? (
        <DayGrid day={anchor} zone={zone!} visits={byDay.get(formatDateKey(anchor)) ?? []} />
      ) : null}

      {view === "week" ? (
        <div className="grid gap-3 lg:grid-cols-7">
          {days.map((day) => (
            <DayColumn
              key={formatDateKey(day)}
              day={day}
              today={today}
              zone={zone}
              visits={byDay.get(formatDateKey(day)) ?? []}
              canDrag={runsSchedule}
            />
          ))}
        </div>
      ) : null}

      {view === "month" ? (
        <div className="overflow-x-auto">
          <div className="grid min-w-[44rem] grid-cols-7 gap-px rounded-lg border border-hairline bg-hairline">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
              <div key={label} className="bg-surface-raised px-2 py-2 text-xs font-medium text-ink-muted">
                {label}
              </div>
            ))}
            {days.map((day) => {
              const dayVisits = byDay.get(formatDateKey(day)) ?? [];
              const isToday = isSameDay(day, today);
              // Neighbouring months are dimmed rather than blank: a job on the
              // 1st is a job you need to see while looking at the 30th.
              const outside = day.month !== anchor.month;
              const cell = (
                <div
                  className={`min-h-24 bg-surface-raised p-2 ${outside ? "opacity-45" : ""} ${
                    isToday ? "bg-surface-lifted" : ""
                  }`}
                >
                  <p className={`text-xs ${isToday ? "font-semibold text-ink-primary" : "text-ink-secondary"}`}>
                    {day.day}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {dayVisits.slice(0, 3).map((visit) => {
                      const link = (
                        <Link
                          href={`/jobs/${visit.jobId}`}
                          className="block truncate rounded-md bg-surface-lifted px-1.5 py-1 text-xs text-ink-primary transition hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
                        >
                          {visit.title || jobClient(visit.job).name}
                        </Link>
                      );
                      return (
                        <li key={visit.id}>
                          {runsSchedule ? (
                            <DraggableVisit
                              jobId={visit.jobId}
                              visitId={visit.id}
                              visitLabel={visit.title || jobClient(visit.job).name}
                            >
                              {link}
                            </DraggableVisit>
                          ) : (
                            link
                          )}
                        </li>
                      );
                    })}
                    {/* Truncation is named rather than silent — a square that
                        quietly hides the fourth job is a square that loses it. */}
                    {dayVisits.length > 3 ? (
                      <li className="px-1.5 text-xs text-ink-muted">
                        +{dayVisits.length - 3} more
                      </li>
                    ) : null}
                  </ul>
                </div>
              );
              return (
                <div key={formatDateKey(day)}>
                  {runsSchedule ? (
                    <DropDay day={formatDateKey(day)} className="h-full">
                      {cell}
                    </DropDay>
                  ) : (
                    cell
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {view === "agenda" ? (
        renderedVisits.length === 0 ? (
          <EmptyState kind="first-use" title="Nothing booked in the next three months." />
        ) : (
          <ul className="divide-y divide-hairline rounded-lg border border-hairline bg-surface-raised">
            {[...byDay.entries()].map(([key, dayVisits]) => {
              const day = parseDayInput(key)!;
              return (
                <li key={key} className="flex flex-col gap-3 p-4 sm:flex-row sm:gap-6">
                  <p
                    className={`shrink-0 text-sm sm:w-48 ${
                      isSameDay(day, today) ? "font-semibold text-ink-primary" : "text-ink-secondary"
                    }`}
                  >
                    {formatDayLong(day)}
                  </p>
                  <ul className="min-w-0 flex-1 space-y-2">
                    {dayVisits.map((visit) => (
                      <li key={visit.id}>
                        <Link
                          href={`/jobs/${visit.jobId}`}
                          className="block rounded-lg px-2 py-1 transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
                        >
                          <span className="block text-sm font-medium text-ink-primary">
                            {!visit.allDay && zone ? (
                              <span className="mr-2 font-normal text-ink-muted">
                                {formatTimeOfDay(utcToZoned(visit.startAt, zone).minutes)}
                              </span>
                            ) : null}
                            {visit.title || jobClient(visit.job).name}
                            {visit.kind === "ASSESSMENT" ? (
                              <span className="ml-2 rounded-full bg-surface-lifted px-2 py-0.5 text-xs font-normal text-ink-secondary">
                                Inspection
                              </span>
                            ) : null}
                          </span>
                          {formatAddress(jobAddress(visit.job)) ? (
                            <span className="mt-0.5 block text-xs text-ink-muted">
                              {formatAddress(jobAddress(visit.job))}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )
      ) : null}

      {/* The feed is the company's schedule, so it is the company's to hand
          out. A crew member subscribing to it would be subscribing to
          everyone's week. */}
      {seesEveryone ? <CalendarFeedPanel feedUrl={feedUrl} /> : null}

      <p className="text-sm text-ink-muted">
        {zone
          ? "Visits are booked on a job — open one and pick a day, with a start time if you know it."
          : "Visits are booked on a job — open one and pick a date. Set a time zone above to add start times and the Day view."}
      </p>
    </div>
  );
}

function DayColumn({
  day,
  today,
  zone,
  visits,
  canDrag,
}: {
  day: CalendarDate;
  today: CalendarDate;
  /** Null until the company sets one — visits show no time label without it. */
  zone: string | null;
  visits: GridVisit[];
  /** `manageSchedule` — the only role check a drag-and-drop cursor gets. */
  canDrag: boolean;
}) {
  const isToday = isSameDay(day, today);
  const cards = (
    <ul className="mt-3 space-y-2">
      {visits.map((visit) => {
        const card = (
          <VisitCard
            visit={visit}
            timeLabel={!visit.allDay && zone ? formatTimeOfDay(utcToZoned(visit.startAt, zone).minutes) : undefined}
          />
        );
        return (
          <li key={visit.id}>
            {canDrag ? (
              <DraggableVisit
                jobId={visit.jobId}
                visitId={visit.id}
                visitLabel={visit.title || jobClient(visit.job).name}
              >
                {card}
              </DraggableVisit>
            ) : (
              card
            )}
          </li>
        );
      })}
    </ul>
  );

  const section = (
    <section
      aria-label={formatDayLong(day)}
      className={`min-w-0 rounded-lg border border-hairline p-3 ${
        isToday ? "bg-surface-lifted" : "bg-surface-raised"
      }`}
    >
      <h3 className="flex items-baseline justify-between gap-2">
        <span className={`text-sm ${isToday ? "font-semibold text-ink-primary" : "text-ink-secondary"}`}>
          {formatDayShort(day)}
        </span>
        {isToday ? <span className="text-xs font-medium text-ink-secondary">Today</span> : null}
      </h3>

      {cards}

      {/* A gap you can see is a gap you can fill. */}
      {visits.length === 0 ? <p className="py-3 text-xs text-ink-muted">Free</p> : null}
    </section>
  );

  return canDrag ? <DropDay day={formatDateKey(day)}>{section}</DropDay> : section;
}

type GridVisit = {
  id: string;
  jobId: string;
  title: string | null;
  status: VisitStatus;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  kind: string;
  job: Parameters<typeof jobClient>[0] & Parameters<typeof jobAddress>[0] & { name: string };
};

/**
 * Day, on its own — the view that only exists once `Company.timeZone` does.
 * A list of hours rather than a pixel-positioned grid: this app already
 * trusts a list to carry a day (`DayColumn`, the agenda view), and a list
 * has none of a positioned grid's failure modes — overlapping cards, a tap
 * target smaller than a finger, a focus order that doesn't match what's on
 * screen. The `Anytime` lane sits above it for visits with no set time, which
 * is where Jobber's own Day view puts the same thing.
 */
function DayGrid({ day, zone, visits }: { day: CalendarDate; zone: string; visits: GridVisit[] }) {
  const anytime = visits.filter((visit) => visit.allDay);
  const timed = visits.filter((visit) => !visit.allDay);

  const startHours = timed.map((visit) => Math.floor(utcToZoned(visit.startAt, zone).minutes / 60));
  const firstHour = Math.min(6, ...startHours);
  const lastHour = Math.max(20, ...startHours);
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i);

  if (visits.length === 0) {
    return <EmptyState kind="first-use" title={`Free — nothing booked ${formatDayShort(day)}.`} compact />;
  }

  return (
    <div className="space-y-4">
      {/* Only rendered once there's something without a set time — an empty
          "Anytime" shelf above a full hour grid is a second way of saying
          the same nothing the grid already shows. */}
      {anytime.length > 0 ? (
        <section aria-label="Anytime" className="rounded-lg border border-hairline bg-surface-raised p-3">
          <h3 className="text-xs font-medium uppercase tracking-[0.1em] text-ink-muted">Anytime</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {anytime.map((visit) => (
              <li key={visit.id}>
                <VisitCard visit={visit} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ol className="divide-y divide-hairline rounded-lg border border-hairline bg-surface-raised">
        {hours.map((hour) => {
          const hourVisits = timed.filter(
            (visit) => Math.floor(utcToZoned(visit.startAt, zone).minutes / 60) === hour
          );
          return (
            <li key={hour} className="flex gap-4 p-3">
              <span className="w-14 shrink-0 pt-1 text-xs text-ink-muted">
                {formatTimeOfDay(hour * 60)}
              </span>
              <div className="min-w-0 flex-1">
                {hourVisits.length === 0 ? (
                  <div className="h-2" aria-hidden />
                ) : (
                  <ul className="space-y-2">
                    {hourVisits.map((visit) => (
                      <li key={visit.id}>
                        <VisitCard
                          visit={visit}
                          timeLabel={`${formatTimeOfDay(utcToZoned(visit.startAt, zone).minutes)}–${formatTimeOfDay(utcToZoned(visit.endAt, zone).minutes)}`}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * The link only — no `<li>` of its own. Every call site sits it inside a list
 * item itself now, because a draggable one needs `<li><DraggableVisit><a>`
 * and a `<li>` half way down that chain is invalid HTML.
 */
function VisitCard({ visit, timeLabel }: { visit: GridVisit; timeLabel?: string }) {
  const done = visit.status === VisitStatus.COMPLETED;
  const address = formatAddress(jobAddress(visit.job));
  return (
    <Link
      href={`/jobs/${visit.jobId}`}
      className={`block rounded-lg border border-hairline p-2.5 transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument ${
        done ? "opacity-60" : ""
      }`}
    >
      <span className="block truncate text-sm font-medium text-ink-primary">
        {timeLabel ? <span className="mr-2 font-normal text-ink-muted">{timeLabel}</span> : null}
        {visit.title || jobClient(visit.job).name}
        {visit.kind === "ASSESSMENT" ? (
          <span className="ml-2 rounded-full bg-surface-lifted px-2 py-0.5 text-xs font-normal text-ink-secondary">
            Inspection
          </span>
        ) : null}
      </span>
      {address ? <span className="mt-0.5 block truncate text-xs text-ink-muted">{address}</span> : null}
      {done ? (
        <span className="mt-1.5 inline-block rounded-full bg-confirm/10 px-2 py-0.5 text-xs font-medium text-confirm-fg">
          Done
        </span>
      ) : visit.status === VisitStatus.MISSED ? (
        <span className="mt-1.5 inline-block rounded-full bg-caution/10 px-2 py-0.5 text-xs font-medium text-caution-fg">
          Missed
        </span>
      ) : null}
    </Link>
  );
}

function Nav({
  href,
  children,
  label,
}: {
  href: string;
  children: React.ReactNode;
  /** Set when `children` is a bare glyph with no reliable spoken form. */
  label?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="rounded-lg border border-hairline px-3 py-2 text-sm text-ink-secondary transition hover:bg-surface-raised hover:text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
    >
      {children}
    </Link>
  );
}
