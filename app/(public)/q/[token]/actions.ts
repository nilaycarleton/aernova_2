"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { ActivityKind, JobStatus, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { isWellFormedShareToken } from "@/lib/share-token";
import { computeTotals } from "@/lib/quote/totals";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/**
 * The homeowner's two actions.
 *
 * Nothing here calls `requireCompanyContext` — the caller is not a user of this
 * product and never will be. The token is the whole authorization, so every
 * function re-checks it against the database rather than trusting anything else
 * on the request, and a quote that has been unshared simply is not found.
 */
async function quoteForToken(token: string) {
  if (!isWellFormedShareToken(token)) return null;
  return prisma.quote.findFirst({
    where: { shareToken: token },
    include: { lineItems: { orderBy: { sortOrder: "asc" } }, taxRate: true },
  });
}

/**
 * Who clicked, and from where.
 *
 * This is thin evidence and it is honest about being thin: it is the only thing
 * standing behind a click that authorizes thousands of dollars of work. It is
 * recorded and never displayed — a contractor arguing about a job months later
 * needs it to exist, not to be on the screen.
 */
async function callerIp(): Promise<string | null> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || list.get("x-real-ip") || null;
}

export async function approveQuoteAction(formData: FormData) {
  const token = getString(formData, "token");
  const name = getString(formData, "name");

  const quote = await quoteForToken(token);
  if (!quote) throw new Error("This quote is no longer available.");

  // Already answered. Approving twice is a double-click, not a second decision.
  if (quote.status === QuoteStatus.APPROVED) return;

  /**
   * The extras they ticked, taken from the form and then thrown away in favour
   * of the database's own rows. Ids that are not optional lines on *this* quote
   * are dropped without comment: the only thing arriving from a public,
   * unauthenticated page is a list of strings, and a string is not permission
   * to add a line to a bill.
   */
  const offered = new Map(
    quote.lineItems.filter((line) => line.isOptional).map((line) => [line.id, line])
  );
  const acceptedIds = [...new Set(formData.getAll("extras").map(String))].filter((id) =>
    offered.has(id)
  );
  const accepted = new Set(acceptedIds);

  // Recomputed here, from the stored rows, by the same function the page ran in
  // their browser. The homeowner's total is not something the browser gets to
  // tell us — it is something we work out and they agree to.
  const totals = computeTotals(
    quote.lineItems.map((line) => ({
      kind: line.kind,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      unitCostCents: line.unitCostCents,
      isOptional: line.isOptional,
      isAccepted: accepted.has(line.id),
    })),
    {
      discount:
        quote.discountKind === "PERCENT"
          ? { kind: "PERCENT", micros: quote.discountPercentMicros ?? 0 }
          : quote.discountKind === "AMOUNT"
            ? { kind: "AMOUNT", cents: quote.discountCents ?? 0 }
            : null,
      taxRateMicros: quote.taxRate?.rateMicros ?? null,
      deposit:
        quote.depositKind === "PERCENT"
          ? { kind: "PERCENT", micros: quote.depositPercentMicros ?? 0 }
          : quote.depositKind === "AMOUNT"
            ? { kind: "AMOUNT", cents: quote.depositCents ?? 0 }
            : null,
    }
  );

  await prisma.$transaction([
    // Written as a pair — the ticked ones on, everything else off — so the
    // stored answer is the whole answer and not the union of two visits.
    prisma.quoteLineItem.updateMany({
      where: { quoteId: quote.id, isOptional: true, id: { notIn: acceptedIds } },
      data: { clientSelected: false },
    }),
    ...(acceptedIds.length > 0
      ? [
          prisma.quoteLineItem.updateMany({
            where: { quoteId: quote.id, isOptional: true, id: { in: acceptedIds } },
            data: { clientSelected: true },
          }),
        ]
      : []),
    prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: QuoteStatus.APPROVED,
        acceptedAt: new Date(),
        acceptedByName: name || null,
        acceptedIp: await callerIp(),
        // The total they actually agreed to, which is not necessarily the total
        // that was sent. Pinned now, in the same transaction as the approval.
        totalAmountCents: totals.totalCents,
        totalAmount: totals.totalCents / 100,
      },
    }),
    // The job moves with it. A roofer who wakes up to an approved quote should
    // find the work already sitting in their pipeline rather than having to go
    // and promote it by hand — the approval *is* the promotion.
    prisma.job.updateMany({
      where: { id: quote.jobId, status: { in: [JobStatus.LEAD, JobStatus.READY_FOR_QUOTE, JobStatus.QUOTED] } },
      data: { status: JobStatus.QUOTED },
    }),
  ]);

  await recordActivity({
    companyId: quote.companyId,
    jobId: quote.jobId,
    kind: ActivityKind.QUOTE_APPROVED,
    actorLabel: name || "The client",
    meta: {
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber ?? undefined,
      amountCents: totals.totalCents,
      extras: acceptedIds.map((id) => offered.get(id)!.name),
    },
  });

  revalidatePath(`/q/${token}`);
}

export async function requestChangesAction(formData: FormData) {
  const token = getString(formData, "token");
  const message = getString(formData, "message");

  const quote = await quoteForToken(token);
  if (!quote) throw new Error("This quote is no longer available.");

  await prisma.quote.update({
    where: { id: quote.id },
    data: { status: QuoteStatus.CHANGES_REQUESTED },
  });

  await recordActivity({
    companyId: quote.companyId,
    jobId: quote.jobId,
    kind: ActivityKind.QUOTE_CHANGES_REQUESTED,
    actorLabel: "The client",
    meta: { quoteId: quote.id, message: message || undefined },
  });

  revalidatePath(`/q/${token}`);
}

/**
 * Mark the quote seen, the first time it is opened.
 *
 * Called from the page render rather than a button, because "have they looked
 * at it yet" is the question a contractor asks on day three, and it should not
 * depend on the homeowner clicking anything. Only the first view is recorded:
 * a quote re-read six times is not six events, and `viewedAt` means *first*
 * opened.
 */
export async function markQuoteViewed(quoteId: string): Promise<void> {
  // `status: SENT` in the WHERE, not just `viewedAt: null`. A homeowner who
  // approves and then re-opens the link must not have their answer overwritten
  // by the act of reading it again.
  const updated = await prisma.quote.updateMany({
    where: { id: quoteId, viewedAt: null, status: QuoteStatus.SENT },
    data: { viewedAt: new Date(), status: QuoteStatus.VIEWED },
  });
  if (updated.count === 0) return;

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { companyId: true, jobId: true, quoteNumber: true },
  });
  if (!quote) return;

  await recordActivity({
    companyId: quote.companyId,
    jobId: quote.jobId,
    kind: ActivityKind.QUOTE_VIEWED,
    actorLabel: "The client",
    meta: { quoteId, quoteNumber: quote.quoteNumber ?? undefined },
  });
}
