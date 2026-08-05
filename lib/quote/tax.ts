/**
 * Which tax rate a new quote starts on.
 *
 * The building first, the business second. An Ottawa contractor taking a job
 * across the river in Gatineau charges QST, not HST — that is why `Property`
 * carries its own `taxRateId`, and this is the function that honours it. The
 * company default is the fallback, not the rule.
 *
 * Null is a legitimate answer: a company that has not set up tax rates yet gets
 * a quote with no tax on it, which is correct and which the builder says out
 * loud rather than silently charging zero.
 */
import { prisma } from "@/lib/prisma";

export async function defaultTaxRateFor(
  companyId: string,
  propertyId: string | null | undefined
): Promise<string | null> {
  if (propertyId) {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, companyId },
      select: { taxRateId: true },
    });
    if (property?.taxRateId) return property.taxRateId;
  }

  const fallback = await prisma.taxRate.findFirst({
    where: { companyId, isActive: true, isDefault: true },
    select: { id: true },
  });
  return fallback?.id ?? null;
}
