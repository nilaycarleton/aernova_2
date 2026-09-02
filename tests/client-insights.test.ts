import assert from "node:assert/strict";
import { test } from "node:test";
import { clientTiles, percentChange } from "../lib/client-insights.ts";
import { CLIENT_FILTERS, matchesClientFilter } from "../lib/client-status.ts";
import { nextClientStatus, isWonJobStatus } from "../lib/client-lifecycle.ts";

const NOW = new Date("2026-07-27T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

test("percentChange refuses to invent a number from a zero baseline", () => {
  assert.equal(percentChange(4, 0), null);
  assert.equal(percentChange(0, 0), null);
  assert.equal(percentChange(6, 4), 50);
  assert.equal(percentChange(2, 4), -50);
});

test("new leads count arrivals in the last 30 days, against the 30 before", () => {
  const clients = [
    { createdAt: daysAgo(2), convertedAt: null },
    { createdAt: daysAgo(20), convertedAt: null },
    { createdAt: daysAgo(40), convertedAt: null },
    { createdAt: daysAgo(200), convertedAt: null },
  ];

  const [leads] = clientTiles(clients, NOW);
  assert.equal(leads.value, 2);
  assert.equal(leads.delta, 100); // 2 this period against 1 in the previous
});

test("new clients count conversions, not arrivals", () => {
  // Came in last year, became a customer last week. They are a new *client*
  // this month and not a new lead — counting by createdAt would miss them.
  const clients = [{ createdAt: daysAgo(300), convertedAt: daysAgo(7) }];

  const [leads, won] = clientTiles(clients, NOW);
  assert.equal(leads.value, 0);
  assert.equal(won.value, 1);
  assert.equal(won.delta, null, "nothing in the prior period to compare against");
});

test("the year-to-date tile never claims a delta", () => {
  const tiles = clientTiles([{ createdAt: daysAgo(5), convertedAt: daysAgo(5) }], NOW);
  const ytd = tiles[2];
  assert.equal(ytd.value, 1);
  assert.equal(ytd.delta, null);
  assert.equal(ytd.comparison, null);
});

test("year-to-date excludes a conversion from last year", () => {
  const lastYear = new Date("2025-12-30T12:00:00Z");
  const tiles = clientTiles([{ createdAt: lastYear, convertedAt: lastYear }], NOW);
  assert.equal(tiles[2].value, 0);
});

test("the default filter is leads and active, and it hides archived", () => {
  assert.equal(CLIENT_FILTERS[0].value, "LEADS_AND_ACTIVE");
  assert.equal(matchesClientFilter("LEAD", "LEADS_AND_ACTIVE"), true);
  assert.equal(matchesClientFilter("ACTIVE", "LEADS_AND_ACTIVE"), true);
  assert.equal(matchesClientFilter("ARCHIVED", "LEADS_AND_ACTIVE"), false);
  assert.equal(matchesClientFilter("ARCHIVED", "ARCHIVED"), true);
});

test("a lead becomes a client when work is won, and a sent quote is not won", () => {
  assert.equal(isWonJobStatus("QUOTED"), false);
  assert.equal(isWonJobStatus("SCHEDULED"), true);
  assert.equal(nextClientStatus("LEAD", "QUOTED"), "LEAD");
  assert.equal(nextClientStatus("LEAD", "SCHEDULED"), "ACTIVE");
  assert.equal(nextClientStatus("LEAD", "COMPLETED"), "ACTIVE");
});

test("promotion never runs backwards", () => {
  // A client's one scheduled job slipping back to a lead does not un-make the
  // fact that they were a customer.
  assert.equal(nextClientStatus("ACTIVE", "LEAD"), "ACTIVE");
  assert.equal(nextClientStatus("ARCHIVED", "SCHEDULED"), "ARCHIVED");
});
