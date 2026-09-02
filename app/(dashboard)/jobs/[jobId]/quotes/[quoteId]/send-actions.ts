"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ActivityKind, JobStatus, QuoteDeclineReason, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireJobAccess } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { generateShareToken, shareUrl } from "@/lib/share-token";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { jobClient, jobIdentityInclude } from "@/lib/job-identity";
import { canDeleteQuote } from "@/lib/quote-status";
import { firstSendIntro, quoteEmailHtml, quoteEmailText } from "@/lib/quote/email-templates";
import { checkAiRateLimit, recordAiUsage } from "@/lib/ai/rate-limit";
import { draftFollowUpMessage } from "@/lib/ai/quote-followup";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Open the quote to the homeowner.
 *
 * This mints the share link, marks the quote SENT, and hands the roofer a URL
 * they can paste into a text message — which is still how most of these
 * actually go out, key or no key. `sendQuoteEmailAction` below is the other
 * door onto the same link, gated on `RESEND_API_KEY` actually being set;
 * neither one mints a second token.
 *
 * The token is minted once and kept. Re-sending must not invalidate the link
 * already sitting in a homeowner's inbox — "the link you sent me doesn't work"
 * is a phone call nobody should have to take.
 */
export async function shareQuoteAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const quoteId = getString(formData, "quoteId");
  if (!jobId || !quoteId) throw new Error("Missing jobId or quoteId");

  const { companyId, userId } = await requireJobAccess(jobId, "sendQuote");

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, companyId },
    select: { id: true, shareToken: true, status: true, totalAmountCents: true, quoteNumber: true },
  });
  if (!quote) throw new Error("Quote not found");

  const shareToken = quote.shareToken ?? generateShareToken();

  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      shareToken,
      sentAt: new Date(),
      // A quote already answered stays answered. Re-opening the link for a
      // homeowner who has approved must not quietly walk the status backwards
      // and lose the fact that they said yes.
      status:
        quote.status === QuoteStatus.DRAFT || quote.status === QuoteStatus.EXPIRED
          ? QuoteStatus.SENT
          : quote.status,
    },
  });

  await recordActivity({
    companyId,
    jobId,
    kind: ActivityKind.QUOTE_SENT,
    actorUserId: userId,
    meta: {
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber ?? undefined,
      amountCents: quote.totalAmountCents ?? undefined,
    },
  });

  revalidatePath(`/jobs/${jobId}/quotes/${quoteId}`);
  revalidatePath(`/jobs/${jobId}`);
}

/**
 * They said yes on the phone.
 *
 * Most quotes are not approved by clicking anything. They are approved in a
 * driveway, or on a call three days later, and a product that can only record a
 * click leaves the contractor with a pipeline full of quotes that look ignored.
 *
 * What this deliberately does not do is *forge the click*. `acceptedByName` and
 * `acceptedIp` are the thin evidence that a person at that address pressed
 * Approve; writing a name into them because a roofer ticked a box would turn the
 * one piece of evidence this product holds into a field anybody can fill in.
 * They stay null, `approvedByUserId` records who marked it, and the two cases
 * stay tellable apart forever.
 */
export async function markQuoteApprovedAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const quoteId = getString(formData, "quoteId");
  if (!jobId || !quoteId) throw new Error("Missing jobId or quoteId");

  const { companyId, userId } = await requireJobAccess(jobId, "sendQuote");

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, companyId },
    select: { id: true, status: true, quoteNumber: true, totalAmountCents: true },
  });
  if (!quote) throw new Error("Quote not found");

  // A homeowner's own approval outranks this and is never overwritten: their
  // click carries evidence that a checkbox in the office does not. A
  // declined quote is answered too, the other way — flipping REJECTED to
  // APPROVED by clicking through a stale "mark approved" link would silently
  // reverse a recorded no rather than correct a mistake by hand.
  if (quote.status === QuoteStatus.APPROVED || quote.status === QuoteStatus.REJECTED) return;

  await prisma.$transaction([
    prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: QuoteStatus.APPROVED,
        acceptedAt: new Date(),
        approvedByUserId: userId,
      },
    }),
    prisma.job.updateMany({
      where: {
        id: jobId,
        status: { in: [JobStatus.LEAD, JobStatus.READY_FOR_QUOTE, JobStatus.QUOTED] },
      },
      data: { status: JobStatus.QUOTED },
    }),
  ]);

  await recordActivity({
    companyId,
    jobId,
    kind: ActivityKind.QUOTE_APPROVED,
    actorUserId: userId,
    meta: {
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber ?? undefined,
      amountCents: quote.totalAmountCents ?? undefined,
      recordedByHand: true,
    },
  });

  revalidatePath(`/jobs/${jobId}/quotes/${quoteId}`);
  revalidatePath(`/jobs/${jobId}`);
}

