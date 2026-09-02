import assert from "node:assert/strict";
import { test } from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * A guard against the gap that an audit on 2026-07-30 found across the whole
 * codebase, so that finding it once is enough.
 *
 * The bug was not a missing check. Every action called `requireJobAccess`, and
 * every one of them scoped correctly to the company. What none of them did was
 * say *what they were about to do* — so `requireJobAccess` answered "may this
 * person reach this job", the only question it was asked, and a crew member
 * assigned to a roof could edit its quote, publish it to the homeowner, or
 * delete the photos.
 *
 * **Scope is not permission.** This test reads the source and fails if any
 * call site asks the narrow question again.
 */
const ROOT = path.join(import.meta.dirname, "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

const sources = walk(path.join(ROOT, "app")).map((file) => ({
  file: path.relative(ROOT, file),
  text: readFileSync(file, "utf8"),
}));

test("the audit found something — there are call sites to protect", () => {
  const total = sources.filter((s) => s.text.includes("requireJobAccess(")).length;
  assert.ok(total > 5, `expected several guarded files, found ${total}`);
});

test("every requireJobAccess call names the capability it needs", () => {
  const offenders: string[] = [];
  for (const { file, text } of sources) {
    text.split("\n").forEach((line, index) => {
      // A call with no second argument: `requireJobAccess(jobId)`.
      if (/requireJobAccess\(\s*[A-Za-z_$][\w.$]*\s*\)/.test(line)) {
        offenders.push(`${file}:${index + 1}`);
      }
    });
  }
  assert.deepEqual(
    offenders,
    [],
    "these ask only 'may they reach this job', not 'may they do this to it':\n" +
      offenders.join("\n")
  );
});

test("every API route handler has some auth check, not zero", () => {
  // The gap this audit actually found (2026-08-05): three route.ts files
  // under app/api/jobs/[jobId]/processing/ called Prisma directly with no
  // guard of any kind — not a wrong capability, no guard at all. The tests
  // above can't see that class of bug; they only check that a
  // `requireJobAccess(` call, once present, is used correctly. This one
  // checks presence itself, across every API route rather than one call
  // site at a time.
  const GUARD_MARKERS = [
    "requireJobAccess(",
    "requireCapability(",
    "requireCompanyContext(",
    // Cron routes authenticate with a shared secret header instead —
    // there's no per-request user to run a capability check against.
    "CRON_SECRET",
    // The Stripe webhook authenticates by verifying Stripe's own signature.
    "webhooks.constructEvent",
    // Public share-link routes (the ICS calendar feed, same idiom as
    // /q/[token] and /i/[token]): the token in the URL is the whole
    // credential, checked here instead of a company/job guard.
    "isWellFormedShareToken(",
  ];
  const offenders: string[] = [];
  for (const { file, text } of sources) {
    if (!file.endsWith("route.ts")) continue;
    if (!GUARD_MARKERS.some((marker) => text.includes(marker))) {
      offenders.push(file);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "these API routes have no auth check of any kind:\n" + offenders.join("\n")
  );
});

test("no server action falls back to a bare company check", () => {
  // `requireCompanyContext` answers "which company" and nothing about role, so
  // a mutating action that relies on it alone is open to every member — which
  // is exactly how a viewer could delete a job until this audit.
  const offenders: string[] = [];
  for (const { file, text } of sources) {
    if (!text.includes('"use server"')) continue;
    if (/await\s+requireCompanyContext\(/.test(text)) offenders.push(file);
  }
  assert.deepEqual(offenders, [], `server actions using a bare company check:\n${offenders.join("\n")}`);
});
