"use server";

import { revalidatePath } from "next/cache";
import { JobStatus, VisitKind, VisitStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCapability, requireJobAccess } from "@/lib/auth";
import { dayToInstant, instantToDay, parseDayInput } from "@/lib/schedule/day";
import {
  compareDates,
  formatDateKey,
  missingOccurrences,
  toCalendarDate,
  type Frequency,
} from "@/lib/schedule/recurrence";
import { isValidTimeZone, parseTimeInput, utcToZoned, zonedTimeToUtc } from "@/lib/schedule/timezone";
import { syncClientStatusForJob } from "@/lib/client-resolve";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export type BookState = { error?: string; bookedAt?: number };

/**
 * Put a job in a day.
 *
 * All-day, and no assignee — both decided 2026-07-29. There is no crew account
 * in this product yet, so a visit records *what* is happening and when; who
 * goes is still a conversation, which is how it already works in a two-truck
 * shop. Adding an assignee that can only ever point at an admin login would be
 * building the wrong half first.
 */
export async function bookVisitAction(
  _prevState: BookState,
  formData: FormData
): Promise<BookState> {
  const jobId = getString(formData, "jobId");
  if (!jobId) throw new Error("Missing jobId");

  const { companyId } = await requireJobAccess(jobId, "manageSchedule");

  const day = parseDayInput(getString(formData, "day"));
  if (!day) return { error: "Pick a date for this visit." };

  const [job, company] = await Promise.all([
    prisma.job.findFirst({
      where: { id: jobId, companyId },
      select: { id: true, name: true, status: true },
    }),
    prisma.company.findUnique({ where: { id: companyId }, select: { timeZone: true } }),
  ]);
  if (!job) return { error: "That job is no longer available." };

  const title = getString(formData, "title") || null;
  const kind: VisitKind = getString(formData, "kind") === "ASSESSMENT"
    ? VisitKind.ASSESSMENT
    : VisitKind.WORK;

  // A time is only ever possible once the company has a timezone to read it
  // in — see `lib/schedule/timezone.ts`. Left blank (or no zone yet), the
  // visit stays a day with no clock on it, same as before.
  const startMinutes = company?.timeZone ? parseTimeInput(getString(formData, "startTime")) : null;
  const durationMinutes = Number(getString(formData, "duration") || "120") || 120;
  const timed = startMinutes !== null && company?.timeZone;

  const startAt = timed ? zonedTimeToUtc(day, startMinutes, company.timeZone!) : dayToInstant(day);
  const endAt = timed
    ? new Date(startAt.getTime() + durationMinutes * 60_000)
    : dayToInstant(day);

  await prisma.$transaction([
    prisma.visit.create({
      data: {
        companyId,
        jobId: job.id,
        title,
        startAt,
        endAt,
        allDay: !timed,
        status: VisitStatus.SCHEDULED,
        kind,
      },
    }),
    // Booking work in *is* scheduling it, so the job moves rather than waiting
    // for somebody to remember to move it — but an ASSESSMENT is a different
    // promise than WORK, and each gets its own honest destination.
    //
    // WORK: only forward, and only from the stages where "scheduled" is the
    // honest next word — a job already in progress does not go backwards
    // because a second visit was added.
    //
    // ASSESSMENT: a LEAD moves to INSPECTION, exactly what the "Start
    // inspection" button already does by hand — booking the first look *is*
    // starting the inspection. It never jumps a LEAD to SCHEDULED; the actual
    // work still needs its own WORK visit later.
    kind === VisitKind.ASSESSMENT
      ? prisma.job.updateMany({
          where: { id: job.id, status: JobStatus.LEAD },
          data: { status: JobStatus.INSPECTION },
        })
      : prisma.job.updateMany({
          where: {
            id: job.id,
            status: { in: [JobStatus.LEAD, JobStatus.READY_FOR_QUOTE, JobStatus.QUOTED] },
          },
          data: { status: JobStatus.SCHEDULED },
        }),
  ]);

  // Booking work in is the everyday way a job reaches SCHEDULED — far more
  // common than the manual status dropdown — so the lead→client conversion
  // has to fire from here too, not only from updateJobStatusAction. An
  // ASSESSMENT booking never reaches a won status (LEAD → INSPECTION only),
  // so it's a safe no-op there; syncClientStatusForJob checks isWonJobStatus
  // itself.
  if (kind !== VisitKind.ASSESSMENT) {
    await syncClientStatusForJob(job.id, JobStatus.SCHEDULED);
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/schedule");
  return { bookedAt: Date.now() };
}

/** Rain, a late delivery, a client who isn't in. Moving a day is routine. */
export async function moveVisitAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const visitId = getString(formData, "visitId");
  if (!jobId || !visitId) throw new Error("Missing jobId or visitId");

  const { companyId } = await requireJobAccess(jobId, "manageSchedule");
  const day = parseDayInput(getString(formData, "day"));
  if (!day) return;

  const visit = await prisma.visit.findFirst({
    where: { id: visitId, companyId, jobId },
    select: { startAt: true, endAt: true, allDay: true },
  });
  if (!visit) return;

  let startAt: Date;
  let endAt: Date;
  if (visit.allDay) {
    startAt = dayToInstant(day);
    endAt = startAt;
  } else {
    // A dragged 2pm visit is still a 2pm visit on its new day — dropping the
    // time on move would quietly turn "rain, so let's do it Thursday instead"
    // into "rain, so let's do it Thursday, whenever." Only reachable once a
    // company has a zone; a timed visit cannot exist without one.
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { timeZone: true } });
    const durationMs = visit.endAt.getTime() - visit.startAt.getTime();
    if (company?.timeZone) {
      const { minutes } = utcToZoned(visit.startAt, company.timeZone);
      startAt = zonedTimeToUtc(day, minutes, company.timeZone);
    } else {
      startAt = dayToInstant(day);
    }
    endAt = new Date(startAt.getTime() + durationMs);
  }

  await prisma.visit.updateMany({
    where: { id: visitId, companyId, jobId },
    data: { startAt, endAt },
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/schedule");
}

export async function completeVisitAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const visitId = getString(formData, "visitId");
  if (!jobId || !visitId) throw new Error("Missing jobId or visitId");

  const { companyId } = await requireJobAccess(jobId, "completeVisit");

  const visit = await prisma.visit.findFirst({
    where: { id: visitId, companyId, jobId },
    select: { kind: true },
  });
  if (!visit) throw new Error("Visit not found");

  await prisma.visit.update({
    where: { id: visitId },
    data: { status: VisitStatus.COMPLETED, completedAt: new Date() },
  });

  // An ASSESSMENT finishing doesn't move the job — it already moved to
  // INSPECTION when it was *booked*. What happens after somebody has looked at
  // the roof is a human decision (log issues, quote, archive), not something
  // this action gets to guess.
  if (visit.kind === VisitKind.WORK) {
    // The job follows only when nothing is left outstanding. A twenty-six-visit
    // lawn contract is not finished because week one went well.
    const outstanding = await prisma.visit.count({
      where: {
        jobId,
        companyId,
        kind: VisitKind.WORK,
        status: { in: [VisitStatus.SCHEDULED, VisitStatus.IN_PROGRESS] },
      },
    });
    const nextStatus = outstanding === 0 ? JobStatus.COMPLETED : JobStatus.IN_PROGRESS;
    await prisma.job.updateMany({
      where: {
        id: jobId,
        status:
          nextStatus === JobStatus.COMPLETED
            ? { in: [JobStatus.SCHEDULED, JobStatus.IN_PROGRESS] }
            : JobStatus.SCHEDULED,
      },
      data: { status: nextStatus },
    });
    // Both destinations are won statuses, so a job completing its work is
    // just as much a conversion moment as being booked in the first place —
    // see the same reasoning in bookVisitAction above.
    await syncClientStatusForJob(jobId, nextStatus);
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/schedule");
}

/**
 * Nobody went, or it's off.
 *
 * Cancelled rather than deleted. A visit that was booked and didn't happen is a
 * fact about a job — sometimes the fact that matters most when a client asks
 * why the work took three weeks.
 */
export async function cancelVisitAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const visitId = getString(formData, "visitId");
  if (!jobId || !visitId) throw new Error("Missing jobId or visitId");

  const { companyId } = await requireJobAccess(jobId, "manageSchedule");
  await prisma.visit.updateMany({
    where: { id: visitId, companyId, jobId },
    data: { status: VisitStatus.CANCELLED },
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/schedule");
}

/** How far ahead a repeating job is materialised in one go. */
const HORIZON_DAYS = 140;

/**
 * "Every second Tuesday" — set the rule, and fill the calendar out to a horizon.
 *
 * The horizon is why this is an action and not a one-time expansion: a contract
 * with no end date has infinitely many visits, so the rule is stored and the
 * visits exist as far ahead as anyone needs to see. Running this again later
 * extends it, and never touches a visit that already exists — see
 * `missingOccurrences`.
 */
export async function setRecurrenceAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  if (!jobId) throw new Error("Missing jobId");

  const { companyId } = await requireJobAccess(jobId, "manageSchedule");
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { timeZone: true } });

  const frequencyRaw = getString(formData, "frequency");
  const frequency: Frequency | null =
    frequencyRaw === "DAILY" || frequencyRaw === "WEEKLY" || frequencyRaw === "MONTHLY"
      ? frequencyRaw
      : null;
  const start = parseDayInput(getString(formData, "day"));
  if (!frequency || !start) return;

  const intervalRaw = Number(getString(formData, "interval") || "1");
  const interval = Number.isInteger(intervalRaw) && intervalRaw > 0 ? intervalRaw : 1;
  const countRaw = Number(getString(formData, "count") || "0");
  const count = Number.isInteger(countRaw) && countRaw > 0 ? countRaw : null;

  // Same rule as a one-off booking: a time only exists once the company has a
  // zone to read it in. `RecurrenceRule.startMinutes`/`durationMinutes` have
  // carried defaults since the schedule shipped, waiting for this.
  const startMinutes = company?.timeZone ? parseTimeInput(getString(formData, "startTime")) : null;
  const durationMinutes = Number(getString(formData, "duration") || "120") || 120;
  const timed = startMinutes !== null && company?.timeZone;

  // A job has at most one active series at a time — this action is the only
  // writer of RecurrenceRule, so that invariant holds as long as it's kept
  // here. Resubmitting "It repeats" (extending the horizon, or tweaking just
  // the time of day) must reuse the same rule id, not mint a new one: the
  // uniqueness that makes `skipDuplicates` below actually dedupe is scoped to
  // one rule, so two different rule ids generating the same dates would
  // double-book. A genuinely different pattern (frequency/interval/count/
  // start date all define *which* dates exist) is a new series, not an edit
  // of the old one — the old rule stops generating but keeps what it already
  // made, which is what `isActive` has been sitting here for.
  const existingRule = await prisma.recurrenceRule.findFirst({ where: { jobId, isActive: true } });
  const patternUnchanged =
    existingRule !== null &&
    existingRule.frequency === frequency &&
    existingRule.interval === interval &&
    existingRule.count === count &&
    compareDates(instantToDay(existingRule.startDate), start) === 0;

  let rule;
  if (patternUnchanged) {
    rule = await prisma.recurrenceRule.update({
      where: { id: existingRule.id },
      data: timed ? { startMinutes, durationMinutes } : {},
    });
  } else {
    if (existingRule) {
      await prisma.recurrenceRule.update({ where: { id: existingRule.id }, data: { isActive: false } });
    }
    rule = await prisma.recurrenceRule.create({
      data: {
        companyId,
        jobId,
        frequency,
        interval,
        startDate: dayToInstant(start),
        count,
        ...(timed ? { startMinutes, durationMinutes } : {}),
      },
    });
  }

  const horizon = toCalendarDate(new Date(Date.now() + HORIZON_DAYS * 24 * 60 * 60 * 1000));

  // Keyed against every occurrence this *job* already has, not just this
  // rule's own. `skipDuplicates` below only dedupes within one rule id
  // (`@@unique([generatedFromRuleId, occurrenceDate])`) — fine while
  // `patternUnchanged` reuses the old rule, but a genuine pattern change
  // deactivates the old rule and mints a new one (see the comment above
  // `existingRule`), and the old rule's visits stay real. Generating from
  // `expandRecurrence` directly would recreate every date the old rule
  // already made under the new rule id, double-booking the crew the moment
  // anyone changes count/interval/frequency/start on a job with visits.
  const existingOccurrences = await prisma.visit.findMany({
    where: { jobId, occurrenceDate: { not: null } },
    select: { occurrenceDate: true },
  });
  const existingKeys = existingOccurrences.map((v) => formatDateKey(instantToDay(v.occurrenceDate!)));
  const dates = missingOccurrences({ frequency, interval, startDate: start, count }, horizon, existingKeys);

  // skipDuplicates stays as defense-in-depth against a concurrent double
  // submission; `existingKeys` above is what actually carries the guarantee.
  await prisma.visit.createMany({
    data: dates.map((date) => {
      const startAt = timed ? zonedTimeToUtc(date, startMinutes, company!.timeZone!) : dayToInstant(date);
      const endAt = timed ? new Date(startAt.getTime() + durationMinutes * 60_000) : dayToInstant(date);
      return {
        companyId,
        jobId,
        startAt,
        endAt,
        allDay: !timed,
        status: VisitStatus.SCHEDULED,
        generatedFromRuleId: rule.id,
        occurrenceDate: dayToInstant(date),
      };
    }),
    skipDuplicates: true,
  });

  await prisma.job.updateMany({
    where: {
      id: jobId,
      status: { in: [JobStatus.LEAD, JobStatus.READY_FOR_QUOTE, JobStatus.QUOTED] },
    },
    data: { status: JobStatus.SCHEDULED },
  });
  await syncClientStatusForJob(jobId, JobStatus.SCHEDULED);

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/schedule");
}

/**
 * The scheduler asks rather than guesses.
 *
 * Every visit before this was a day with no clock on it *because* nobody had
 * said which clock. This is the one place that gets fixed — see
 * `lib/schedule/timezone.ts` — and it unlocks start times and the Day view
 * everywhere else, both of which read `Company.timeZone` rather than asking
 * for it again.
 */
export async function setCompanyTimeZoneAction(formData: FormData) {
  const { company } = await requireCapability("manageSchedule");

  const timeZone = getString(formData, "timeZone");
  if (!isValidTimeZone(timeZone)) return;

  await prisma.company.update({ where: { id: company.id }, data: { timeZone } });

  revalidatePath("/schedule");
  revalidatePath("/today");
}
