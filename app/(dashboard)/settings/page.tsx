import { headers } from "next/headers";
import { requirePageCapability } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { isStripeConfigured } from "@/lib/stripe";
import { refreshStripeAccountStatus } from "@/lib/stripe-connect";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { CompanyLogoUpload } from "@/components/dashboard/company-logo-upload";
import { RequestFormLinkPanel } from "@/components/dashboard/request-form-link-panel";
import { connectStripeAction, updateCompanyProfileAction } from "./actions";

const inputClass =
  "w-full rounded-xl border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument";

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-sm font-medium text-ink-secondary">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-muted">{hint}</span> : null}
    </label>
  );
}

/**
 * Item 39/40 (Phase 5b) plus the company profile the invoice gaps prompt
 * needed and had nowhere to send anyone — `lib/invoice/gaps.ts` used to point
 * "Add your business number" at `/team`, which has no such field.
 *
 * `requirePageCapability("manageCompany")` guards the page — office-tier,
 * both OWNER and ADMIN reach it — but the Payments section is gated again
 * inline on `manageBilling`, which is owner-only: this is the one settings
 * surface that decides where money physically lands, and an admin who can
 * fix a typo in the business number still has no business connecting Stripe.
 */
export default async function SettingsPage() {
  const { company, role } = await requirePageCapability("manageCompany");

  const host = (await headers()).get("host") ?? "localhost:3000";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  const requestFormUrl = `${origin}/request/${company.slug}`;

  let chargesEnabled = company.stripeChargesEnabled;
  let detailsSubmitted = company.stripeDetailsSubmitted;

  // Resync on view: a contractor who just finished Stripe's hosted onboarding
  // and landed back here should see it reflected immediately rather than wait
  // on a webhook that might still be in flight — the same reasoning
  // `sweepOverdueInvoices` settles a status on `/invoices` being opened rather
  // than trusting a background process alone.
  if (isStripeConfigured() && company.stripeAccountId) {
    try {
      const account = await refreshStripeAccountStatus(company.stripeAccountId);
      chargesEnabled = Boolean(account.charges_enabled);
      detailsSubmitted = Boolean(account.details_submitted);
    } catch {
      // Stripe unreachable, or the account id is stale in this environment.
      // Fall back to the cached flags rather than break the settings page.
    }
  }

  const buttonClass =
    "rounded-xl bg-ink-primary px-5 py-3 text-sm font-semibold text-ground transition hover:bg-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60";

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.18em] text-ink-muted">Settings</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink-primary">Company</h2>
        <p className="mt-2 max-w-2xl text-ink-muted">
          What goes on a quote or an invoice, and how homeowners can pay one.
        </p>
      </header>

      <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
        <h3 className="text-lg font-semibold text-ink-primary">Company profile</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Your name, logo and numbers appear on every quote and invoice a homeowner sees —
          never Aernova&rsquo;s.
        </p>

        <div className="mt-4">
          <CompanyLogoUpload logoUrl={company.logoUrl} />
        </div>

        <form action={updateCompanyProfileAction} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name">
              <input name="name" defaultValue={company.name} required className={inputClass} />
            </Field>
            <Field label="Legal business name" hint="If different from the name above.">
              <input name="legalName" defaultValue={company.legalName ?? ""} className={inputClass} />
            </Field>
            <Field label="Phone">
              <input name="phone" defaultValue={company.phone ?? ""} className={inputClass} />
            </Field>
            <Field label="Email">
              <input
                type="email"
                name="email"
                defaultValue={company.email ?? ""}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Address" className="sm:col-span-2">
              <input
                name="addressLine1"
                defaultValue={company.addressLine1 ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="City">
              <input name="city" defaultValue={company.city ?? ""} className={inputClass} />
            </Field>
            <Field label="Province">
              <input name="province" defaultValue={company.province ?? ""} className={inputClass} />
            </Field>
            <Field label="Postal code">
              <input
                name="postalCode"
                defaultValue={company.postalCode ?? ""}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-4 border-t border-hairline pt-4 sm:grid-cols-3">
            <Field label="Licence number">
              <input
                name="licenceNumber"
                defaultValue={company.licenceNumber ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Business number" hint="Required to charge tax on an invoice.">
              <input
                name="businessNumber"
                defaultValue={company.businessNumber ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="WCB / WSIB number">
              <input name="wcbNumber" defaultValue={company.wcbNumber ?? ""} className={inputClass} />
            </Field>
          </div>

          <SubmitButton pendingText="Saving…" className={buttonClass}>
            Save
          </SubmitButton>
        </form>
      </section>

      <RequestFormLinkPanel url={requestFormUrl} />

      {can(role, "manageBilling") ? (
        <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
          <h3 className="text-lg font-semibold text-ink-primary">Online payments</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Connect your own bank account so homeowners can pay their invoices online, by card.
            The money goes straight to you — Aernova is never in the middle of it.
          </p>

          {!isStripeConfigured() ? (
            <p className="mt-3 text-sm text-ink-muted">
              Online payments aren&rsquo;t set up in this environment yet.
            </p>
          ) : chargesEnabled ? (
            <>
              <p className="mt-3 text-sm font-medium text-confirm-fg">
                Connected — your invoices can be paid online.
              </p>
              <form action={connectStripeAction} className="mt-4">
                <SubmitButton pendingText="Opening…" className={buttonClass}>
                  Manage in Stripe
                </SubmitButton>
              </form>
            </>
          ) : company.stripeAccountId ? (
            <>
              <p className="mt-3 text-sm text-caution-fg">
                {detailsSubmitted
                  ? "Stripe is still reviewing your details — check back soon."
                  : "Onboarding isn't finished yet."}
              </p>
              <form action={connectStripeAction} className="mt-4">
                <SubmitButton pendingText="Opening…" className={buttonClass}>
                  Continue setup
                </SubmitButton>
              </form>
            </>
          ) : (
            <>
              <p className="mt-3 max-w-prose text-sm text-ink-muted">
                Takes about ten minutes. Stripe will ask for your business details and a bank
                account to deposit into — nothing you enter is seen by Aernova.
              </p>
              <form action={connectStripeAction} className="mt-4">
                <SubmitButton pendingText="Opening…" className={buttonClass}>
                  Connect with Stripe
                </SubmitButton>
              </form>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
