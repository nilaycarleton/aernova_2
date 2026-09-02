import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyWebglSupport, computeDpr } from "../components/viewer/webgl-capability.ts";

// Phase 7's WebGL-failure path depends on this classification being right —
// a wrong decision here either strands a supported browser on the fallback
// screen or throws a supported-only device at a renderer construction that
// fails. The DOM probe itself (`detectWebglSupport`) isn't tested here per
// Phase 7 Step 91 — faking a WebGL context would test the fake, not the
// browser — but the decision it feeds into is plain logic and is.

test("prefers webgl2 when both are available", () => {
  assert.equal(classifyWebglSupport(true, true), "webgl2");
});

test("falls back to webgl1 when webgl2 is unavailable", () => {
  assert.equal(classifyWebglSupport(false, true), "webgl1");
});

test("reports unsupported when neither context is available", () => {
  assert.equal(classifyWebglSupport(false, false), "unsupported");
});

test("computeDpr clamps a high device pixel ratio to the cap", () => {
  assert.equal(computeDpr(3, 2), 2);
});

test("computeDpr passes a low device pixel ratio through unchanged", () => {
  assert.equal(computeDpr(1, 2), 1);
});

test("computeDpr falls back to 1 for a non-finite or zero value", () => {
  assert.equal(computeDpr(0), 1);
  assert.equal(computeDpr(Number.NaN), 1);
  assert.equal(computeDpr(-1), 1);
});
