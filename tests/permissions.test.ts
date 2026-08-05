import assert from "node:assert/strict";
import { test } from "node:test";
import { CompanyRole } from "@prisma/client";
import {
  CAPABILITIES,
  assertCan,
  can,
  capabilitiesOf,
  jobScopeForRole,
  type Capability,
} from "../lib/permissions.ts";

/**
 * The negative cases come first and outnumber the positive ones, deliberately.
 * "Can the owner edit a quote" is the test everybody writes; "can the guy hired
 * last week read the margin" is the one that matters, and it is the one nobody
 * writes by default.
 */

test("crew cannot see money — not in any form, under any name", () => {
  assert.equal(can(CompanyRole.CREW, "viewMoney"), false);
});

test("crew cannot see jobs they are not on", () => {
  assert.equal(can(CompanyRole.CREW, "viewAllJobs"), false);
});

test("crew cannot touch a quote", () => {
  assert.equal(can(CompanyRole.CREW, "editQuote"), false);
  assert.equal(can(CompanyRole.CREW, "sendQuote"), false);
});

test("crew cannot edit or delete a job", () => {
  assert.equal(can(CompanyRole.CREW, "editJob"), false);
  assert.equal(can(CompanyRole.CREW, "deleteJob"), false);
});

test("crew cannot move the calendar or invite anyone", () => {
  assert.equal(can(CompanyRole.CREW, "manageSchedule"), false);
  assert.equal(can(CompanyRole.CREW, "manageTeam"), false);
});

test("crew can do exactly one thing, and that is the whole list", () => {
  // Written as an equality rather than a series of assertions so that adding a
  // capability to CREW fails this test loudly instead of slipping through.
  assert.deepEqual([...capabilitiesOf(CompanyRole.CREW)], ["completeVisit"]);
});

test("only owners and admins can delete a job or manage the team", () => {
  for (const role of [CompanyRole.ESTIMATOR, CompanyRole.SALES, CompanyRole.VIEWER, CompanyRole.CREW]) {
    assert.equal(can(role, "deleteJob"), false, `${role} must not delete jobs`);
    assert.equal(can(role, "manageTeam"), false, `${role} must not manage the team`);
  }
  for (const role of [CompanyRole.OWNER, CompanyRole.ADMIN]) {
    assert.equal(can(role, "deleteJob"), true);
    assert.equal(can(role, "manageTeam"), true);
  }
});

test("deleting a quote, invoice, client or request is the same owner/admin tier as deleting a job", () => {
  const deletes = ["deleteQuote", "deleteInvoice", "deleteClient", "deleteRequest"] as const;
  for (const role of [CompanyRole.ESTIMATOR, CompanyRole.SALES, CompanyRole.VIEWER, CompanyRole.CREW]) {
    for (const capability of deletes) {
      assert.equal(can(role, capability), false, `${role} must not ${capability}`);
    }
  }
  for (const role of [CompanyRole.OWNER, CompanyRole.ADMIN]) {
    for (const capability of deletes) {
      assert.equal(can(role, capability), true, `${role} must ${capability}`);
    }
  }
});

test("a viewer reads and changes nothing", () => {
  assert.equal(can(CompanyRole.VIEWER, "viewMoney"), true);
  for (const capability of ["editJob", "editQuote", "sendQuote", "deleteJob", "manageSchedule", "manageTeam"] as Capability[]) {
    assert.equal(can(CompanyRole.VIEWER, capability), false, `viewer must not ${capability}`);
  }
});

test("an unknown capability is denied, not granted", () => {
  // Deny by default: the failure mode of a typo or a capability somebody
  // forgot to grant must be a locked door.
  assert.equal(can(CompanyRole.OWNER, "burnItAllDown" as Capability), false);
});

test("every capability is decided for every role — none left to chance", () => {
  for (const role of Object.values(CompanyRole)) {
    for (const capability of CAPABILITIES) {
      assert.equal(typeof can(role, capability), "boolean", `${role}/${capability}`);
    }
  }
});

test("assertCan throws for a denied capability, and says nothing useful to a prober", () => {
  assert.throws(
    () => assertCan(CompanyRole.CREW, "viewMoney"),
    (error: Error) => {
      assert.ok(!error.message.includes("viewMoney"), "the message must not name the door");
      return true;
    }
  );
});

test("assertCan is silent when the role has it", () => {
  assert.doesNotThrow(() => assertCan(CompanyRole.OWNER, "deleteJob"));
  assert.doesNotThrow(() => assertCan(CompanyRole.CREW, "completeVisit"));
});

