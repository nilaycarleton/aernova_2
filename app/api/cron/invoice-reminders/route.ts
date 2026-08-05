import { NextResponse } from "next/server";
import { ActivityKind, InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { recordActivity } from "@/lib/activity";
import { formatMoney } from "@/lib/money";
import { shareUrl } from "@/lib/share-token";
import { jobClient, jobIdentityInclude } from "@/lib/job-identity";
import { invoiceBalance } from "@/lib/invoice/balance";
import { sweepOverdueInvoices } from "@/lib/invoice/overdue";
import { needsReminder } from "@/lib/invoice/reminders";
import { invoiceEmailHtml, invoiceEmailText, reminderIntro } from "@/lib/invoice/email-templates";

// Every hit has to read live invoice status, not a cached one.
export const dynamic = "force-dynamic";

/**
 * Item 38's other half. Point a scheduler at this daily (Vercel Cron, GitHub
 * Actions, or any external pinger — same setup as
 * `/api/cron/sync-processing`, and the same `CRON_SECRET`).
 *
 * Sweeps overdue status first — the same idempotent `updateMany`
 * `/invoices` already runs on open, just with no single company to scope it
 * to — and then reminds whoever `lib/invoice/reminders.ts` says is actually
 * due one. That file owns the spacing rule; this route only carries it out.
 *
 * One invoice failing to send (a bounced address, a transient Resend error)
 * must not stop the other forty in the same run, so failures are caught and
 * counted rather than thrown.
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
    return NextResponse.json({ ok: true, swept: 0, sent: 0, skipped: 0 });
  }

  const now = new Date();
  const swept = await sweepOverdueInvoices(undefined, now);

  const host = request.headers.get("host") ?? "localhost:3000";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;

  const candidates = await prisma.invoice.findMany({
    where: { status: InvoiceStatus.OVERDUE },
    include: {
      payments: true,
      company: { select: { name: true } },
      job: { include: jobIdentityInclude },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const invoice of candidates) {
    if (!needsReminder(invoice, now)) continue;
    if (!invoice.shareToken) {
      skipped++;
      continue;
    }
    const client = jobClient(invoice.job);
    if (!client.email) {
      skipped++;
      continue;
    }

    const balance = invoiceBalance(invoice.totalAmountCents, invoice.payments, {
      status: invoice.status,
      dueAt: invoice.dueAt,
      now,
    });
    // Belt and braces: the WHERE already means every candidate is overdue
    // with money owed, but a reminder is never worth sending on a technicality.
    if (!balance.isOverdue || balance.balanceCents <= 0) {
      skipped++;
      continue;
    }

    const companyName = invoice.company.name;
    const url = shareUrl("invoice", invoice.shareToken, origin);
    const intro = reminderIntro({
      companyName,
      balance: formatMoney(balance.balanceCents),
      overdueDays: balance.overdueDays ?? 0,
    });

    try {
      await sendEmail({
        to: client.email,
        subject: `Overdue: invoice from ${companyName}`,
        html: invoiceEmailHtml({ clientName: client.name, url, intro }),
        text: invoiceEmailText({ clientName: client.name, url, intro }),
      });
    } catch {
      skipped++;
      continue;
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { lastReminderSentAt: now },
    });

    await recordActivity({
      companyId: invoice.companyId,
      jobId: invoice.jobId,
      kind: ActivityKind.INVOICE_REMINDER_SENT,
      meta: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber ?? undefined,
        amountCents: balance.balanceCents,
      },
    });

    sent++;
  }

  return NextResponse.json({ ok: true, swept, sent, skipped });
}
