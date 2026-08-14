import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveCompanyContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PROVINCE_OPTIONS, TRADE_OPTIONS } from "@/lib/trade-catalog";
import { STATUS_META } from "@/lib/job-status";
import { parseStageOverridesJson } from "@/lib/workflow-stages";
import { OnboardingForm, type OnboardingTemplateCard } from "@/components/onboarding/onboarding-form";

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

  // §14.6/§15/§25 Phase 11 — one small table (one row per trade in v1), read
  // once here rather than per-trade-selection, since `OnboardingForm`
  // filters client-side and there's no per-trade fetch to debounce.
  const templates = await prisma.workflowTemplate.findMany({
    select: { id: true, trade: true, name: true, stagesJson: true },
  });

  const templateCards: OnboardingTemplateCard[] = templates.map((t) => {
    const stages = parseStageOverridesJson(t.stagesJson);
    const hidden = stages.filter((s) => !s.isEnabled).map((s) => STATUS_META[s.jobStatus].label);
    const renamed = stages
      .filter((s) => s.label)
      .map((s) => `${STATUS_META[s.jobStatus].label} → ${s.label}`);
    return {
      id: t.id,
      trade: t.trade,
      name: t.name,
      hidesSummary: hidden.length > 0 ? `Hides: ${hidden.join(", ")}` : null,
      renamesSummary: renamed.length > 0 ? `Renames: ${renamed.join(", ")}` : null,
    };
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-ground p-6">
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-surface-raised p-8">
        <h1 className="text-xl font-semibold text-ink-primary">Let&apos;s set you up</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          A few quick things, and your price list, taxes and workflow are ready to go.
        </p>

        <OnboardingForm
          tradeOptions={TRADE_OPTIONS}
          provinceOptions={PROVINCE_OPTIONS}
          templates={templateCards}
        />
      </div>
    </main>
  );
}
