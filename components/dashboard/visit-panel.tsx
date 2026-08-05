"use client";

import { useActionState, useState } from "react";
import {
  assignVisitAction,
  unassignVisitAction,
} from "@/app/(dashboard)/schedule/assign-actions";
import {
  bookVisitAction,
  cancelVisitAction,
  completeVisitAction,
  setRecurrenceAction,
  type BookState,
} from "@/app/(dashboard)/schedule/actions";
import { SubmitButton } from "@/components/dashboard/submit-button";

/**
 * When this job is happening.
 *
 * A job-level panel, not a tab: the workspace tabs are the three things you *do*
 * to a roof — inspect it, scan it, price it — and a date is none of them. It
 * sits with the status stepper because booking work in is what moves a job to
 * scheduled, and the two facts belong beside each other.
 *
 * A visit is a day, with no clock on it, until the company has a timezone —
 * see `lib/schedule/timezone.ts`. Once `timeZone` is set, an optional start
 * time and duration appear on the booking form; left blank, a visit is still
 * exactly the "sometime Tuesday" square it always was.
 */
export type PanelVisit = {
  id: string;
  /** Pre-formatted on the server, from UTC parts, so it cannot shift by a day. */
  label: string;
  /** Pre-formatted in the company's zone, e.g. "9:30am" — null for an all-day visit. */
  timeLabel: string | null;
  dayInput: string;
  status: string;
  kind: string;
  isRepeat: boolean;
  /** Who is going. Assignment is what opens this job to a crew member at all. */
  assigned: { userId: string; name: string }[];
};

export type TeamMember = { userId: string; name: string };

const DURATIONS = [
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hour" },
  { minutes: 90, label: "1.5 hours" },
  { minutes: 120, label: "2 hours" },
  { minutes: 180, label: "3 hours" },
  { minutes: 240, label: "4 hours" },
  { minutes: 480, label: "All day (8 hours)" },
];

const FIELD =
  "rounded-xl border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition focus:border-signal-blue";

const SECONDARY =
  "rounded-xl border border-hairline bg-surface-raised px-4 py-2.5 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument";

