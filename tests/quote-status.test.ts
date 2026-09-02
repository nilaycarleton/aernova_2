import assert from "node:assert/strict";
import { test } from "node:test";
import { QuoteStatus } from "@prisma/client";
import { canDeleteQuote, quoteStatusTone } from "../lib/quote-status.ts";

test("a quote nobody has answered, or that already said no, can be deleted", () => {
  for (const status of [
    QuoteStatus.DRAFT,
    QuoteStatus.CHANGES_REQUESTED,
    QuoteStatus.REJECTED,
    QuoteStatus.EXPIRED,
  ]) {
    assert.equal(canDeleteQuote(status), true, status);
  }
});

test("a quote a homeowner may still have open, or has approved, cannot be deleted", () => {
  for (const status of [QuoteStatus.SENT, QuoteStatus.VIEWED, QuoteStatus.APPROVED]) {
    assert.equal(canDeleteQuote(status), false, status);
  }
});

test("APPROVED reads as success, CHANGES_REQUESTED reads as caution, everything else neutral", () => {
  assert.equal(quoteStatusTone(QuoteStatus.APPROVED), "success");
  assert.equal(quoteStatusTone(QuoteStatus.CHANGES_REQUESTED), "caution");
  for (const status of [
    QuoteStatus.DRAFT,
    QuoteStatus.SENT,
    QuoteStatus.VIEWED,
    QuoteStatus.REJECTED,
    QuoteStatus.EXPIRED,
  ]) {
    assert.equal(quoteStatusTone(status), "neutral", status);
  }
});
