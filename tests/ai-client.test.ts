import assert from "node:assert/strict";
import { test } from "node:test";
import { isAiConfigured } from "../lib/ai/client.ts";

// This is the one gate every AI call site (the two API routes, the three
// server actions, every page that conditionally renders an AI control)
// checks before doing anything else — including before touching Prisma or
// the network, which is why `draftJobFromPhoto`/`draftScopeOfWork`/
// `draftFollowUpMessage` themselves aren't unit-tested here: they import
// `@/lib/prisma`, which plain `node --test` (no path-alias resolution, no
// database) can't load. This is the correct, testable boundary instead.

test("AI is reported unconfigured when GEMINI_API_KEY is unset", () => {
  const original = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    assert.equal(isAiConfigured(), false);
  } finally {
    if (original === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = original;
  }
});

test("AI is reported configured once GEMINI_API_KEY is set", () => {
  const original = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key-for-config-check-only";
  try {
    assert.equal(isAiConfigured(), true);
  } finally {
    if (original === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = original;
  }
});

test("a blank string is not a configured key", () => {
  const original = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "";
  try {
    assert.equal(isAiConfigured(), false);
  } finally {
    if (original === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = original;
  }
});
