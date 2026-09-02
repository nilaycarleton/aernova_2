/**
 * Two things worth a contractor's attention, neither worth blocking a booking
 * over: the same person on two jobs at once, and a day with more work on it
 * than there are hands. Both are pure, both read from visits already fetched
 * for the calendar — see `app/(dashboard)/schedule/page.tsx` — and neither
 * writes anything. A warning, not a wall: the assignment already happened by
 * the time either of these fires, and a contractor moving a crew between two
 * quick jobs on purpose is a real schedule, not a mistake to refuse.
 */
import type { CalendarDate } from "./day.ts";
import { formatDateKey } from "./recurrence.ts";
import { visitCalendarDay } from "./timezone.ts";

type ConflictVisit = {
  jobId: string;
  job: { name: string };
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  assignments: {
    userId: string;
    user: { firstName: string | null; lastName: string | null; email: string };
  }[];
};

export type OverlapConflict = {
  userId: string;
  userName: string;
  day: CalendarDate;
  jobNames: string[];
};

function personName(user: { firstName: string | null; lastName: string | null; email: string }) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
}

/**
 * Two ranges on the same day can only be trusted not to conflict when *both*
 * carry a real time. An all-day visit is "sometime Tuesday" — it might be 8am
 * or it might be 3pm — so it can never be cleared against anything else on
 * its own day, only against a day it isn't on.
 */
function rangesConflict(
  a: { startAt: Date; endAt: Date; allDay: boolean },
  b: { startAt: Date; endAt: Date; allDay: boolean }
): boolean {
  if (a.allDay || b.allDay) return true;
  return a.startAt < b.endAt && b.startAt < a.endAt;
}

export function findOverlappingAssignments(
  visits: ConflictVisit[],
  timeZone: string | null
): OverlapConflict[] {
  type Entry = { jobId: string; jobName: string; startAt: Date; endAt: Date; allDay: boolean };
  const byUserDay = new Map<string, { userName: string; day: CalendarDate; entries: Entry[] }>();

  for (const visit of visits) {
    const day = visitCalendarDay(visit, timeZone);
    const entry: Entry = {
      jobId: visit.jobId,
      jobName: visit.job.name,
      startAt: visit.startAt,
      endAt: visit.endAt,
      allDay: visit.allDay,
    };
    for (const assignment of visit.assignments) {
      const key = `${assignment.userId}:${formatDateKey(day)}`;
      const bucket = byUserDay.get(key);
      if (bucket) bucket.entries.push(entry);
      else byUserDay.set(key, { userName: personName(assignment.user), day, entries: [entry] });
    }
  }

  const conflicts: OverlapConflict[] = [];
  for (const [key, bucket] of byUserDay) {
    const distinctJobs = new Set(bucket.entries.map((entry) => entry.jobId));
    if (distinctJobs.size < 2) continue;

    const hasConflict = bucket.entries.some((a, i) =>
      bucket.entries.some((b, j) => i !== j && a.jobId !== b.jobId && rangesConflict(a, b))
    );
    if (!hasConflict) continue;

    conflicts.push({
      userId: key.split(":")[0],
      userName: bucket.userName,
      day: bucket.day,
      jobNames: [...distinctJobs].map((jobId) => bucket.entries.find((e) => e.jobId === jobId)!.jobName),
    });
  }

  return conflicts.sort((a, b) => formatDateKey(a.day).localeCompare(formatDateKey(b.day)));
}

export type OverbookedDay = { day: CalendarDate; visitCount: number; crewCount: number };

/** More work on a day than there are people to put on it. */
export function findOverbookedDays(
  visits: { startAt: Date; allDay: boolean }[],
  crewCount: number,
  timeZone: string | null
): OverbookedDay[] {
  if (crewCount <= 0) return [];

  const counts = new Map<string, { day: CalendarDate; count: number }>();
  for (const visit of visits) {
    const day = visitCalendarDay(visit, timeZone);
    const key = formatDateKey(day);
    const bucket = counts.get(key);
    if (bucket) bucket.count += 1;
    else counts.set(key, { day, count: 1 });
  }

  return [...counts.values()]
    .filter(({ count }) => count > crewCount)
    .map(({ day, count }) => ({ day, visitCount: count, crewCount }))
    .sort((a, b) => formatDateKey(a.day).localeCompare(formatDateKey(b.day)));
}
