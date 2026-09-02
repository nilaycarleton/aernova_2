import assert from "node:assert/strict";
import { test } from "node:test";
import { buildActionCenterItems, type ActionCenterFacts } from "../lib/dashboard-action-center.ts";

const EMPTY: ActionCenterFacts = {
  canViewMoney: true,
  overdueInvoiceCount: 0,
  overdueInvoiceCents: 0,
  newRequestCount: 0,
  changesRequestedQuoteCount: 0,
  disabledStageJobCount: 0,
};

test("nothing needing attention returns an empty list", () => {
  assert.deepEqual(buildActionCenterItems(EMPTY), []);
});

test("overdue invoices produce a high-priority danger item with the right link", () => {
  const items = buildActionCenterItems({ ...EMPTY, overdueInvoiceCount: 2, overdueInvoiceCents: 63000 });
  assert.equal(items.length, 1);
  assert.equal(items[0].priority, "high");
  assert.equal(items[0].tone, "danger");
  assert.equal(items[0].href, "/invoices?status=OVERDUE&range=all");
  assert.match(items[0].description!, /2 invoices/);
});

test("a single overdue invoice reads as singular", () => {
  const items = buildActionCenterItems({ ...EMPTY, overdueInvoiceCount: 1, overdueInvoiceCents: 10000 });
  assert.match(items[0].description!, /1 invoice,/);
});

test("a role without viewMoney never sees the overdue-invoices or changes-requested items", () => {
  const items = buildActionCenterItems({
    ...EMPTY,
    canViewMoney: false,
    overdueInvoiceCount: 5,
    overdueInvoiceCents: 500_00,
    changesRequestedQuoteCount: 3,
  });
  assert.deepEqual(items, []);
});

test("new requests produce a medium-priority item linking to /requests", () => {
  const items = buildActionCenterItems({ ...EMPTY, newRequestCount: 3 });
  assert.equal(items.length, 1);
  assert.equal(items[0].priority, "medium");
  assert.equal(items[0].href, "/requests");
  assert.match(items[0].description!, /3 people are/);
});

test("a single new request reads as singular", () => {
  const items = buildActionCenterItems({ ...EMPTY, newRequestCount: 1 });
  assert.match(items[0].description!, /1 person is/);
});

test("changes-requested quotes link to the filtered quotes view", () => {
  const items = buildActionCenterItems({ ...EMPTY, changesRequestedQuoteCount: 2 });
  assert.equal(items[0].href, "/quotes?status=CHANGES_REQUESTED&range=all");
  assert.match(items[0].description!, /2 quotes are/);
});

test("disabled-stage jobs use the exact §15 singular/plural copy", () => {
  const one = buildActionCenterItems({ ...EMPTY, disabledStageJobCount: 1 });
  assert.equal(one[0].description, "1 job is currently in a stage disabled for future jobs.");
  assert.equal(one[0].priority, "low");
  assert.equal(one[0].tone, "neutral");
  assert.equal(one[0].href, "/jobs?attention=disabled-workflow-stage");

  const many = buildActionCenterItems({ ...EMPTY, disabledStageJobCount: 4 });
  assert.equal(many[0].description, "4 jobs are currently in a stage disabled for future jobs.");
});

test("items render in priority order: high, then medium, then low, regardless of input order", () => {
  const items = buildActionCenterItems({
    canViewMoney: true,
    overdueInvoiceCount: 1,
    overdueInvoiceCents: 1000,
    newRequestCount: 1,
    changesRequestedQuoteCount: 1,
    disabledStageJobCount: 1,
  });
  assert.deepEqual(
    items.map((i) => i.priority),
    ["high", "medium", "medium", "low"]
  );
  assert.deepEqual(
    items.map((i) => i.id),
    ["overdue-invoices", "new-requests", "changes-requested", "disabled-stage-jobs"]
  );
});

test("no raw enum or internal id ever appears as a title or description", () => {
  const items = buildActionCenterItems({
    canViewMoney: true,
    overdueInvoiceCount: 1,
    overdueInvoiceCents: 1000,
    newRequestCount: 1,
    changesRequestedQuoteCount: 1,
    disabledStageJobCount: 1,
  });
  for (const item of items) {
    assert.ok(!/[A-Z_]{4,}/.test(item.title), `title "${item.title}" looks like a raw enum`);
    if (item.description) {
      assert.ok(
        !/[A-Z_]{4,}/.test(item.description),
        `description "${item.description}" looks like a raw enum`
      );
    }
  }
});
