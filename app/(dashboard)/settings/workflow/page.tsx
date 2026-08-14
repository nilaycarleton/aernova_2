import Link from "next/link";
import { requirePageCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STATUS_FLOW, STATUS_META } from "@/lib/job-status";
import { parseStageOverridesJson } from "@/lib/workflow-stages";
import { ConfirmSubmit } from "@/components/dashboard/confirm-submit";
import { WorkflowStagesForm, type WorkflowStageRow } from "@/components/dashboard/workflow-stages-form";
import { resetWorkflowToTemplateAction } from "./actions";
import { PageHeader } from "@/components/ui/page-header";

/**
 * docs/AERNOVA_PROJECT_WORKFLOW.md §14.6/§15/§16/§25 Phase 11 — post-onboarding
 * editing for the same `CompanyWorkflowStage` rows the onboarding template
 * picker writes. `requirePageCapability("manageCompany")` is the same gate
 * the rest of Settings already uses (office-tier: OWNER + ADMIN) — no new
 * capability, and crew never reaches this page at all.
 *
 * v1 is show/hide + rename only: fixed `STATUS_FLOW` order, no drag-and-drop,
 * no new stages, no deleting a backend status — see `WorkflowStagesForm` for
 * the actual editing UI.
 */
export default async function WorkflowSettingsPage() {
  const { company } = await requirePageCapability("manageCompany");

  const [rows, templates] = await Promise.all([
    prisma.companyWorkflowStage.findMany({
      where: { companyId: company.id },
      select: { jobStatus: true, label: true, isEnabled: true },
    }),
    prisma.workflowTemplate.findMany({
      where: { trade: company.trade },
      select: { id: true, name: true, stagesJson: true },
    }),
  ]);

  const stageRows: WorkflowStageRow[] = STATUS_FLOW.map((status) => {
    const override = rows.find((r) => r.jobStatus === status);
    return {
      status,
      defaultLabel: STATUS_META[status].label,
      currentLabel: override?.label ?? "",
      isEnabled: override?.isEnabled ?? true,
    };
  });

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Link href="/settings" className="hover:text-ink-secondary">
              Settings
            </Link>
            {" · Workflow"}
          </>
        }
        title="Workflow"
        description="What stages your jobs move through, and what you call them. Hiding a stage only changes what's offered on jobs going forward — it never touches a job already sitting in it."
      />

      <WorkflowStagesForm stages={stageRows} />

      {templates.length > 0 ? (
        <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
          <h3 className="text-lg font-semibold text-ink-primary">Start over with a template</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Replaces every label and shown/hidden choice above with the template&rsquo;s own.
            Doesn&rsquo;t touch any job already in progress.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {templates.map((template) => {
              const templateStages = parseStageOverridesJson(template.stagesJson);
              const hiddenLabels = templateStages
                .filter((s) => !s.isEnabled)
                .map((s) => STATUS_META[s.jobStatus].label);
              return (
                <form key={template.id} action={resetWorkflowToTemplateAction} className="min-w-0">
                  <input type="hidden" name="templateId" value={template.id} />
                  <ConfirmSubmit
                    pendingText="Applying…"
                    question={`Replace your current workflow labels and shown/hidden stages with "${template.name}"? This doesn't change any job already in progress.`}
                    className="rounded-xl border border-hairline px-5 py-3 text-sm font-semibold text-ink-primary transition hover:bg-ground/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60"
                  >
                    {template.name}
                  </ConfirmSubmit>
                  {hiddenLabels.length > 0 ? (
                    <p className="mt-1.5 text-xs text-ink-muted">Hides: {hiddenLabels.join(", ")}</p>
                  ) : null}
                </form>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
