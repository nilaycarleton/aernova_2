import { NextResponse } from "next/server";
import { ActivityKind, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { recordActivity } from "@/lib/activity";
import { shareUrl } from "@/lib/share-token";
import { jobClient, jobIdentityInclude } from "@/lib/job-identity";
import { needsQuoteReminder } from "@/lib/quote/reminders";
import { followUpIntro, quoteEmailHtml, quoteEmailText } from "@/lib/quote/email-templates";

// Every hit has to read live quote status, not a cached one.
export const dynamic = "force-dynamic";

/**
 * Item 43: point a scheduler at this daily — same setup as
 * `/api/cron/invoice-reminders` and `/api/cron/sync-processing`, the same
 * `CRON_SECRET`.
 *
 * `lib/quote/reminders.ts` owns the spacing rule; this route only carries it
 * out. One quote failing to send (a bounced address, a transient Resend
 * error) must not stop the other forty in the same run, so failures are
 * caught and counted rather than thrown — same shape as the invoice cron.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0 });
  }

  const now = new Date();
  const host = request.headers.get("host") ?? "localhost:3000";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;

  const candidates = await prisma.quote.findMany({
    where: { status: { in: [QuoteStatus.SENT, QuoteStatus.VIEWED] } },
    include: {
      company: { select: { name: true } },
      job: { include: jobIdentityInclude },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const quote of candidates) {
    if (!needsQuoteReminder(quote, now)) continue;
    if (!quote.shareToken) {
      skipped++;
      continue;
    }
    const client = jobClient(quote.job);
    if (!client.email) {
      skipped++;
      continue;
    }

    const companyName = quote.company.name;
    const url = shareUrl("quote", quote.shareToken, origin);
    // sentAt is guaranteed by needsQuoteReminder (it returns false otherwise).
    const daysSinceSent = Math.max(
      1,
      Math.round((now.getTime() - quote.sentAt!.getTime()) / (24 * 60 * 60 * 1000))
    );
    const intro = followUpIntro({ companyName, daysSinceSent });

    try {
      await sendEmail({
        to: client.email,
        subject: `Still thinking it over? Your quote from ${companyName}`,
        html: quoteEmailHtml({ clientName: client.name, url, intro }),
        text: quoteEmailText({ clientName: client.name, url, intro }),
      });
    } catch {
      skipped++;
      continue;
    }

    await prisma.quote.update({
      where: { id: quote.id },
      data: { lastReminderSentAt: now },
    });

    await recordActivity({
      companyId: quote.companyId,
      jobId: quote.jobId,
      kind: ActivityKind.QUOTE_REMINDER_SENT,
      meta: {
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber ?? undefined,
        amountCents: quote.totalAmountCents ?? undefined,
      },
    });

    sent++;
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
