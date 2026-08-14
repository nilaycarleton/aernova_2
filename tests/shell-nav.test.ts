import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activeNavItemId,
  isNavItemActive,
  mobileOverflowGroups,
  mobilePrimaryItems,
  NAV_ITEMS,
  routeTitle,
  visibleNavItems,
} from "../lib/shell-nav.ts";

test("visibility: OWNER sees every nav item", () => {
  const ids = visibleNavItems("OWNER").map((i) => i.id);
  assert.deepEqual(ids, NAV_ITEMS.map((i) => i.id));
});

test("visibility: CREW sees only capability-free destinations", () => {
  const ids = visibleNavItems("CREW").map((i) => i.id);
  assert.deepEqual(ids, ["today", "schedule"]);
});

test("visibility: SALES sees money/job surfaces but not Team or Settings", () => {
  const ids = visibleNavItems("SALES").map((i) => i.id);
  assert.ok(ids.includes("dashboard"));
  assert.ok(ids.includes("invoices"));
  assert.ok(!ids.includes("team"));
  assert.ok(!ids.includes("settings"));
});

test("visibility: VIEWER sees read surfaces but cannot manage team/company", () => {
  const ids = visibleNavItems("VIEWER").map((i) => i.id);
  assert.ok(ids.includes("dashboard"));
  assert.ok(ids.includes("reports"));
  assert.ok(!ids.includes("team"));
  assert.ok(!ids.includes("settings"));
});

test("active matching: nested job routes highlight Jobs, not Pipeline or Quotes", () => {
  const jobs = NAV_ITEMS.find((i) => i.id === "jobs")!;
  assert.equal(isNavItemActive("/jobs", jobs), true);
  assert.equal(isNavItemActive("/jobs/cmr123abc", jobs), true);
  assert.equal(isNavItemActive("/jobs/cmr123abc/quotes/cmr456def", jobs), true);
  assert.equal(isNavItemActive("/jobs/cmr123abc/invoices/cmr789ghi", jobs), true);

  const pipeline = NAV_ITEMS.find((i) => i.id === "pipeline")!;
  assert.equal(isNavItemActive("/jobs/cmr123abc", pipeline), false);
});

test("active matching: /jobs/new does not highlight Jobs (it's a creation destination, not a nav item)", () => {
  const jobs = NAV_ITEMS.find((i) => i.id === "jobs")!;
  assert.equal(isNavItemActive("/jobs/new", jobs), false);
  assert.equal(isNavItemActive("/jobs/quick", jobs), false);
  assert.equal(isNavItemActive("/jobs/capture", jobs), false);
});

test("active matching: exact-match items don't bleed into prefix routes", () => {
  const dashboard = NAV_ITEMS.find((i) => i.id === "dashboard")!;
  assert.equal(isNavItemActive("/dashboard", dashboard), true);
  assert.equal(isNavItemActive("/dashboard-export", dashboard), false, "no accidental substring match");

  const pipeline = NAV_ITEMS.find((i) => i.id === "pipeline")!;
  assert.equal(isNavItemActive("/pipeline", pipeline), true);
});

test("active matching: nested settings highlights Settings, exactly one destination lit", () => {
  assert.equal(activeNavItemId("/settings/workflow", "OWNER"), "settings");
  assert.equal(activeNavItemId("/settings", "OWNER"), "settings");
});

test("active matching: requests and pipeline never both light for the same path", () => {
  const requests = NAV_ITEMS.find((i) => i.id === "requests")!;
  const pipeline = NAV_ITEMS.find((i) => i.id === "pipeline")!;
  assert.equal(isNavItemActive("/pipeline", requests), false);
  assert.equal(isNavItemActive("/requests/new", pipeline), false);
  assert.equal(isNavItemActive("/requests/new", requests), true);
});

test("active matching: exactly one root destination lights for every top-level route", () => {
  const routes = [
    "/dashboard",
    "/jobs",
    "/requests",
    "/pipeline",
    "/clients",
    "/schedule",
    "/today",
    "/invoices",
    "/reports",
    "/quotes",
    "/team",
    "/settings",
  ];
  for (const route of routes) {
    const matches = NAV_ITEMS.filter((item) => isNavItemActive(route, item));
    assert.equal(matches.length, 1, `expected exactly one match for ${route}, got ${matches.map((m) => m.id)}`);
  }
});

test("mobile priority: deterministic primary items per role, capped at 4", () => {
  const owner = mobilePrimaryItems("OWNER").map((i) => i.id);
  assert.deepEqual(owner, ["today", "dashboard", "jobs", "schedule"]);

  const sales = mobilePrimaryItems("SALES").map((i) => i.id);
  assert.deepEqual(sales, ["today", "requests", "pipeline", "jobs"]);

  const crew = mobilePrimaryItems("CREW").map((i) => i.id);
  assert.deepEqual(crew, ["today", "schedule"], "crew has only two authorized destinations today, not four");
});

test("mobile overflow: contains every authorized item not already primary, nothing duplicated", () => {
  for (const role of ["OWNER", "ADMIN", "ESTIMATOR", "SALES", "VIEWER", "CREW"] as const) {
    const primary = new Set(mobilePrimaryItems(role).map((i) => i.id));
    const overflow = mobileOverflowGroups(role).flatMap((g) => g.items.map((i) => i.id));
    const visible = new Set(visibleNavItems(role).map((i) => i.id));

    for (const id of overflow) {
      assert.ok(!primary.has(id), `${id} appears in both primary and overflow for ${role}`);
      assert.ok(visible.has(id), `${id} in overflow for ${role} but not authorized`);
    }
    const combined = new Set([...primary, ...overflow]);
    assert.equal(combined.size, visible.size, `every authorized item for ${role} should be reachable exactly once`);
  }
});

test("route titles: common roots", () => {
  assert.equal(routeTitle("/dashboard"), "Dashboard");
  assert.equal(routeTitle("/jobs"), "Jobs");
  assert.equal(routeTitle("/settings"), "Settings");
});

test("route titles: nested routes resolve to the specific entity, not the root", () => {
  assert.equal(routeTitle("/jobs/cmr123abc"), "Job");
  assert.equal(routeTitle("/jobs/cmr123abc/quotes/cmr456def"), "Quote");
  assert.equal(routeTitle("/jobs/cmr123abc/invoices/cmr789ghi"), "Invoice");
  assert.equal(routeTitle("/jobs/cmr123abc/change-orders/cmr000xyz"), "Change order");
  assert.equal(routeTitle("/settings/workflow"), "Workflow");
  assert.equal(routeTitle("/reports/revenue"), "Revenue");
  assert.equal(routeTitle("/reports/aged-receivables"), "Aged receivables");
});

test("route titles: creation destinations reachable only via +Create still resolve sensibly", () => {
  assert.equal(routeTitle("/jobs/new"), "New job");
  assert.equal(routeTitle("/requests/new"), "New request");
});

test("route titles: unknown route falls back to the product name, not a blank title", () => {
  assert.equal(routeTitle("/some-future-route"), "Aernova");
});
