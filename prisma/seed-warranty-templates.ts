/**
 * docs/AERNOVA_PROJECT_WORKFLOW.md §14.4/§25 Phase 10 — the v1 launch
 * starter set: Simple and Detailed per trade, eight rows total.
 *
 *   npm run db:seed-warranty-templates
 *
 * Idempotent by inspection rather than a database constraint (same
 * doctrine `prisma/seed-catalog.ts` already uses): for each of the eight,
 * checked by `(companyId: null, trade, variant)` before creating, so
 * re-running this script never duplicates a row, and a business owner who
 * has since edited a company-owned *copy* of one is never touched — this
 * script only ever writes rows with `companyId: null`.
 *
 * "Simple" and "Detailed" differ in `coverageNotes`/`exclusions` length and
 * specificity, not in `termMonths` — a company can still adjust the term on
 * either variant before saving its own copy (§14.4's own instruction).
 */
import { PrismaClient, Trade } from "@prisma/client";

const prisma = new PrismaClient();

type Starter = {
  trade: Trade;
  variant: "Simple" | "Detailed";
  name: string;
  termMonths: number;
  coverageNotes: string;
  exclusions: string;
};

const STARTERS: Starter[] = [
  {
    trade: Trade.ROOFING,
    variant: "Simple",
    name: "Roofing — Simple Warranty",
    termMonths: 60,
    coverageNotes:
      "We warranty our workmanship on this roof for the term shown above. If a leak or install defect traces back to our work, we'll repair it at no charge.",
    exclusions:
      "Doesn't cover storm, hail, or wind damage, normal wear, or work done by anyone else after we finished. Manufacturer material warranties are separate and stay with the shingle or membrane maker.",
  },
  {
    trade: Trade.ROOFING,
    variant: "Detailed",
    name: "Roofing — Detailed Warranty",
    termMonths: 60,
    coverageNotes:
      "We warranty our workmanship for the term shown above, covering the installation of shingles/membrane, underlayment, flashing, ridge and hip caps, and all fasteners and sealants we installed. If a leak or defect is traced to our installation, we'll inspect within a reasonable time and repair it at no charge, including any interior damage our own work directly caused.",
    exclusions:
      "Doesn't cover storm, hail, wind, or falling-debris damage; ice damming from inadequate attic ventilation that predates our work; normal wear and weathering; foot traffic damage after handover; or any modification, repair, or new penetration (satellite dish, solar, vent) made by anyone else after completion. Manufacturer material defects are covered separately under the shingle or membrane maker's own warranty, registered at install.",
  },
  {
    trade: Trade.PLUMBING,
    variant: "Simple",
    name: "Plumbing — Simple Warranty",
    termMonths: 12,
    coverageNotes:
      "We warranty our workmanship on this job for the term shown above. If a leak or install defect traces back to our work, we'll fix it at no charge.",
    exclusions:
      "Doesn't cover pre-existing pipe condition, damage from freezing, normal wear on fixtures, or work done by anyone else after we finished. Manufacturer warranties on fixtures and parts are separate.",
  },
  {
    trade: Trade.PLUMBING,
    variant: "Detailed",
    name: "Plumbing — Detailed Warranty",
    termMonths: 12,
    coverageNotes:
      "We warranty our workmanship for the term shown above, covering all connections, joints, and fixtures we installed or repaired. If a leak, drip, or drainage issue is traced to our work, we'll return and repair it at no charge, including reasonable access work needed to reach it.",
    exclusions:
      "Doesn't cover pre-existing pipe or fixture condition, damage from freezing or hard water buildup, clogs from misuse, normal wear on washers and seals, or any work, modification, or repair done by anyone else after we finished. Manufacturer defects in fixtures, water heaters, or parts are covered separately under their own warranty.",
  },
  {
    trade: Trade.LAWN_CARE,
    variant: "Simple",
    name: "Lawn Care — Simple Warranty",
    termMonths: 6,
    coverageNotes:
      "If the work we did doesn't take as expected within the term shown above — new sod, seeding, or planting we installed — we'll return and redo it at no charge.",
    exclusions:
      "Doesn't cover damage from drought, flooding, pets, foot traffic, pests, or a watering schedule not followed as advised. Seasonal dormancy is expected and isn't a defect.",
  },
  {
    trade: Trade.LAWN_CARE,
    variant: "Detailed",
    name: "Lawn Care — Detailed Warranty",
    termMonths: 6,
    coverageNotes:
      "If new sod, seed, or plantings we installed fail to establish within the term shown above under normal care, we'll assess the area and replace or reseed the affected section at no charge. This covers our installation and initial establishment period only.",
    exclusions:
      "Doesn't cover damage from drought, flooding, extreme heat or cold, pets, foot or vehicle traffic, pest or disease pressure, or a watering/mowing schedule not followed as advised at handover. Seasonal dormancy, normal colour change, and mowing-height stress from a third-party service are not defects. Trees and shrubs follow a separate establishment period noted on the invoice, if applicable.",
  },
  {
    trade: Trade.GENERAL,
    variant: "Simple",
    name: "General Contracting — Simple Warranty",
    termMonths: 24,
    coverageNotes:
      "We warranty our workmanship on this project for the term shown above. If a defect traces back to our work, we'll repair it at no charge.",
    exclusions:
      "Doesn't cover normal wear, damage from misuse or from work done by anyone else after we finished, or materials covered separately under their own manufacturer warranty.",
  },
  {
    trade: Trade.GENERAL,
    variant: "Detailed",
    name: "General Contracting — Detailed Warranty",
    termMonths: 24,
    coverageNotes:
      "We warranty our workmanship for the term shown above, covering the structural, finish, and installation work described in the project scope. If a defect is traced to our work, we'll inspect within a reasonable time and repair it at no charge, including reasonable access work needed to reach it.",
    exclusions:
      "Doesn't cover normal wear and settling, damage from misuse, water intrusion from a source outside our scope of work, or any modification, repair, or addition made by anyone else after handover. Appliances, fixtures, and materials with their own manufacturer warranty are covered separately under that warranty, registered at install.",
  },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const starter of STARTERS) {
    const existing = await prisma.warrantyTemplate.findFirst({
      where: { companyId: null, trade: starter.trade, variant: starter.variant },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.warrantyTemplate.create({
      data: {
        companyId: null,
        trade: starter.trade,
        variant: starter.variant,
        name: starter.name,
        termMonths: starter.termMonths,
        coverageNotes: starter.coverageNotes,
        exclusions: starter.exclusions,
        isDefault: false,
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
