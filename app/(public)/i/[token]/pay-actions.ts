"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured, stripeClient } from "@/lib/stripe";
import { isWellFormedShareToken } from "@/lib/share-token";
import { invoiceBalance } from "@/lib/invoice/balance";

/**
 * The one thing Phase 5b adds to a page that otherwise has nothing to decide.
 *
 * A direct charge on the connected account — `stripeAccount` in the request
 * options below, not `transfer_data.destination` — so the money never touches
 * an Aernova-controlled balance at all, matching "the homeowner pays the
 * contractor directly" from `PLAN-CRM.md`. No application fee for now; adding
 * one later is a single `application_fee_amount` line here, not a second
 * integration.
 *
 * Charges exactly the outstanding balance, as one line — not the invoice's
 * full total, and not itemized. A partial payment already on the books (a
 * manual e-transfer deposit, say) must reduce what Stripe asks for next, and
 * a homeowner paying online has no more use for a re-itemized breakdown than
 * a draw invoice's own recipient does.
 */
export async function createStripeCheckoutAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  if (!isWellFormedShareToken(token)) throw new Error("Invoice not found");
  if (!isStripeConfigured()) throw new Error("Online payment isn't available right now.");

  const invoice = await prisma.invoice.findFirst({
    where: { shareToken: token },
    include: {
      payments: true,
      company: { select: { stripeAccountId: true, stripeChargesEnabled: true } },
    },
  });
  if (!invoice || invoice.status === InvoiceStatus.VOID) throw new Error("Invoice not found");
  if (!invoice.company.stripeAccountId || !invoice.company.stripeChargesEnabled) {
    throw new Error("This contractor hasn't turned on online payments yet.");
  }

  const balance = invoiceBalance(invoice.totalAmountCents, invoice.payments, {
    status: invoice.status,
    dueAt: invoice.dueAt,
  });
  if (balance.balanceCents <= 0) throw new Error("This invoice is already settled.");

  const host = (await headers()).get("host") ?? "localhost:3000";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;

  const session = await stripeClient().checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          price_data: {
            // Same single-currency assumption `lib/money.ts` already makes —
            // this app formats every figure as CAD today.
            currency: "cad",
            product_data: {
              name: invoice.invoiceNumber ? `Invoice #${invoice.invoiceNumber}` : "Invoice",
            },
            unit_amount: balance.balanceCents,
          },
          quantity: 1,
        },
      ],
      metadata: { invoiceId: invoice.id },
      success_url: `${origin}/i/${token}?paid=1`,
      cancel_url: `${origin}/i/${token}`,
    },
    { stripeAccount: invoice.company.stripeAccountId }
  );

  if (!session.url) throw new Error("Couldn't start the payment.");
  redirect(session.url);
}
