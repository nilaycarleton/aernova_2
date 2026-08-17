// One-off local fixture setup for the Playwright visual-regression suite.
// Creates (idempotently) a dedicated test user + company + a handful of
// jobs/clients/requests so authenticated screenshots show real, representative
// content rather than every route in its empty state. Never touches the real
// owner's own company/data — everything here lives under the pre-existing,
// already-empty "Aernova Demo Roofing" seed company (prisma/seed.mjs's slug
// "aernova-demo"), just populated with current-schema rows since that old
// seed script predates the Job/Client/Quote domain model.
//
// Not part of `npm run db:seed` — run explicitly via
// `node --env-file=.env --experimental-strip-types tests/visual/fixtures/seed-visual-test-company.mjs`
// before the visual suite's auth setup project.
import { PrismaClient, CompanyRole, JobStatus, RequestStatus, ClientStatus, QuoteStatus, InvoiceStatus, ChangeOrderStatus, WarrantyStatus } from "@prisma/client";
import { generateShareToken } from "../../../lib/share-token.ts";

const prisma = new PrismaClient();

const CLERK_USER_ID = process.env.VISUAL_TEST_CLERK_USER_ID;
const CLERK_EMAIL = process.env.VISUAL_TEST_CLERK_EMAIL;
if (!CLERK_USER_ID || !CLERK_EMAIL) {
  throw new Error("VISUAL_TEST_CLERK_USER_ID and VISUAL_TEST_CLERK_EMAIL must be set");
}

