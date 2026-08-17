/**
 * docs/AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md §14.6/§15/§25 Phase 11 — one built-in
 * workflow template per trade, seeded once and picked from at onboarding
 * (or later, as a reset, from Settings → Workflow).
 *
 *   npm run db:seed-workflow-templates
 *
 * Idempotent by inspection rather than a database constraint (same
 * doctrine `prisma/seed-catalog.ts` and `prisma/seed-warranty-templates.ts`
 * already use): checked by `(trade, name)` before creating, so re-running
 * this script never duplicates a row.
 *
 * `Trade` is a closed four-value enum (`ROOFING`, `PLUMBING`, `LAWN_CARE`,
 * `GENERAL`) with `GENERAL` as `Company.trade`'s own default — so `GENERAL`
 * already *is* the generic fallback trade a company lands on before picking
 * a real one; there's no fifth "generic" template to seed separately.
 *
 * `stagesJson` is the real `STATUS_FLOW` order verbatim (see
 * `lib/job-status.ts`) — v1 doesn't reorder, only shows/hides/relabels.
 * `PROCESSING` ("Building the 3D model and extracting roof measurements")
 * is roofing's photogrammetry step; every non-roofing template disables it,
 * per §15's own instruction. The one relabel applied everywhere else is
 * `READY_FOR_QUOTE` → "Ready to price" for non-roofing trades, taken
 * directly from §15's own illustrative example ("a plumbing company can
 * call READY_FOR_QUOTE 'Ready to Price'"). `CompanyWorkflowStage` has no
 * `description` field in v1 — the underlying `STATUS_META` description
 * still renders under a renamed label, a known v1 limitation of the exact
 * schema this plan specifies, not something this seed script can fix.
 */
import { PrismaClient, Trade, JobStatus } from "@prisma/client";

const prisma = new PrismaClient();

type StageEntry = { jobStatus: JobStatus; label: string | null; isEnabled: boolean };

const STATUS_FLOW: JobStatus[] = [
  JobStatus.LEAD,
  JobStatus.INSPECTION,
  JobStatus.PROCESSING,
  JobStatus.READY_FOR_QUOTE,
  JobStatus.QUOTED,
  JobStatus.SCHEDULED,
  JobStatus.IN_PROGRESS,
  JobStatus.COMPLETED,
];

function stages(overrides: Partial<Record<JobStatus, { label?: string | null; isEnabled?: boolean }>>): StageEntry[] {
  return STATUS_FLOW.map((jobStatus) => ({
    jobStatus,
    label: overrides[jobStatus]?.label ?? null,
    isEnabled: overrides[jobStatus]?.isEnabled ?? true,
  }));
}

type Starter = { trade: Trade; name: string; stagesJson: StageEntry[] };

const STARTERS: Starter[] = [
  {
    trade: Trade.ROOFING,
    name: "Roofing (default)",
    // Mostly matches today's existing labels/visibility, per §15/§25 Phase 11.
    stagesJson: stages({}),
  },
  {
    trade: Trade.PLUMBING,
    name: "Plumbing (default)",
    stagesJson: stages({
      PROCESSING: { isEnabled: false },
      READY_FOR_QUOTE: { label: "Ready to price" },
    }),
  },
  {
    trade: Trade.LAWN_CARE,
    name: "Lawn Care (default)",
    stagesJson: stages({
      PROCESSING: { isEnabled: false },
      READY_FOR_QUOTE: { label: "Ready to price" },
    }),
  },
  {
    trade: Trade.GENERAL,
    name: "General Contractor (default)",
    stagesJson: stages({
      PROCESSING: { isEnabled: false },
      READY_FOR_QUOTE: { label: "Ready to price" },
    }),
  },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const starter of STARTERS) {
    const existing = await prisma.workflowTemplate.findFirst({
      where: { trade: starter.trade, name: starter.name },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.workflowTemplate.create({
      data: {
        trade: starter.trade,
        name: starter.name,
        stagesJson: starter.stagesJson,
      },
    });
    created++;
    console.log(`Created: ${starter.name}`);
  }

  console.log(`Done. ${created} created, ${skipped} already existed.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
