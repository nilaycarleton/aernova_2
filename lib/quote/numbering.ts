/**
 * "That's quote 14."
 *
 * The retry loop and the reasoning behind deriving from the maximum both live
 * in `lib/sequential-number.ts`, shared with jobs and invoices. What stays here
 * is the one thing that is actually about quotes: where the maximum is read
 * from.
 */
import { prisma } from "@/lib/prisma";
import { withSequentialNumber } from "@/lib/sequential-number";

export async function withQuoteNumber<T>(
  companyId: string,
  create: (quoteNumber: number) => Promise<T>
): Promise<T> {
  return withSequentialNumber(
    "quoteNumber",
    async () =>
      (
        await prisma.quote.aggregate({
          where: { companyId },
          _max: { quoteNumber: true },
        })
      )._max.quoteNumber,
    create
  );
}
