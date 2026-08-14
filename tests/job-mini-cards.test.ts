import assert from "node:assert/strict";
import { test } from "node:test";
import { InvoiceStatus, QuoteStatus } from "@prisma/client";
import { financialMiniCardState, salesMiniCardState } from "../lib/job-mini-cards.ts";

test("a job with no quote reads as its own state, not a database default", () => {
  const card = salesMiniCardState("job1", null);
  assert.equal(card.label, "No quote yet");
  assert.equal(card.secondaryDetail, null);
  assert.deepEqual(card.action, { label: "Create a quote", href: "/jobs/job1?tab=quote" });
});

test("a draft quote's action is to keep editing, not to open a document nobody's seen", () => {
  const card = salesMiniCardState("job1", {
    id: "q1",
    status: QuoteStatus.DRAFT,
    totalAmountCents: 500_000,
  });
  assert.equal(card.label, "Draft");
  assert.equal(card.secondaryDetail, "$5,000.00");
  assert.deepEqual(card.action, { label: "Continue editing", href: "/jobs/job1/quotes/q1" });
});

test("a sent, viewed, or approved quote's action is to open it, and the label is never the raw enum", () => {
  for (const status of [QuoteStatus.SENT, QuoteStatus.VIEWED, QuoteStatus.APPROVED, QuoteStatus.CHANGES_REQUESTED]) {
    const card = salesMiniCardState("job1", { id: "q1", status, totalAmountCents: 100_000 });
    assert.notEqual(card.label, status);
    assert.ok(!card.label.includes("_"), `${status} label reads as an enum`);
    assert.equal(card.action?.label, "Open the quote");
  }
});

test("a job with no invoice explains why differently depending on whether a quote is approved", () => {
  const withApproval = financialMiniCardState("job1", null, true);
  const withoutApproval = financialMiniCardState("job1", null, false);
  assert.equal(withApproval.label, "No invoice yet");
  assert.match(withApproval.description, /nothing has been billed/i);
  assert.match(withoutApproval.description, /approved|directly/i);
  assert.deepEqual(withApproval.action, { label: "Go to billing", href: "/jobs/job1?tab=quote" });
});

test("a draft invoice's action is to send it", () => {
  const card = financialMiniCardState(
    "job1",
    {
      id: "inv1",
      status: InvoiceStatus.DRAFT,
      totalAmountCents: 200_000,
      amountPaidCents: 0,
      requiresHomeownerReview: false,
      homeownerReviewConfirmedAt: null,
      sentAt: null,
    },
    true
  );
  assert.equal(card.label, "Draft");
  assert.deepEqual(card.action, { label: "Send invoice", href: "/jobs/job1/invoices/inv1" });
});

test("an Additional Work invoice shared for review reads as its own state, not as a draft nobody's seen", () => {
  const card = financialMiniCardState(
    "job1",
    {
      id: "inv1",
      status: InvoiceStatus.DRAFT,
      totalAmountCents: 60_000,
      amountPaidCents: 0,
      requiresHomeownerReview: true,
      homeownerReviewConfirmedAt: null,
      sentAt: new Date("2026-08-01"),
    },
    true
  );
  assert.equal(card.label, "Awaiting homeowner review");
  assert.equal(card.secondaryDetail, "$600.00");
});

test("a homeowner-review invoice that's since been confirmed reads its real status, not the review state", () => {
  const card = financialMiniCardState(
    "job1",
    {
      id: "inv1",
      status: InvoiceStatus.SENT,
      totalAmountCents: 60_000,
      amountPaidCents: 0,
      requiresHomeownerReview: true,
      homeownerReviewConfirmedAt: new Date("2026-08-02"),
      sentAt: new Date("2026-08-01"),
    },
    true
  );
  assert.equal(card.label, "Awaiting payment");
});

test("a paid invoice shows its total, not a stale $0.00 owed", () => {
  const card = financialMiniCardState(
    "job1",
    {
      id: "inv1",
      status: InvoiceStatus.PAID,
      totalAmountCents: 100_000,
      amountPaidCents: 100_000,
      requiresHomeownerReview: false,
      homeownerReviewConfirmedAt: null,
      sentAt: new Date("2026-08-01"),
    },
    true
  );
  assert.equal(card.label, "Paid");
  assert.equal(card.secondaryDetail, "$1,000.00");
});

test("a partially paid invoice shows what's still owed, not the full total", () => {
  const card = financialMiniCardState(
    "job1",
    {
      id: "inv1",
      status: InvoiceStatus.PARTIALLY_PAID,
      totalAmountCents: 100_000,
      amountPaidCents: 40_000,
      requiresHomeownerReview: false,
      homeownerReviewConfirmedAt: null,
      sentAt: new Date("2026-08-01"),
    },
    true
  );
  assert.equal(card.secondaryDetail, "$600.00 owed");
  assert.equal(card.action?.label, "Open the invoice");
});
