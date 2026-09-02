import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { ActivityKind, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured, stripeClient } from "@/lib/stripe";
import { syncStripeAccountFlags } from "@/lib/stripe-connect";
import { resyncInvoiceMoney } from "@/lib/invoice/resync";
import { recordActivity } from "@/lib/activity";

/**
 * Stripe calling us back.
 *
 * Two event types land here:
 *
 * - `account.updated` — a contractor's onboarding progressed, or Stripe froze
 *   their charges. `lib/stripe-connect.ts` is the one place that writes the
 *   three cached flags on `Company`.
 * - `checkout.session.completed` — a homeowner paid. The session's metadata
 *   carries which invoice it was for, because Stripe has no idea what an
 *   "Invoice" is on our side — we tell it once, at checkout, and read it back
 *   here.
 *
 * Idempotent by construction, not by hope: `InvoicePayment.stripePaymentIntentId`
 * is unique, and Stripe redelivers a webhook on anything short of a 200 — a
 * retry has to be a no-op rather than a second row that double-credits a
 * balance nobody actually paid twice.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ ok: false, error: "Stripe is not configured" }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!webhookSecret || !signature) {
    return NextResponse.json({ ok: false, error: "Missing signature" }, { status: 400 });
  }

  // The raw body, not a parsed one — Stripe signs the exact bytes it sent, and
  // re-serializing JSON before verifying would break the signature on the
  // first stray whitespace difference.
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Invalid signature" },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "account.updated":
      await syncStripeAccountFlags(event.data.object as Stripe.Account);
      break;
    case "checkout.session.completed":
      await recordCheckoutPayment(event.data.object as Stripe.Checkout.Session);
      break;
    default:
      break;
  }

  return NextResponse.json({ ok: true });
}

async function recordCheckoutPayment(session: Stripe.Checkout.Session) {
  const invoiceId = session.metadata?.invoiceId;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!invoiceId || !paymentIntentId) return;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, jobId: true, companyId: true, invoiceNumber: true },
  });
  if (!invoice) return;

  // A redelivered event we already handled. Stripe's own retry policy, not a
  // hypothetical — this is the guard that makes it safe.
  const existing = await prisma.invoicePayment.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    select: { id: true },
  });
  if (existing) return;

  const amountCents = session.amount_total ?? 0;
  if (amountCents <= 0) return;

  const result = await prisma.$transaction(async (tx) => {
    await tx.invoicePayment.create({
      data: {
        companyId: invoice.companyId,
        invoiceId: invoice.id,
        amountCents,
        method: PaymentMethod.STRIPE,
        paidAt: new Date(),
        stripePaymentIntentId: paymentIntentId,
      },
    });
    return resyncInvoiceMoney(tx, invoice.id);
  });

  await recordActivity({
    companyId: invoice.companyId,
    jobId: invoice.jobId,
    kind: ActivityKind.PAYMENT_RECORDED,
    actorLabel: "The client",
    meta: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber ?? undefined,
      amountCents,
      method: "Paid online",
      balanceCents: result.balanceCents,
    },
  });

  if (result.justPaid) {
    await recordActivity({
      companyId: invoice.companyId,
      jobId: invoice.jobId,
      kind: ActivityKind.INVOICE_PAID,
      actorLabel: "The client",
      meta: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber ?? undefined,
        amountCents: result.paidCents,
      },
    });
  }
}