test("crew's job scope is narrowed to jobs they are assigned a visit on", () => {
  const scope = jobScopeForRole(CompanyRole.CREW, "user_dave");
  assert.deepEqual(scope, {
    visits: { some: { assignments: { some: { userId: "user_dave" } } } },
  });
});

test("a scope that narrows nothing is only given to roles that see everything", () => {
  for (const role of Object.values(CompanyRole)) {
    const scope = jobScopeForRole(role, "user_dave");
    const narrows = Object.keys(scope).length > 0;
    assert.equal(
      narrows,
      !can(role, "viewAllJobs"),
      `${role}: scope and viewAllJobs must agree, or one of them is a lie`
    );
  }
});

test("owners are not narrowed", () => {
  assert.deepEqual(jobScopeForRole(CompanyRole.OWNER, "user_boss"), {});
});

test("an estimator prices work and runs the calendar, but cannot delete", () => {
  assert.equal(can(CompanyRole.ESTIMATOR, "viewMoney"), true);
  assert.equal(can(CompanyRole.ESTIMATOR, "editQuote"), true);
  assert.equal(can(CompanyRole.ESTIMATOR, "manageSchedule"), true);
  assert.equal(can(CompanyRole.ESTIMATOR, "deleteJob"), false);
});

test("sales sees money, because you cannot discount what you cannot see", () => {
  assert.equal(can(CompanyRole.SALES, "viewMoney"), true);
  assert.equal(can(CompanyRole.SALES, "sendQuote"), true);
  assert.equal(can(CompanyRole.SALES, "manageSchedule"), false);
});

test("invoicing is the office's, not the estimator's or the salesperson's", () => {
  // Deliberately narrow — see the comment on ESTIMATOR in lib/permissions.ts.
  // Widening this later is one line; narrowing it after somebody has been
  // raising invoices for a year is a conversation.
  for (const capability of ["editInvoice", "sendInvoice", "recordPayment"] as const) {
    for (const role of [CompanyRole.OWNER, CompanyRole.ADMIN]) {
      assert.equal(can(role, capability), true, `${role} must be able to ${capability}`);
    }
    for (const role of [
      CompanyRole.ESTIMATOR,
      CompanyRole.SALES,
      CompanyRole.VIEWER,
      CompanyRole.CREW,
    ]) {
      assert.equal(can(role, capability), false, `${role} must not ${capability}`);
    }
  }
});

test("editing the company profile is office-tier, unlike connecting Stripe", () => {
  for (const role of [CompanyRole.OWNER, CompanyRole.ADMIN]) {
    assert.equal(can(role, "manageCompany"), true, `${role} must manageCompany`);
  }
  for (const role of [
    CompanyRole.ESTIMATOR,
    CompanyRole.SALES,
    CompanyRole.VIEWER,
    CompanyRole.CREW,
  ]) {
    assert.equal(can(role, "manageCompany"), false, `${role} must not manageCompany`);
  }
});

test("connecting Stripe is the owner's alone — the one capability admin doesn't inherit", () => {
  assert.equal(can(CompanyRole.OWNER, "manageBilling"), true);
  for (const role of [
    CompanyRole.ADMIN,
    CompanyRole.ESTIMATOR,
    CompanyRole.SALES,
    CompanyRole.VIEWER,
    CompanyRole.CREW,
  ]) {
    assert.equal(can(role, "manageBilling"), false, `${role} must not manageBilling`);
  }
});

test("a viewer can read an invoice but never record money against one", () => {
  // `viewMoney` is what /invoices and the invoice page guard on, so the office
  // can still answer "what are we owed" without being able to change it.
  assert.equal(can(CompanyRole.VIEWER, "viewMoney"), true);
  assert.equal(can(CompanyRole.VIEWER, "recordPayment"), false);
});

test("logging what a job actually cost is the estimator's business too, unlike invoicing", () => {
  for (const role of [CompanyRole.OWNER, CompanyRole.ADMIN, CompanyRole.ESTIMATOR]) {
    assert.equal(can(role, "manageJobCosts"), true, `${role} must manageJobCosts`);
  }
  for (const role of [CompanyRole.SALES, CompanyRole.VIEWER, CompanyRole.CREW]) {
    assert.equal(can(role, "manageJobCosts"), false, `${role} must not manageJobCosts`);
  }
});
