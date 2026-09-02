/**
 * The number a contractor says on the phone: "that's job 214."
 *
 * The retry loop and the reasoning behind deriving from the maximum both live
 * in `lib/sequential-number.ts`, shared with quotes and invoices. What stays
 * here is the one thing that is actually about jobs: where the maximum is read
 * from.
 */
import { prisma } from "@/lib/prisma";
import { withSequentialNumber } from "@/lib/sequential-number";

export async function withJobNumber<T>(
  companyId: string,
  create: (jobNumber: number) => Promise<T>
): Promise<T> {
  return withSequentialNumber(
    "jobNumber",
    async () =>
      (
        await prisma.job.aggregate({
          where: { companyId },
          _max: { jobNumber: true },
        })
      )._max.jobNumber,
    create
  );
}