/**
 * They said no. Item 42's other answer, and the mirror image of
 * `markQuoteApprovedAction` above: same "recorded, not clicked" shape, same
 * `requireJobAccess(jobId, "sendQuote")` gate, same refusal to overwrite an
 * answer that already came in. The difference is deliberate — see the
 * `declinedAt` fields' own comment in `schema.prisma` — there is no public,
 * homeowner-facing door onto REJECTED. A "no" arrives the way most quotes are
 * actually answered: a call, a text, a driveway conversation, and a roofer
 * writing down what they were told, with a reason a win-rate view can group by.
 */
export async function markQuoteDeclinedAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const quoteId = getString(formData, "quoteId");
  const reason = getString(formData, "reason") as QuoteDeclineReason;
  const note = getString(formData, "note");
  if (!jobId || !quoteId) throw new Error("Missing jobId or quoteId");
  if (!Object.values(QuoteDeclineReason).includes(reason)) {
    throw new Error("Pick a reason for the decline");
  }

  const { companyId, userId } = await requireJobAccess(jobId, "sendQuote");

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, companyId },
    select: { id: true, status: true, quoteNumber: true, totalAmountCents: true },
  });
  if (!quote) throw new Error("Quote not found");

  // An answer already on record — approved or already declined — outranks a
  // second click. Approving and declining the same quote is a correction, not
  // something this button makes; whoever recorded the first answer wrong
  // should fix it by hand, not have a second click silently overwrite it.
  if (quote.status === QuoteStatus.APPROVED || quote.status === QuoteStatus.REJECTED) return;

  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      status: QuoteStatus.REJECTED,
      declinedAt: new Date(),
      declineReason: reason,
      declineNote: note || null,
      declinedByUserId: userId,
    },
  });

  await recordActivity({
    companyId,
    jobId,
    kind: ActivityKind.QUOTE_DECLINED,
    actorUserId: userId,
    meta: {
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber ?? undefined,
      amountCents: quote.totalAmountCents ?? undefined,
      reason,
      note: note || undefined,
    },
  });

  revalidatePath(`/jobs/${jobId}/quotes/${quoteId}`);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/pipeline");
}

/** Close the door again. The token is cleared, so the old link stops working. */
export async function unshareQuoteAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const quoteId = getString(formData, "quoteId");
  if (!jobId || !quoteId) throw new Error("Missing jobId or quoteId");

  const { companyId } = await requireJobAccess(jobId, "sendQuote");

  await prisma.quote.updateMany({
    where: { id: quoteId, companyId },
    data: { shareToken: null, status: QuoteStatus.DRAFT },
  });

  revalidatePath(`/jobs/${jobId}/quotes/${quoteId}`);
}

/**
 * Erase a quote outright — not decline it, not let it expire, gone.
 *
 * Restricted to statuses `canDeleteQuote` allows: a draft nobody's seen, or an
 * answer that already came back no. A `SENT`/`VIEWED` quote is refused because
 * the homeowner may still have that exact URL open; an `APPROVED` one because
 * an invoice may already exist against it — `Invoice.quoteId` would go quietly
 * `null`, and a contractor asking "which quote was this invoice from" deserves
 * a better answer than "we don't know, it got deleted."
 *
 * `deleteJobAction` is this action's only precedent in the app, and it hard
 * deletes with no status check at all — but a job has no homeowner-facing
 * link sitting in an inbox, which is exactly the difference that earns this
 * one a guard the other doesn't need.
 */
export async function deleteQuoteAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const quoteId = getString(formData, "quoteId");
  if (!jobId || !quoteId) throw new Error("Missing jobId or quoteId");

  const { companyId } = await requireJobAccess(jobId, "deleteQuote");

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, companyId },
    select: { id: true, status: true },
  });
  if (!quote) throw new Error("Quote not found");

  if (!canDeleteQuote(quote.status)) {
    throw new Error(
      "This quote has been sent to the homeowner or approved — decline it or let it expire before deleting it."
    );
  }

  await prisma.quote.delete({ where: { id: quote.id } });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/quotes");
  redirect(`/jobs/${jobId}`);
}

export type SendEmailState = { error?: string; sentAt?: number };

