import assert from "node:assert/strict";
import { test } from "node:test";
import { invoiceEmailGap, invoiceSendGaps } from "../lib/invoice/gaps.ts";

const READY = { chargesTax: true, hasBusinessNumber: true, hasLines: true };

test("a complete invoice has nothing standing in its way", () => {
  assert.deepEqual(invoiceSendGaps(READY), []);
});

test("a tax invoice has to say who collected the tax", () => {
  const gaps = invoiceSendGaps({ ...READY, hasBusinessNumber: false });
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].id, "businessNumber");
});

test("the $450 repair with no tax on it is not blocked by a number nobody needs", () => {
  // The whole point of scoping the business-number rule to `chargesTax`: a
  // contractor under the small supplier threshold has no number to give and
  // must still be able to bill.
  assert.deepEqual(
    invoiceSendGaps({ chargesTax: false, hasBusinessNumber: false, hasLines: true }),
    []
  );
});

test("an invoice with no lines asks for nothing", () => {
  const gaps = invoiceSendGaps({ ...READY, hasLines: false });
  assert.ok(gaps.some((gap) => gap.id === "lines"));
});

test("every gap names what to add, not the rule that was broken", () => {
  const gaps = invoiceSendGaps({ chargesTax: true, hasBusinessNumber: false, hasLines: false });
  assert.equal(gaps.length, 2);
  for (const gap of gaps) {
    assert.ok(gap.need.length > 0, "a gap has to name a thing to add");
    assert.ok(gap.because.length > 0, "and say what it costs");
    assert.ok(
      !/required|invalid|must be/i.test(gap.because),
      `"${gap.because}" reads like a validator, not a roofer`
    );
  }
});

test("the missing email is kept out of the gaps that block the link", () => {
  // A contractor texting the link needs no email on file, and folding it in
  // would put a wall in front of the way most of these actually go out.
  assert.deepEqual(invoiceSendGaps(READY), []);
  assert.equal(invoiceEmailGap({ hasClientEmail: true }), null);
  assert.equal(invoiceEmailGap({ hasClientEmail: false })?.id, "email");
});
