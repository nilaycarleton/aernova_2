"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth";
import { STATUS_FLOW } from "@/lib/job-status";
import { applyWorkflowTemplate } from "@/lib/workflow-template";

export type SaveWorkflowState = { error?: string; savedAt?: number };

/**
 * docs/AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md §14.6/§15/§25 Phase 11 — v1 is show/hide
 * + rename only, so this always writes all eight `STATUS_FLOW` rows in one
 * transaction rather than diffing what changed; `sortOrder` is set to the
 * fixed flow position, never user-editable in v1 (no drag-and-drop). Same
 * `manageCompany` gate the rest of Settings uses — crew and every other
 * non-office role never reach this action at all, since only OWNER/ADMIN
 * hold that capability (see `lib/permissions.ts`).
 */
export async function saveWorkflowStagesAction(
  _prevState: SaveWorkflowState,
  formData: FormData
): Promise<SaveWorkflowState> {
  const { company } = await requireCapability("manageCompany");

  await prisma.$transaction(
    STATUS_FLOW.map((status, index) => {
      const label = String(formData.get(`label:${status}`) ?? "").trim();
      const isEnabled = formData.get(`enabled:${status}`) === "on";
      return prisma.companyWorkflowStage.upsert({
        where: { companyId_jobStatus: { companyId: company.id, jobStatus: status } },
        create: { companyId: company.id, jobStatus: status, label: label || null, isEnabled, sortOrder: index },
        update: { label: label || null, isEnabled, sortOrder: index },
      });
    })
  );

  revalidatePath("/settings/workflow");
  return { savedAt: Date.now() };
}

/**
 * The small, explicit "start over" counterpart to the per-stage save above —
 * same shape as `resetCompanyCatalogAction` in `../actions.ts`: a distinct,
 * confirmed action (see `ConfirmSubmit` on the page), never folded into an
 * ordinary save, because it overwrites every label/enabled choice the
 * company has already made with the template's own.
 */
export async function resetWorkflowToTemplateAction(formData: FormData) {
  const { company } = await requireCapability("manageCompany");
  const templateId = String(formData.get("templateId") ?? "").trim();
  if (!templateId) throw new Error("Pick a workflow template.");

  await applyWorkflowTemplate(company.id, templateId);
  revalidatePath("/settings/workflow");
}
