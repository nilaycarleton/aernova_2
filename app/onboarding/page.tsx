import { redirect } from "next/navigation";
import { resolveCompanyContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PROVINCE_OPTIONS, TRADE_OPTIONS } from "@/lib/trade-catalog";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { completeOnboardingAction } from "./actions";

const selectClass =
  "w-full rounded-xl border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument";

/**
 * The one-time redirect target `requireCompanyContext` sends a fresh
 * company's owner to (see lib/auth.ts) — replaces the ROOFING/GST-only
 * defaults a brand-new signup starts with, seeded before this page was ever
 * asked anything, with the trade and province actually chosen here.
 *
 * Calls `resolveCompanyContext` directly rather than `requireCompanyContext`:
 * the company's `onboardedAt` is exactly what's still null at this point, so
 * the normal wrapper would redirect right back here.
 */
export default async function OnboardingPage() {
  const { company, role } = await resolveCompanyContext();

  // Already done, or the wrong person landed here directly — either way,
  // this page has nothing left to ask.
  if (company.onboardedAt || !can(role, "manageCompany")) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ground p-6">
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-surface-raised p-8">
        <h1 className="text-xl font-semibold text-ink-primary">Let&apos;s set you up</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Two quick things, and your price list and taxes are ready to go.
        </p>

        <form action={completeOnboardingAction} className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-secondary">
              What&apos;s your trade?
            </span>
            <select name="trade" required defaultValue="" className={selectClass}>
              <option value="" disabled>
                Choose one
              </option>
              {TRADE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-secondary">
              What province do you work in?
            </span>
            <select name="province" required defaultValue="" className={selectClass}>
              <option value="" disabled>
                Choose one
              </option>
              {PROVINCE_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <SubmitButton
            pendingText="Setting up…"
            className="w-full rounded-xl bg-ink-primary px-5 py-3 text-sm font-semibold text-ground transition hover:bg-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60"
          >
            Get started
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
