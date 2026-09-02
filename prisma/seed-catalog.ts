/**
 * Bring companies that predate the split up to date: give them a trade, the
 * modules that trade implies, a service catalog and a tax list.
 *
 *   npm run db:seed-catalog
 *
 * New companies get all of this at sign-up (see lib/company-setup.ts). This is
 * for the ones that existed before there was such a thing.
 *
 * Idempotent, and cautious about it. Trade and modules are only written where
 * they are still at their defaults — `GENERAL` with no modules, which is what a
 * row that predates those columns looks like. A company that has deliberately
 * chosen a trade is never reclassified. Services and tax rates are only written
 * where the company has none, so a deleted service stays deleted and an edited
 * price stays edited.
 */
import { CompanyModule, PrismaClient, Trade } from "@prisma/client";
import { provisionCompanyCatalog } from "../lib/company-setup.ts";

const prisma = new PrismaClient();

/**
 * Every company that existed before this migration was a roofing company —
 * roof measurement was the entire product. Rather than assume it, the evidence
 * is checked: a company with roof sections, measurements or aerial imagery is
 * doing roofing, whatever its trade column happens to say.
 */
async function looksLikeRoofing(companyId: string): Promise<boolean> {
  const roofingRows = await prisma.job.count({
    where: {
      companyId,
      OR: [
        { sections: { some: {} } },
        { measurements: { some: {} } },
        { imagery: { some: {} } },
        { modelMeasurements: { some: {} } },
      ],
    },
  });
  return roofingRows > 0;
}

async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, trade: true, modules: true, province: true },
  });

  for (const company of companies) {
    const notes: string[] = [];
    let trade = company.trade;

    // Only a company still sitting on both defaults is a candidate — that
    // combination is what a pre-migration row looks like, and a deliberate
    // choice of GENERAL would have modules alongside it.
    if (company.trade === Trade.GENERAL && company.modules.length === 0) {
      const roofing = await looksLikeRoofing(company.id);
      trade = roofing ? Trade.ROOFING : Trade.GENERAL;
      const modules = roofing
        ? [CompanyModule.ROOFING, CompanyModule.AERIAL_MEASUREMENT]
        : [];

      await prisma.company.update({
        where: { id: company.id },
        data: { trade, modules },
      });
      notes.push(
        roofing
          ? "set trade to roofing (it has roof data) and turned on the roofing modules"
          : "left as a general contractor (no roof data to go on)"
      );
    }

    let province = company.province;
    if (!province) {
      // A contractor's own jobs are a better guess at the tax they charge than
      // a national default. Most common province across their work wins.
      const grouped = await prisma.job.groupBy({
        by: ["province"],
        where: { companyId: company.id, province: { not: "" } },
        _count: { province: true },
        orderBy: { _count: { province: "desc" } },
        take: 1,
      });
      province = grouped[0]?.province ?? null;
    }

    const { services, taxRates } = await provisionCompanyCatalog(company.id, { trade, province });
    if (services > 0) notes.push(`added ${services} service${services === 1 ? "" : "s"}`);
    if (taxRates > 0) {
      notes.push(
        `added ${taxRates} tax rate${taxRates === 1 ? "" : "s"}${province ? ` (${province})` : ""}`
      );
    }

    console.log(
      notes.length > 0 ? `${company.name}: ${notes.join("; ")}.` : `${company.name}: already set up.`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
