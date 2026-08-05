/**
 * Keeping a company's Stripe Connect flags in step with Stripe's own account.
 *
 * `Company.stripeChargesEnabled` / `stripePayoutsEnabled` / `stripeDetailsSubmitted`
 * are caches of what Stripe reports — `syncStripeAccountFlags` is the one
 * function allowed to write them, called from the webhook when Stripe tells us
 * unprompted, and from the settings page when a contractor comes back from
 * onboarding before that webhook has necessarily landed. Same "resync on view"
 * reasoning `resyncInvoiceMoney` and `sweepOverdueInvoices` already use
 * elsewhere in this codebase for a fact that a background process might not
 * have caught up on yet.
 */
import { prisma } from "./prisma.ts";
import { stripeClient } from "./stripe.ts";
import type Stripe from "stripe";

export async function syncStripeAccountFlags(account: Stripe.Account): Promise<void> {
  await prisma.company.updateMany({
    where: { stripeAccountId: account.id },
    data: {
      stripeChargesEnabled: Boolean(account.charges_enabled),
      stripePayoutsEnabled: Boolean(account.payouts_enabled),
      stripeDetailsSubmitted: Boolean(account.details_submitted),
    },
  });
}

/** Re-reads the account from Stripe and writes the flags. For the settings page. */
export async function refreshStripeAccountStatus(accountId: string): Promise<Stripe.Account> {
  const account = await stripeClient().accounts.retrieve(accountId);
  await syncStripeAccountFlags(account);
  return account;
}