/**
 * The channel `shareQuoteAction`'s own comment said would arrive with Resend.
 * It only ever sends a link that already exists — this never mints one, so
 * "Create the link" (or "Email it to them" once it exists) is still the one
 * place a share token gets born, and the two buttons stay two views of the
 * same fact rather than two competing ways to send a quote.
 *
 * Every failure path returns rather than throws, same reasoning as
 * `NewJobState` in `jobs/new/actions.ts`: a contractor mid-send should see
 * "this client has no email on file," not an error boundary.
 */
export async function sendQuoteEmailAction(
  _prevState: SendEmailState,
  formData: FormData
): Promise<SendEmailState> {
  const jobId = getString(formData, "jobId");
  const quoteId = getString(formData, "quoteId");
  if (!jobId || !quoteId) throw new Error("Missing jobId or quoteId");

  const { companyId, userId } = await requireJobAccess(jobId, "sendQuote");

  if (!isEmailConfigured()) {
    return { error: "Email isn't set up for this company yet." };
  }

  const [quote, job, company] = await Promise.all([
    prisma.quote.findFirst({
      where: { id: quoteId, companyId },
      select: { id: true, shareToken: true, quoteNumber: true, totalAmountCents: true },
    }),
    prisma.job.findFirst({ where: { id: jobId, companyId }, include: jobIdentityInclude }),
    prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }),
  ]);
  if (!quote || !job) throw new Error("Quote not found");
  if (!quote.shareToken) return { error: "Create the link first." };

  const client = jobClient(job);
  if (!client.email) {
    return { error: "This client has no email on file — add one, or send the link another way." };
  }

  const host = (await headers()).get("host") ?? "localhost:3000";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  const url = shareUrl("quote", quote.shareToken, origin);
  const companyName = company?.name || "your contractor";

  // Item 50: a reviewed AI follow-up (or anything hand-typed in its place)
  // wins over the fixed first-send line. Never used unedited or unseen — the
  // panel only ever posts here after showing the draft for the contractor to
  // read and change, same "reviewed before it reaches a homeowner" rule the
  // cron's own fixed template exists to avoid needing in the first place.
  const customMessage = getString(formData, "customMessage");
  const intro = customMessage || firstSendIntro({ companyName });

  try {
    await sendEmail({
      to: client.email,
      subject: `Your quote from ${companyName}`,
      html: quoteEmailHtml({ clientName: client.name, url, intro }),
      text: quoteEmailText({ clientName: client.name, url, intro }),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't send the email." };
  }

  // Sending is a second door onto the same fact `shareQuoteAction` already
  // records — no separate ActivityKind for it, just the same one, from
  // whichever door the quote actually went out.
  await recordActivity({
    companyId,
    jobId,
    kind: ActivityKind.QUOTE_SENT,
    actorUserId: userId,
    meta: {
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber ?? undefined,
      amountCents: quote.totalAmountCents ?? undefined,
      channel: "email",
    },
  });

  revalidatePath(`/jobs/${jobId}/quotes/${quoteId}`);
  revalidatePath(`/jobs/${jobId}`);
  return { sentAt: Date.now() };
}

export type DraftFollowUpState = { message: string } | { error: string };

/**
 * Item 50. Called directly from `QuoteSharePanel` (plain arguments, same
 * pattern `draftQuoteScopeAction` establishes) — the draft lands in
 * component state for the contractor to read and edit, never sent from
 * here. Only makes sense once a quote has actually gone out once, so the
 * panel gates this on `sentAt` already being set.
 */
export async function draftQuoteFollowUpAction(
  jobId: string,
  quoteId: string
): Promise<DraftFollowUpState> {
  const { companyId, userId } = await requireJobAccess(jobId, "sendQuote");

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, jobId, companyId },
    select: { sentAt: true },
  });
  if (!quote) return { error: "Quote not found" };
  if (!quote.sentAt) return { error: "This quote hasn't been sent yet." };

  const limit = await checkAiRateLimit({ jobId, userId });
  if (!limit.allowed) return { error: limit.message };

  await recordAiUsage({ jobId, userId, kind: "summary" });

  const daysSinceSent = Math.max(
    1,
    Math.floor((Date.now() - quote.sentAt.getTime()) / (24 * 60 * 60 * 1000))
  );

  try {
    const message = await draftFollowUpMessage({ jobId, quoteId, daysSinceSent });
    return { message };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Couldn't draft a follow-up. Try again.",
    };
  }
}
