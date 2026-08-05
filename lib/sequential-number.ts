/**
 * The short number a contractor says out loud: "that's job 214", "quote 31",
 * "invoice 88."
 *
 * Per company and sequential, so it is memorable — a cuid is not. Derived from
 * the highest number already used rather than from a database sequence, so it
 * stays correct after an import from whatever the contractor was using before,
 * and after a backfill.
 *
 * That derivation can race: two records created in the same instant read the
 * same maximum. The unique constraint on `[companyId, <field>]` catches it and
 * this retries, rather than losing what somebody just typed into a form.
 *
 * One implementation, three callers. `lib/job-number.ts` and
 * `lib/quote/numbering.ts` were the same forty lines twice over before the
 * invoice needed them a third time, and three copies of a retry loop is three
 * places for the retry count to drift apart.
 */
import { Prisma } from "@prisma/client";

/** The columns that carry one of these. Each has its own unique constraint. */
export type SequentialField = "jobNumber" | "quoteNumber" | "invoiceNumber";

const MAX_ATTEMPTS = 5;

const NOUN: Record<SequentialField, string> = {
  jobNumber: "job",
  quoteNumber: "quote",
  invoiceNumber: "invoice",
};

export async function withSequentialNumber<T>(
  field: SequentialField,
  /** The highest value in use for this company, or null if there is none yet. */
  highest: () => Promise<number | null>,
  create: (value: number) => Promise<T>
): Promise<T> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const value = ((await highest()) ?? 0) + 1 + attempt;

    try {
      return await create(value);
    } catch (error) {
      // Only a collision on *this* column is ours to retry. Any other unique
      // violation is a different bug, and swallowing it into a retry loop would
      // turn one clear error into five identical ones.
      const collided =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        String(error.meta?.target ?? "").includes(field);
      if (!collided || attempt === MAX_ATTEMPTS - 1) throw error;
    }
  }

  // Unreachable: the loop either returns or throws on its last attempt.
  throw new Error(`Could not assign a ${NOUN[field]} number`);
}
