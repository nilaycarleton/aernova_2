/**
 * The Prisma-touching half of workflow customization — applying a
 * `WorkflowTemplate` to a company. Kept separate from `lib/workflow-stages.ts`
 * (a pure display join, zero Prisma) the same way `lib/job-status.ts` stays
 * pure while `status-actions.ts` is the one place that writes, and the same
 * way `provisionCompanyCatalog`/`resetCompanyCatalog` in
 * `lib/company-setup.ts` are the one shared write path for both onboarding
 * and Settings' catalog reset.
 *
 * Upserts by `(companyId, jobStatus)` rather than deleting-and-recreating,
 * so applying a template is safe to call more than once and never produces
 * a moment with no rows. Never touches `Job.status` — picking a template
 * changes what's *offered* going forward, not where any existing job is.
 */
import { prisma } from "./prisma.ts";
import { parseStageOverridesJson } from "./workflow-stages.ts";

export type ApplyWorkflowTemplateResult = { templateName: string; stagesApplied: number };

/** Applies a built-in `WorkflowTemplate`'s stages to a company, by upsert. */
export async function applyWorkflowTemplate(
  companyId: string,
  templateId: string
): Promise<ApplyWorkflowTemplateResult> {
  const template = await prisma.workflowTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new Error("That workflow template no longer exists.");

  const stages = parseStageOverridesJson(template.stagesJson);

  await prisma.$transaction(
    stages.map((stage, index) =>
      prisma.companyWorkflowStage.upsert({
        where: { companyId_jobStatus: { companyId, jobStatus: stage.jobStatus } },
        create: {
          companyId,
          jobStatus: stage.jobStatus,
          label: stage.label,
          isEnabled: stage.isEnabled,
          sortOrder: index,
        },
        update: { label: stage.label, isEnabled: stage.isEnabled, sortOrder: index },
      })
    )
  );

  return { templateName: template.name, stagesApplied: stages.length };
}
