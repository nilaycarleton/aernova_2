/**
 * The Stripe client, when there is one to have.
 *
 * Same shape as `lib/email.ts` and `lib/storage.ts`'s driver split: without
 * `STRIPE_SECRET_KEY` there is no client at all, `stripeClient()` throws, and
 * every caller is expected to check `isStripeConfigured()` first rather than
 * catch the throw — a Connect settings page or a Pay button that renders and
 * then fails is worse than one that never rendered.
 *
 * No `apiVersion` pinned: the config type makes it optional, and pinning one
 * here is a second place a version string can go stale next to whatever the
 * Stripe dashboard account default already is.
 */
import Stripe from "stripe";

let client: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not set.");
  if (!client) client = new Stripe(secretKey);
  return client;
}
