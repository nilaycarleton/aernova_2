/**
 * Backfill `Quote.totalAmountCents` from the legacy float `totalAmount`.
 *
 *   npm run db:backfill-money
 *
 * Idempotent: only touches rows where the cents column is still null, so it is
 * safe to run repeatedly and safe to run again after the next deploy picks up
 * stragglers written by an older build. Once this reports nothing left to do and
 * a release has passed, `Quote.totalAmount` can be dropped from the schema.
 */
import { PrismaClient } from "@prisma/client";
import { toCents } from "../lib/money.ts";

const prisma = new PrismaClient();

async function main() {
  const pending = await prisma.quote.findMany({
    where: { totalAmountCents: null, totalAmount: { not: null } },
    select: { id: true, totalAmount: true },
  });

  if (pending.length === 0) {
    console.log("Nothing to backfill — every quote already has a cents total.");
    return;
  }

  for (const quote of pending) {
    await prisma.quote.update({
      where: { id: quote.id },
      data: { totalAmountCents: toCents(quote.totalAmount ?? 0) },
    });
  }

  console.log(`Backfilled ${pending.length} quote${pending.length === 1 ? "" : "s"}.`);

  // A quote with neither total is legitimate (an untouched draft), so it is
  // reported rather than treated as a failure.
  const stillNull = await prisma.quote.count({ where: { totalAmountCents: null } });
  if (stillNull > 0) {
    console.log(`${stillNull} quote(s) have no total at all — left as null.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
