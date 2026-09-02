import assert from "node:assert/strict";
import { test } from "node:test";
import { jobFinancialSummary } from "../lib/job-financial-summary.ts";

test("a job with no approved quote has no contract value, not a $0 one", () => {
  const summary = jobFinancialSummary(null, [], []);
  assert.equal(summary.originalContractCents, null);
  assert.equal(summary.effectiveContractValueCents, 0);
  assert.equal(summary.hasApprovedQuote, false);
  assert.equal(summary.isFullyInvoicedAgainstContract, false);
});

test("the original contract is the approved quote's total", () => {
  const summary = jobFinancialSummary({ totalAmountCents: 1_600_000 }, [], []);
  assert.equal(summary.originalContractCents, 1_600_000);
  assert.equal(summary.effectiveContractValueCents, 1_600_000);
});

test("only approved change orders raise the effective contract value", () => {
  const summary = jobFinancialSummary(
    { totalAmountCents: 1_600_000 },
    [
      { status: "APPROVED", amountCents: 120_000 },
      { status: "DRAFT", amountCents: 500_000 },
      { status: "SENT", amountCents: 300_000 },
      { status: "DECLINED", amountCents: 200_000 },
    ],
    []
  );
  assert.equal(summary.approvedChangeOrdersCents, 120_000, "only the approved one counts");
  assert.equal(summary.effectiveContractValueCents, 1_720_000, "§19.1's own worked example");
  assert.equal(summary.hasApprovedChangeOrders, true);
});

test("Additional Work invoices bill against the job but never touch contract value", () => {
  const summary = jobFinancialSummary(
    { totalAmountCents: 1_600_000 },
    [{ status: "APPROVED", amountCents: 120_000 }],
    [
      { status: "SENT", quoteId: "q1", totalAmountCents: 1_720_000, amountPaidCents: 0 },
      { status: "SENT", quoteId: null, totalAmountCents: 60_000, amountPaidCents: 0 },
    ]
  );
  assert.equal(summary.effectiveContractValueCents, 1_720_000, "unaffected by the direct invoice");
  assert.equal(summary.contractInvoicedCents, 1_720_000);
  assert.equal(summary.additionalWorkInvoicedCents, 60_000);
  assert.equal(summary.totalInvoicedCents, 1_780_000, "both sums combined, once");
  assert.equal(summary.hasAdditionalWork, true);
});

test("a voided invoice counts toward nothing — never billed, never paid", () => {
  const summary = jobFinancialSummary(
    { totalAmountCents: 1_000_000 },
    [],
    [
      { status: "SENT", quoteId: "q1", totalAmountCents: 500_000, amountPaidCents: 500_000 },
      { status: "VOID", quoteId: "q1", totalAmountCents: 400_000, amountPaidCents: 0 },
    ]
  );
  assert.equal(summary.contractInvoicedCents, 500_000, "the voided draw is excluded");
  assert.equal(summary.paidCents, 500_000);
});

test("paid total reuses the invoice's own cached amountPaidCents, not a re-summed payment ledger", () => {
  const summary = jobFinancialSummary(
    { totalAmountCents: 1_000_000 },
    [],
    [
      { status: "PARTIALLY_PAID", quoteId: "q1", totalAmountCents: 600_000, amountPaidCents: 250_000 },
      { status: "SENT", quoteId: null, totalAmountCents: 60_000, amountPaidCents: 0 },
    ]
  );
  assert.equal(summary.paidCents, 250_000);
  assert.equal(summary.balanceDueCents, 660_000 - 250_000);
});

test("balance due is total invoiced minus paid, across both contract and Additional Work invoices", () => {
  const summary = jobFinancialSummary(
    { totalAmountCents: 1_000_000 },
    [],
    [
      { status: "PAID", quoteId: "q1", totalAmountCents: 1_000_000, amountPaidCents: 1_000_000 },
      { status: "SENT", quoteId: null, totalAmountCents: 60_000, amountPaidCents: 0 },
    ]
  );
  assert.equal(summary.totalInvoicedCents, 1_060_000);
  assert.equal(summary.paidCents, 1_000_000);
  assert.equal(summary.balanceDueCents, 60_000);
  assert.equal(summary.isPaidInFull, false, "the Additional Work invoice is still owed");
});

test("remaining contract to bill is a different fact from balance due", () => {
  // Full contract billed and fully paid, but a fresh Additional Work invoice
  // just went out unpaid — remaining-to-bill should read $0 even though
  // balance due does not.
  const summary = jobFinancialSummary(
    { totalAmountCents: 1_000_000 },
    [],
    [
      { status: "PAID", quoteId: "q1", totalAmountCents: 1_000_000, amountPaidCents: 1_000_000 },
      { status: "SENT", quoteId: null, totalAmountCents: 60_000, amountPaidCents: 0 },
    ]
  );
  assert.equal(summary.remainingContractToBillCents, 0);
  assert.equal(summary.balanceDueCents, 60_000);
  assert.equal(summary.isFullyInvoicedAgainstContract, true);
  assert.equal(summary.isPaidInFull, false);
});

test("remaining contract to bill floors at zero and never goes negative", () => {
  // An approved change order raised the contract after a draw was already
  // billed against the old, smaller total — the drawn amount can exceed the
  // old contract's own remaining room for a moment, but never reads negative.
  const summary = jobFinancialSummary(
    { totalAmountCents: 500_000 },
    [{ status: "APPROVED", amountCents: 0 }],
    [{ status: "SENT", quoteId: "q1", totalAmountCents: 500_000, amountPaidCents: 0 }]
  );
  assert.equal(summary.remainingContractToBillCents, 0, "not -0 or a negative figure");
});

test("a job with only Additional Work and no quote at all still summarizes cleanly", () => {
  const summary = jobFinancialSummary(null, [], [
    { status: "SENT", quoteId: null, totalAmountCents: 45_000, amountPaidCents: 0 },
  ]);
  assert.equal(summary.originalContractCents, null);
  assert.equal(summary.contractInvoicedCents, 0);
  assert.equal(summary.additionalWorkInvoicedCents, 45_000);
  assert.equal(summary.totalInvoicedCents, 45_000);
  assert.equal(summary.remainingContractToBillCents, 0, "there is no contract to have room left on");
});
