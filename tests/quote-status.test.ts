import assert from "node:assert/strict";
import { test } from "node:test";
import { QuoteStatus } from "@prisma/client";
import { canDeleteQuote } from "../lib/quote-status.ts";

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
