"use server";

import { Trade } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveCompanyContext } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { resetCompanyCatalog } from "@/lib/company-setup";
import { applyWorkflowTemplate } from "@/lib/workflow-template";
import { PROVINCE_OPTIONS, TRADE_OPTIONS } from "@/lib/trade-catalog";

/**
 * Uses `resolveCompanyContext` directly, not `requireCompanyContext` — the
 * latter would redirect right back to /onboarding, since `onboardedAt` is
 * still null at the moment this runs. `assertCan` here is that redirect's
 * replacement: the same "only someone who could actually act on this" gate,
 * just throwing instead of bouncing, since there's nowhere left to bounce to.
 *
 * §14.6/§15/§25 Phase 11 — `workflowTemplateId` is optional: the second,
 * new step of onboarding (see `page.tsx`) lets someone skip picking a
 * workflow template entirely, and a company with no `CompanyWorkflowStage`
 * rows already falls back to every stage visible with default labels — the
 * same behaviour a template pick would produce for a trade with nothing to
 * hide or rename. Applying a template only ever writes display/visibility
 * rows; it never touches `Job.status` on any existing job, because there
 * are none yet — this is a brand-new company's first screen.
 */
export async function completeOnboardingAction(formData: FormData) {
  const { company, role } = await resolveCompanyContext();
  assertCan(role, "manageCompany");

  const trade = formData.get("trade");
  const province = formData.get("province");
  const workflowTemplateId = formData.get("workflowTemplateId");

  if (typeof trade !== "string" || !TRADE_OPTIONS.some((t) => t.value === trade)) {
    throw new Error("Pick a trade from the list.");
  }
  if (typeof province !== "string" || !PROVINCE_OPTIONS.some((p) => p.value === province)) {
    throw new Error("Pick a province from the list.");
  }

  await prisma.company.update({
    where: { id: company.id },
    data: { trade: trade as Trade, province, onboardedAt: new Date() },
  });

  // Day zero: nothing could have been customized yet (this is the first
  // screen after signup), so this always replaces the ROOFING/GST-only
  // defaults rather than asking again — unlike the same reset in Settings,
  // which is a separate, explicit, confirmed action for exactly that reason.
  await resetCompanyCatalog(company.id, { trade: trade as Trade, province });

  if (typeof workflowTemplateId === "string" && workflowTemplateId) {
    await applyWorkflowTemplate(company.id, workflowTemplateId);
  }

  redirect("/dashboard");
}
