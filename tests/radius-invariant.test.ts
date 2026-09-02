import assert from "node:assert/strict";
import { test } from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Precision Workshop's radius contract (docs/DESIGN.md §"Cards / Containers",
 * §"Buttons"): compact 4px, standard 6px, large-framed-tool 8px maximum.
 * `rounded-xl`/`rounded-2xl`/`rounded-3xl` (12/16/24px) are the pre-redesign
 * scale — the Premium UI Redesign final completion pass migrated the whole
 * app off them (537 occurrences at the time). This guards against silent
 * regrowth in Aernova-controlled source, the same class of drift the final
 * audit itself found and closed.
 *
 * Scans app/, components/, lib/ only — never node_modules, generated Astryx
 * CSS/JS, graphify-out, or docs.
 */
const ROOT = path.join(import.meta.dirname, "..");
const SCAN_DIRS = ["app", "components", "lib"];
const LARGE_RADIUS = /rounded-(xl|2xl|3xl)\b/;

/**
 * Every entry here is a real, individually-reviewed exception, not a
 * loophole — see the reason next to each. Path is relative to repo root.
 * Line is 1-indexed. If a new legitimate exception is ever needed, add it
 * here with a reason; do not loosen the regex above instead.
 */
const ALLOWLIST: { file: string; line: number; reason: string }[] = [
  {
    file: "components/dashboard/roof-assistant.tsx",
    line: 145,
    reason:
      "Deliberate asymmetric chat-bubble shape (rounded-2xl rounded-br-sm) for the AI assistant's own message — a recognized chat-bubble convention, not a generic panel/control.",
  },
  {
    file: "components/dashboard/roof-assistant.tsx",
    line: 146,
    reason:
      "Same chat-bubble pattern for the user's own message (rounded-2xl rounded-bl-sm), paired with the entry above.",
  },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

test("no unexplained rounded-xl/2xl/3xl remains in Aernova-controlled source", () => {
  const offenders: string[] = [];

  for (const dir of SCAN_DIRS) {
    const files = walk(path.join(ROOT, dir));
    for (const file of files) {
      const rel = path.relative(ROOT, file);
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, index) => {
        if (!LARGE_RADIUS.test(line)) return;
        const lineNumber = index + 1;
        const allowed = ALLOWLIST.some((a) => a.file === rel && a.line === lineNumber);
        if (!allowed) offenders.push(`${rel}:${lineNumber}: ${line.trim()}`);
      });
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "unexplained rounded-xl/2xl/3xl usage (add a reviewed ALLOWLIST entry in this file if it's a real exception):\n" +
      offenders.join("\n")
  );
});

test("every allowlist entry still points at real, matching large-radius source", () => {
  // Catches the opposite drift: an allowlisted exception that was refactored
  // away (wrong line, wrong file) silently becoming dead configuration.
  const stale: string[] = [];
  for (const entry of ALLOWLIST) {
    const full = path.join(ROOT, entry.file);
    let content: string;
    try {
      content = readFileSync(full, "utf8");
    } catch {
      stale.push(`${entry.file}: file no longer exists`);
      continue;
    }
    const lines = content.split("\n");
    const line = lines[entry.line - 1];
    if (!line || !LARGE_RADIUS.test(line)) {
      stale.push(`${entry.file}:${entry.line}: no longer contains a large-radius class`);
    }
  }
  assert.deepEqual(stale, [], "stale ALLOWLIST entries:\n" + stale.join("\n"));
});
