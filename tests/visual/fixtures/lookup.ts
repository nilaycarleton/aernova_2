import { PrismaClient } from "@prisma/client";

/**
 * Reads back the fixture IDs/tokens seed-visual-test-company.mjs created,
 * so spec files never hardcode a token — the fixture script is the one
 * source of truth for what exists, and generateShareToken() is random by
 * design.
 */
const prisma = new PrismaClient();

export const FIXTURE_JOB_IN_PROGRESS_ID = "visualtest_job_inprogress";
export const FIXTURE_JOB_COMPLETED_ID = "visualtest_job_completed";

export async function fixtureTokens() {
  const [quote, invoice, changeOrder, warranty, client] = await Promise.all([
    prisma.quote.findUniqueOrThrow({ where: { id: "visualtest_quote_maple" }, select: { shareToken: true } }),
    prisma.invoice.findUniqueOrThrow({ where: { id: "visualtest_invoice_maple" }, select: { shareToken: true } }),
    prisma.changeOrder.findUniqueOrThrow({ where: { id: "visualtest_co_maple" }, select: { shareToken: true } }),
    prisma.warranty.findUniqueOrThrow({ where: { id: "visualtest_warranty_maple" }, select: { shareToken: true } }),
    prisma.client.findUniqueOrThrow({ where: { id: "visualtest_client_maple" }, select: { shareToken: true } }),
  ]);
  return {
    quote: quote.shareToken!,
    invoice: invoice.shareToken!,
    changeOrder: changeOrder.shareToken!,
    warranty: warranty.shareToken!,
    hub: client.shareToken!,
  };
}
