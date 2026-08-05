import assert from "node:assert/strict";
import { test } from "node:test";
import { findOverbookedDays, findOverlappingAssignments } from "../lib/schedule/double-booking.ts";

const dave = { firstName: "Dave", lastName: "Chen", email: "dave@example.com" };
const priya = { firstName: "Priya", lastName: "Nair", email: "priya@example.com" };

function visit(opts: {
  jobId: string;
  jobName: string;
  day: string;
  allDay?: boolean;
  startHour?: number;
  endHour?: number;
  users?: { userId: string; user: typeof dave }[];
}) {
  const allDay = opts.allDay ?? opts.startHour === undefined;
  const startAt = allDay
    ? new Date(`${opts.day}T00:00:00.000Z`)
    : new Date(`${opts.day}T${String(opts.startHour).padStart(2, "0")}:00:00.000Z`);
  const endAt = allDay
    ? new Date(`${opts.day}T00:00:00.000Z`)
    : new Date(`${opts.day}T${String(opts.endHour).padStart(2, "0")}:00:00.000Z`);
  return {
    jobId: opts.jobId,
    job: { name: opts.jobName },
    startAt,
    endAt,
    allDay,
    assignments: opts.users ?? [],
  };
}

test("the same person on two different jobs the same all-day square is a conflict", () => {
  const visits = [
    visit({ jobId: "a", jobName: "14 Elm St", day: "2026-08-04", users: [{ userId: "u1", user: dave }] }),
    visit({ jobId: "b", jobName: "22 Oak Ave", day: "2026-08-04", users: [{ userId: "u1", user: dave }] }),
  ];
  const conflicts = findOverlappingAssignments(visits, null);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].userName, "Dave Chen");
  assert.deepEqual(conflicts[0].jobNames.sort(), ["14 Elm St", "22 Oak Ave"]);
});

test("two timed visits back to back on the same day are not a conflict", () => {
  const visits = [
    visit({ jobId: "a", jobName: "Morning roof", day: "2026-08-04", startHour: 8, endHour: 10, users: [{ userId: "u1", user: dave }] }),
    visit({ jobId: "b", jobName: "Afternoon gutter", day: "2026-08-04", startHour: 11, endHour: 13, users: [{ userId: "u1", user: dave }] }),
  ];
  assert.deepEqual(findOverlappingAssignments(visits, null), []);
});

test("two timed visits that actually overlap are a conflict", () => {
  const visits = [
    visit({ jobId: "a", jobName: "Morning roof", day: "2026-08-04", startHour: 8, endHour: 12, users: [{ userId: "u1", user: dave }] }),
    visit({ jobId: "b", jobName: "Afternoon gutter", day: "2026-08-04", startHour: 11, endHour: 13, users: [{ userId: "u1", user: dave }] }),
  ];
  const conflicts = findOverlappingAssignments(visits, null);
  assert.equal(conflicts.length, 1);
});

test("a timed visit next to an all-day visit the same day is still a conflict — the all-day one has no known slot", () => {
  const visits = [
    visit({ jobId: "a", jobName: "Timed job", day: "2026-08-04", startHour: 8, endHour: 10, users: [{ userId: "u1", user: dave }] }),
    visit({ jobId: "b", jobName: "Sometime job", day: "2026-08-04", users: [{ userId: "u1", user: dave }] }),
  ];
  assert.equal(findOverlappingAssignments(visits, null).length, 1);
});

test("two visits on the *same* job the same day are not a double-booking", () => {
  const visits = [
    visit({ jobId: "a", jobName: "14 Elm St", day: "2026-08-04", users: [{ userId: "u1", user: dave }] }),
    visit({ jobId: "a", jobName: "14 Elm St", day: "2026-08-04", users: [{ userId: "u1", user: dave }] }),
  ];
  assert.deepEqual(findOverlappingAssignments(visits, null), []);
});

test("different people on different jobs the same day is not a conflict", () => {
  const visits = [
    visit({ jobId: "a", jobName: "14 Elm St", day: "2026-08-04", users: [{ userId: "u1", user: dave }] }),
    visit({ jobId: "b", jobName: "22 Oak Ave", day: "2026-08-04", users: [{ userId: "u2", user: priya }] }),
  ];
  assert.deepEqual(findOverlappingAssignments(visits, null), []);
});

test("the same job two different days is not a conflict", () => {
  const visits = [
    visit({ jobId: "a", jobName: "14 Elm St", day: "2026-08-04", users: [{ userId: "u1", user: dave }] }),
    visit({ jobId: "b", jobName: "22 Oak Ave", day: "2026-08-05", users: [{ userId: "u1", user: dave }] }),
  ];
  assert.deepEqual(findOverlappingAssignments(visits, null), []);
});

test("a day with more visits than people is overbooked", () => {
  const visits = [
    visit({ jobId: "a", jobName: "A", day: "2026-08-04" }),
    visit({ jobId: "b", jobName: "B", day: "2026-08-04" }),
    visit({ jobId: "c", jobName: "C", day: "2026-08-04" }),
  ];
  const overbooked = findOverbookedDays(visits, 2, null);
  assert.equal(overbooked.length, 1);
  assert.equal(overbooked[0].visitCount, 3);
  assert.equal(overbooked[0].crewCount, 2);
});

test("a day with exactly enough people is not overbooked", () => {
  const visits = [
    visit({ jobId: "a", jobName: "A", day: "2026-08-04" }),
    visit({ jobId: "b", jobName: "B", day: "2026-08-04" }),
  ];
  assert.deepEqual(findOverbookedDays(visits, 2, null), []);
});

test("zero crew never divides by zero into an overbooked-everything result", () => {
  const visits = [visit({ jobId: "a", jobName: "A", day: "2026-08-04" })];
  assert.deepEqual(findOverbookedDays(visits, 0, null), []);
});