async function main() {
  const company = await prisma.company.upsert({
    where: { slug: "aernova-demo" },
    update: {},
    create: { name: "Aernova Demo Roofing", slug: "aernova-demo", trade: "ROOFING" },
  });

  const user = await prisma.user.upsert({
    where: { clerkUserId: CLERK_USER_ID },
    update: { email: CLERK_EMAIL },
    create: {
      clerkUserId: CLERK_USER_ID,
      email: CLERK_EMAIL,
      firstName: "Visual",
      lastName: "Test",
    },
  });

  await prisma.companyMembership.upsert({
    where: { companyId_userId: { companyId: company.id, userId: user.id } },
    update: { role: CompanyRole.OWNER },
    create: { companyId: company.id, userId: user.id, role: CompanyRole.OWNER },
  });

  // Mark the company onboarded so requireCompanyContext() doesn't redirect
  // to /onboarding on every authenticated route.
  await prisma.company.update({ where: { id: company.id }, data: { onboardedAt: new Date() } });

  const client = await prisma.client.upsert({
    where: { id: "visualtest_client_maple" },
    update: {},
    create: {
      id: "visualtest_client_maple",
      companyId: company.id,
      firstName: "Jordan",
      lastName: "Homeowner",
      displayName: "Jordan Homeowner",
      email: "jordan.homeowner@example.com",
      phone: "6135550100",
      status: ClientStatus.ACTIVE,
      shareToken: generateShareToken(),
    },
  });

  const property = await prisma.property.upsert({
    where: { id: "visualtest_property_maple" },
    update: {},
    create: {
      id: "visualtest_property_maple",
      companyId: company.id,
      clientId: client.id,
      addressLine1: "42 Maple Street",
      city: "Ottawa",
      province: "ON",
      postalCode: "K1A 0B1",
    },
  });

  const jobsToSeed = [
    { id: "visualtest_job_inprogress", name: "Maple Street Roof Replacement", status: JobStatus.IN_PROGRESS, jobNumber: 101 },
    { id: "visualtest_job_completed", name: "Birch Avenue Reshingle", status: JobStatus.COMPLETED, jobNumber: 102 },
    { id: "visualtest_job_lead", name: "Cedar Lane Inspection", status: JobStatus.LEAD, jobNumber: 103 },
  ];

  for (const j of jobsToSeed) {
    await prisma.job.upsert({
      where: { id: j.id },
      update: {},
      create: {
        id: j.id,
        companyId: company.id,
        createdById: user.id,
        clientId: client.id,
        propertyId: property.id,
        name: j.name,
        jobNumber: j.jobNumber,
        status: j.status,
        clientName: client.displayName,
        clientEmail: client.email,
        clientPhone: client.phone,
        addressLine1: property.addressLine1,
        city: property.city,
        province: property.province,
        postalCode: property.postalCode,
      },
    });
  }

  await prisma.request.upsert({
    where: { id: "visualtest_request_cedar" },
    update: {},
    create: {
      id: "visualtest_request_cedar",
      companyId: company.id,
      clientId: client.id,
      propertyId: property.id,
      title: "Roof inspection after storm",
      description: "Homeowner noticed missing shingles after last week's wind.",
      status: RequestStatus.NEW,
      source: "phone",
    },
  });

  // Public-document fixtures (quote/invoice/change-order/warranty), all tied
  // to the same in-progress job, each with a real generateShareToken() so
  // the visual suite can hit /q, /i, /co, /w exactly the way a homeowner
  // would — arithmetic kept deliberately trivial (one line item, no tax/
  // discount) so nothing here risks disagreeing with lib/quote/totals.ts's
  // own math; this is fixture data, not a recomputation of it.
  const quote = await prisma.quote.upsert({
    where: { id: "visualtest_quote_maple" },
    update: {},
    create: {
      id: "visualtest_quote_maple",
      companyId: company.id,
      jobId: "visualtest_job_inprogress",
      quoteNumber: 1,
      title: "Roof Replacement — Maple Street",
      status: QuoteStatus.SENT,
      totalAmountCents: 500000,
      clientMessage: "Thanks for the opportunity to quote this — let us know if you have questions.",
      shareToken: generateShareToken(),
      sentAt: new Date(),
    },
  });

  await prisma.quoteLineItem.upsert({
    where: { id: "visualtest_quote_line_1" },
    update: {},
    create: {
      id: "visualtest_quote_line_1",
      quoteId: quote.id,
      name: "Full roof tear-off and reshingle",
      description: "Remove existing shingles, install synthetic underlayment and new architectural shingles.",
      quantity: 1,
      unit: "each",
      unitPriceCents: 500000,
      amountCents: 500000,
      sortOrder: 0,
    },
  });

  const invoice = await prisma.invoice.upsert({
    where: { id: "visualtest_invoice_maple" },
    update: {},
    create: {
      id: "visualtest_invoice_maple",
      companyId: company.id,
      jobId: "visualtest_job_inprogress",
      quoteId: quote.id,
      invoiceNumber: 1,
      title: "Invoice — Maple Street Roof Replacement",
      status: InvoiceStatus.SENT,
      subtotalCents: 500000,
      totalAmountCents: 500000,
      shareToken: generateShareToken(),
      sentAt: new Date(),
      issuedAt: new Date(),
    },
  });

  await prisma.invoiceLineItem.upsert({
    where: { id: "visualtest_invoice_line_1" },
    update: {},
    create: {
      id: "visualtest_invoice_line_1",
      invoiceId: invoice.id,
      name: "Full roof tear-off and reshingle",
      quantity: 1,
      unit: "each",
      unitPriceCents: 500000,
      amountCents: 500000,
      sortOrder: 0,
    },
  });

  await prisma.changeOrder.upsert({
    where: { id: "visualtest_co_maple" },
    update: {},
    create: {
      id: "visualtest_co_maple",
      companyId: company.id,
      jobId: "visualtest_job_inprogress",
      quoteId: quote.id,
      title: "Add gutter guard install",
      description: "Homeowner asked to add gutter guards while the crew is already on the roof.",
      status: ChangeOrderStatus.SENT,
      amountCents: 45000,
      shareToken: generateShareToken(),
      sentAt: new Date(),
      createdByUserId: user.id,
    },
  });

  await prisma.warranty.upsert({
    where: { id: "visualtest_warranty_maple" },
    update: {},
    create: {
      id: "visualtest_warranty_maple",
      companyId: company.id,
      jobId: "visualtest_job_completed",
      termMonths: 60,
      startsAt: new Date(),
      coverageNotes: "Covers workmanship on the full roof replacement.",
      exclusions: "Does not cover storm or impact damage.",
      companyInfoSnapshot: "Aernova Demo Roofing\n42 Contractor Way, Ottawa, ON",
      customerInfoSnapshot: client.displayName,
      propertyAddressSnapshot: `${property.addressLine1}, ${property.city}, ${property.province}`,
      status: WarrantyStatus.SENT,
      shareToken: generateShareToken(),
      sentAt: new Date(),
    },
  });

  console.log("Visual-test fixture ready:", { companyId: company.id, userId: user.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
