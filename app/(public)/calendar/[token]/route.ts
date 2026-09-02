import { VisitStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatAddress } from "@/lib/client-matching";
import { jobAddress, jobClient, jobIdentityInclude } from "@/lib/job-identity";
import { isWellFormedShareToken } from "@/lib/share-token";
import { visitCalendarDay } from "@/lib/schedule/timezone";
import { buildCalendar, type IcsEvent } from "@/lib/schedule/ics";

/**
 * The schedule, as a feed a calendar app can subscribe to.
 *
 * Nothing here calls `requireCompanyContext`. The thing on the other end is
 * Google's or Apple's fetcher, which will never hold an Aernova session — the
 * token in the URL is the whole credential, exactly as it is for a homeowner's
 * quote at `/q/[token]`. Clearing `Company.calendarToken` revokes every
 * subscription at once.
 *
 * One-way, out only. A subscribed calendar cannot write back, and that is the
 * feature rather than the limitation: two-way sync means conflict resolution,
 * and conflict resolution on somebody's work schedule eventually means deleting
 * a job nobody agreed to delete.
 */

/** Jobber's window, and for the same reason: an open-ended recurring contract
 *  has no last visit, and a feed is the wrong place to discover that. Google
 *  also caps a subscribed calendar at 1,111 items and pauses past it. */
const WEEKS_BACK = 2;
const WEEKS_FORWARD = 20;

function summarise(clientName: string, jobName: string): string {
  const client = clientName.trim();
  const job = jobName.trim();
  if (!job) return client;
  if (!client) return job;
  const a = client.toLowerCase();
  const b = job.toLowerCase();
  if (b.includes(a) || a.includes(b)) return job.length >= client.length ? job : client;
  return `${client} — ${job}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: raw } = await params;
  // Calendar apps append `.ics` to the URL often enough that not accepting it
  // is a support email waiting to happen.
  const token = raw.replace(/\.ics$/i, "");

  if (!isWellFormedShareToken(token)) {
    return new Response("Not found", { status: 404 });
  }

  const company = await prisma.company.findFirst({
    where: { calendarToken: token },
    select: { id: true, name: true, timeZone: true },
  });
  if (!company) return new Response("Not found", { status: 404 });

  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const visits = await prisma.visit.findMany({
    where: {
      companyId: company.id,
      startAt: {
        gte: new Date(now - WEEKS_BACK * 7 * day),
        lte: new Date(now + WEEKS_FORWARD * 7 * day),
      },
    },
    orderBy: { startAt: "asc" },
    include: { job: { include: jobIdentityInclude } },
  });

  const events: IcsEvent[] = visits.map((visit) => {
    const client = jobClient(visit.job);
    const address = formatAddress(jobAddress(visit.job));
    return {
      // The visit's own id. Stable forever, so moving a visit updates the
      // event on the crew's phone instead of leaving the old one behind and
      // adding a second.
      uid: `visit-${visit.id}@aernova`,
      // The same timezone-aware bucketing every other consumer uses (the
      // schedule page, double-booking detection) — a raw UTC day here was the
      // exact "evening visit is tomorrow in UTC before it's tomorrow locally"
      // mistake `tests/schedule-timezone.test.ts` documents avoiding.
      start: visitCalendarDay(visit, company.timeZone),
      // What a person reads at a glance on a phone: whose roof, and where.
      // Jobs are often named after the address, so the client name is only
      // added when it says something the job name doesn't — "1550 Gilles St —
      // 1550 Gilles St" is the kind of line that makes software look careless.
      summary: visit.title || summarise(client.name, visit.job.name),
      location: address,
      description: visit.notes,
      cancelled: visit.status === VisitStatus.CANCELLED,
      updatedAt: visit.updatedAt,
    };
  });

  const body = buildCalendar({ name: `${company.name} — schedule`, events });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="aernova-schedule.ics"',
      // No caching in front of us. The subscribing app decides how often it
      // pulls — Google roughly every 12 hours, Apple as often as every 5
      // minutes — and a CDN holding a stale week on top of that would put a
      // crew at the wrong address with nothing to explain it.
      "Cache-Control": "no-store, max-age=0",
      // A schedule with client addresses on it must never end up in an index.
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