export function VisitPanel({
  jobId,
  jobStatus,
  visits,
  today,
  team,
  timeZone,
}: {
  jobId: string;
  /** Only matters for one thing: a LEAD is offered "come look" vs "do the
   *  work" as separate choices; every other stage only ever books work. */
  jobStatus: string;
  visits: PanelVisit[];
  /** Today as YYYY-MM-DD, so the date field opens somewhere useful. */
  today: string;
  /** Everyone who could go. Empty until somebody has been invited.  */
  team: TeamMember[];
  /** Null until the company sets one on `/schedule` — gates the time fields. */
  timeZone: string | null;
}) {
  const [state, formAction] = useActionState<BookState, FormData>(bookVisitAction, {});
  const [repeating, setRepeating] = useState(false);
  const [hasTime, setHasTime] = useState(false);
  const [kind, setKind] = useState<"ASSESSMENT" | "WORK">(
    jobStatus === "LEAD" ? "ASSESSMENT" : "WORK"
  );

  const upcoming = visits.filter((visit) => visit.status === "SCHEDULED");
  const done = visits.filter((visit) => visit.status === "COMPLETED");

  return (
    <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold text-ink-primary">When it&rsquo;s happening</h3>
        {visits.length > 0 ? (
          <p className="text-sm text-ink-muted">
            {upcoming.length} to go
            {done.length > 0 ? ` · ${done.length} done` : ""}
          </p>
        ) : null}
      </div>

      {visits.length === 0 ? (
        <p className="mb-4 mt-1 text-sm text-ink-muted">
          Not booked in yet. Pick a day and it shows up on your schedule.
        </p>
      ) : (
        <ul className="mb-5 mt-4 divide-y divide-hairline border-y border-hairline">
          {visits.map((visit) => (
            <li key={visit.id} className="flex flex-wrap items-center gap-3 py-3">
              <span
                className={`min-w-0 flex-1 text-sm ${
                  visit.status === "COMPLETED"
                    ? "text-ink-muted line-through"
                    : visit.status === "CANCELLED"
                      ? "text-ink-muted line-through"
                      : "text-ink-primary"
                }`}
              >
                {visit.label}
                {visit.timeLabel ? (
                  <span className="ml-2 text-xs text-ink-muted">{visit.timeLabel}</span>
                ) : null}
                {visit.kind === "ASSESSMENT" ? (
                  <span className="ml-2 rounded-full bg-surface-lifted px-2 py-0.5 text-xs text-ink-secondary">
                    Inspection
                  </span>
                ) : null}
                {visit.isRepeat ? (
                  <span className="ml-2 text-xs text-ink-muted">repeats</span>
                ) : null}
                {/* Named on the row rather than behind a dialog: who is going
                    is the second thing anybody wants to know about a day, and
                    it is the thing that decides whether they can see the job
                    at all. */}
                <span className="mt-1 flex flex-wrap items-center gap-2">
                  {visit.assigned.map((person) => (
                    <form key={person.userId} action={unassignVisitAction}>
                      <input type="hidden" name="jobId" value={jobId} />
                      <input type="hidden" name="visitId" value={visit.id} />
                      <input type="hidden" name="userId" value={person.userId} />
                      <SubmitButton
                        pendingText="…"
                        className="rounded-full bg-surface-lifted px-2.5 py-1 text-xs text-ink-secondary transition hover:text-danger-fg"
                      >
                        {person.name} ×
                      </SubmitButton>
                    </form>
                  ))}
                  {team.length > 0 && visit.status === "SCHEDULED" ? (
                    <form action={assignVisitAction} className="flex items-center gap-1">
                      <input type="hidden" name="jobId" value={jobId} />
                      <input type="hidden" name="visitId" value={visit.id} />
                      <label className="sr-only" htmlFor={`assign-${visit.id}`}>
                        Put someone on {visit.label}
                      </label>
                      <select
                        id={`assign-${visit.id}`}
                        name="userId"
                        defaultValue=""
                        className="rounded-lg border border-hairline bg-ground/50 px-2 py-1 text-xs text-ink-secondary"
                      >
                        <option value="" disabled>
                          Add someone…
                        </option>
                        {team
                          .filter((m) => !visit.assigned.some((a) => a.userId === m.userId))
                          .map((member) => (
                            <option key={member.userId} value={member.userId}>
                              {member.name}
                            </option>
                          ))}
                      </select>
                      <SubmitButton
                        pendingText="…"
                        className="rounded-lg border border-hairline px-2 py-1 text-xs text-ink-secondary transition hover:text-ink-primary"
                      >
                        Add
                      </SubmitButton>
                    </form>
                  ) : null}
                </span>
              </span>

              {visit.status === "SCHEDULED" ? (
                <>
                  <form action={completeVisitAction}>
                    <input type="hidden" name="jobId" value={jobId} />
                    <input type="hidden" name="visitId" value={visit.id} />
                    <SubmitButton
                      pendingText="Saving…"
                      className="rounded-lg border border-hairline px-2.5 py-1.5 text-xs text-ink-secondary transition hover:bg-surface-lifted hover:text-ink-primary"
                    >
                      Done
                    </SubmitButton>
                  </form>
                  {/* Cancelled, never deleted — a visit that was booked and
                      didn't happen is a fact about the job, and sometimes the
                      one that explains why the work took three weeks. */}
                  <form action={cancelVisitAction}>
                    <input type="hidden" name="jobId" value={jobId} />
                    <input type="hidden" name="visitId" value={visit.id} />
                    <SubmitButton
                      pendingText="…"
                      className="rounded-lg px-2 py-1.5 text-xs text-ink-muted underline underline-offset-2 transition hover:text-danger-fg"
                    >
                      Called off
                    </SubmitButton>
                  </form>
                </>
              ) : (
                <span className="text-xs text-ink-muted">
                  {visit.status === "COMPLETED" ? "Done" : "Called off"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <form action={repeating ? setRecurrenceAction : formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="jobId" value={jobId} />
        {!repeating ? <input type="hidden" name="kind" value={kind} /> : null}

        {/* Only a LEAD has this fork: booking work is unambiguous everywhere
            else. A recurring visit is always work — nobody schedules a
            repeating "come look at it". */}
        {jobStatus === "LEAD" && !repeating ? (
          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink-secondary">What kind</span>
            <div className="flex gap-1 rounded-xl border border-hairline p-1">
              {(["ASSESSMENT", "WORK"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setKind(option)}
                  aria-pressed={kind === option}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    kind === option
                      ? "bg-ink-primary text-ground"
                      : "text-ink-secondary hover:bg-surface-lifted"
                  }`}
                >
                  {option === "ASSESSMENT" ? "Come look" : "Do the work"}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <label htmlFor="visit-day" className="mb-1.5 block text-xs font-medium text-ink-secondary">
            {repeating ? "Starting" : "Day"}
          </label>
          <input
            id="visit-day"
            name="day"
            type="date"
            defaultValue={today}
            className={FIELD}
          />
        </div>

        {timeZone ? (
          hasTime ? (
            <>
              <div>
                <label htmlFor="visit-time" className="mb-1.5 block text-xs font-medium text-ink-secondary">
                  Start time
                </label>
                <input id="visit-time" name="startTime" type="time" defaultValue="08:00" className={FIELD} />
              </div>
              <div>
                <label htmlFor="visit-duration" className="mb-1.5 block text-xs font-medium text-ink-secondary">
                  For about
                </label>
                <select id="visit-duration" name="duration" defaultValue={120} className={FIELD}>
                  {DURATIONS.map((option) => (
                    <option key={option.minutes} value={option.minutes}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={() => setHasTime(false)} className={SECONDARY}>
                No set time
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setHasTime(true)} className={SECONDARY}>
              Add a start time
            </button>
          )
        ) : null}

        {repeating ? (
          <>
            <div>
              <label htmlFor="visit-frequency" className="mb-1.5 block text-xs font-medium text-ink-secondary">
                How often
              </label>
              <select id="visit-frequency" name="frequency" defaultValue="WEEKLY" className={FIELD}>
                <option value="DAILY">Every day</option>
                <option value="WEEKLY">Every week</option>
                <option value="MONTHLY">Every month</option>
              </select>
            </div>
            <div className="w-24">
              <label htmlFor="visit-interval" className="mb-1.5 block text-xs font-medium text-ink-secondary">
                Every
              </label>
              <input
                id="visit-interval"
                name="interval"
                type="number"
                min={1}
                defaultValue={1}
                className={`${FIELD} w-full tabular-nums`}
              />
            </div>
            <div className="w-28">
              <label htmlFor="visit-count" className="mb-1.5 block text-xs font-medium text-ink-secondary">
                How many
              </label>
              <input
                id="visit-count"
                name="count"
                type="number"
                min={1}
                placeholder="No end"
                className={`${FIELD} w-full tabular-nums`}
              />
            </div>
          </>
        ) : null}

        <SubmitButton
          pendingText="Booking…"
          className="rounded-xl bg-ink-primary px-5 py-2.5 text-sm font-semibold text-ground transition hover:bg-ink-secondary disabled:opacity-60"
        >
          {repeating ? "Book them all in" : "Book it in"}
        </SubmitButton>

        <button type="button" onClick={() => setRepeating((current) => !current)} className={SECONDARY}>
          {repeating ? "Just the one day" : "It repeats"}
        </button>
      </form>

      <p aria-live="polite" className="mt-3 min-h-5 text-sm">
        {state.error ? (
          <span className="text-danger-fg">{state.error}</span>
        ) : state.bookedAt ? (
          <span className="text-ink-secondary">Booked. It&rsquo;s on your schedule.</span>
        ) : repeating ? (
          <span className="text-ink-muted">
            Leave &ldquo;how many&rdquo; blank for work with no end date &mdash; the calendar fills
            about five months ahead and extends as you go.
          </span>
        ) : null}
      </p>
    </section>
  );
}
