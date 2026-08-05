/**
 * Giving a new company something to work with on the first screen.
 *
 * A contractor who signs up to an empty product has to build a price list
 * before they can build a quote, and that is where they leave. So the trade's
 * catalog and the province's taxes are written into their own rows at sign-up —
 * theirs to edit, and no longer anybody else's defaults.
 *
 * Both steps refuse to touch a company that already has rows. Re-running must
 * never restore a service a contractor deliberately deleted, or reset a price
 * they deliberately changed.
 */
import { Trade } from "@prisma/client";
// Relative, with the extension, like lib/reconstruction.ts: this module is
// imported by prisma/seed-catalog.ts, which runs under plain node and cannot
// resolve the "@/" alias.
import { prisma } from "./prisma.ts";
import { catalogForTrade, taxRatesForProvince } from "./trade-catalog.ts";

export type ProvisionResult = { services: number; taxRates: number };

export async function provisionCompanyCatalog(
  companyId: string,
  options: { trade: Trade; province?: string | null }
): Promise<ProvisionResult> {
  const result: ProvisionResult = { services: 0, taxRates: 0 };

  const existingServices = await prisma.service.count({ where: { companyId } });
  if (existingServices === 0) {
    const services = catalogForTrade(options.trade);
    if (services.length > 0) {
      const created = await prisma.service.createMany({
        data: services.map((service, index) => ({
          companyId,
          name: service.name,
          description: service.description ?? null,
          unitPriceCents: service.unitPriceCents,
          unitCostCents: service.unitCostCents ?? null,
          unit: service.unit,
          category: service.category,
          taxable: service.taxable ?? true,
          sortOrder: index,
        })),
      });
      result.services = created.count;
    }
  }

  const existingRates = await prisma.taxRate.count({ where: { companyId } });
  if (existingRates === 0) {
    const rates = taxRatesForProvince(options.province);
    const created = await prisma.taxRate.createMany({
      data: rates.map((rate, index) => ({
        companyId,
        name: rate.name,
        rateMicros: rate.rateMicros,
        isDefault: rate.isDefault ?? false,
        sortOrder: index,
      })),
    });
    result.taxRates = created.count;
  }

  return result;
}
