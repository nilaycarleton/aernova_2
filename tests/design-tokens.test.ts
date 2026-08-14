import assert from "node:assert/strict";
import { test } from "node:test";
import { contrastRatio, type Oklch } from "../lib/color-contrast.ts";

/**
 * Verifies the Precision Workshop palette (app/globals.css) meets WCAG 2.2 AA
 * for every documented token pairing, and that the action/measurement
 * distinction Phase 1 exists to enforce (docs/DESIGN.md §2) holds as an
 * invariant, not just a comment. Values below are copied from
 * app/globals.css's `@theme` block and its `--l-*`/`.surface-*` overrides —
 * if this test starts failing after a palette edit, update these constants
 * to match globals.css, then re-check the ratios; don't loosen the
 * thresholds to make it pass.
 */

const AA_NORMAL = 4.5;
const AA_LARGE = 3.0;

const dark = {
  ground: { l: 14, c: 0.014, h: 264 },
  inkPrimary: { l: 97, c: 0.004, h: 75 },
  inkStrong: { l: 91, c: 0.006, h: 70 },
  inkSecondary: { l: 86, c: 0.01, h: 260 },
  inkMuted: { l: 69, c: 0.014, h: 258 },
  onAccent: { l: 14, c: 0.014, h: 264 },
  instrument: { l: 78.9, c: 0.154, h: 211.53 },
  instrumentFg: { l: 89, c: 0.09, h: 205 },
  confirm: { l: 69.6, c: 0.17, h: 162.48 },
  confirmFg: { l: 90, c: 0.11, h: 165 },
  caution: { l: 80, c: 0.15, h: 78 },
  cautionFg: { l: 90, c: 0.08, h: 88 },
  danger: { l: 63.7, c: 0.234, h: 25.3 },
  dangerFg: { l: 87, c: 0.06, h: 15 },
  info: { l: 68.5, c: 0.169, h: 237 },
  infoFg: { l: 88, c: 0.07, h: 232 },
} satisfies Record<string, Oklch>;

const light = {
  ground: { l: 97.5, c: 0.004, h: 260 },
  surfaceRaised: { l: 100, c: 0, h: 0 },
  inkPrimary: { l: 20, c: 0.012, h: 264 },
  inkStrong: { l: 27, c: 0.013, h: 260 },
  inkSecondary: { l: 36, c: 0.014, h: 258 },
  inkMuted: { l: 45, c: 0.014, h: 258 },
  instrumentFg: { l: 44, c: 0.125, h: 224 },
  confirmFg: { l: 45, c: 0.12, h: 162 },
  cautionFg: { l: 47, c: 0.11, h: 70 },
  dangerFg: { l: 50, c: 0.19, h: 25 },
  infoFg: { l: 47, c: 0.13, h: 235 },
} satisfies Record<string, Oklch>;

const paper = {
  document: { l: 100, c: 0, h: 0 },
  ink: { l: 20.8, c: 0.042, h: 265.755 },
  inkBody: { l: 37.2, c: 0.044, h: 257.287 },
  inkMuted: { l: 44.6, c: 0.043, h: 257.281 },
  inkFaint: { l: 55.4, c: 0.046, h: 257.417 },
} satisfies Record<string, Oklch>;

test("dark theme: text roles meet AA on ground", () => {
  assert.ok(contrastRatio(dark.inkPrimary, dark.ground) >= AA_NORMAL);
  assert.ok(contrastRatio(dark.inkSecondary, dark.ground) >= AA_NORMAL);
  assert.ok(contrastRatio(dark.inkStrong, dark.ground) >= AA_NORMAL);
  assert.ok(
    contrastRatio(dark.inkMuted, dark.ground) >= AA_NORMAL,
    "ink-muted is the documented contrast floor — it must not drop below AA"
  );
});

test("dark theme: action/accent fills carry AA text", () => {
  assert.ok(contrastRatio(dark.onAccent, dark.inkPrimary) >= AA_NORMAL, "on-action on action fill");
  assert.ok(contrastRatio(dark.onAccent, dark.instrument) >= AA_NORMAL, "on-accent on instrument fill");
  assert.ok(contrastRatio(dark.onAccent, dark.confirm) >= AA_LARGE, "on-accent on confirm fill (large-text role)");
  assert.ok(contrastRatio(dark.onAccent, dark.caution) >= AA_NORMAL, "on-accent on caution fill");
  assert.ok(contrastRatio(dark.onAccent, dark.danger) >= AA_NORMAL, "on-accent on danger fill");
});

test("dark theme: status -fg and instrument-fg meet AA on ground", () => {
  assert.ok(contrastRatio(dark.instrumentFg, dark.ground) >= AA_NORMAL);
  assert.ok(contrastRatio(dark.confirmFg, dark.ground) >= AA_NORMAL);
  assert.ok(contrastRatio(dark.cautionFg, dark.ground) >= AA_NORMAL);
  assert.ok(contrastRatio(dark.dangerFg, dark.ground) >= AA_NORMAL);
  assert.ok(contrastRatio(dark.infoFg, dark.ground) >= AA_NORMAL);
});

test("light theme: text roles meet AA on ground and on surface-raised", () => {
  assert.ok(contrastRatio(light.inkPrimary, light.ground) >= AA_NORMAL);
  assert.ok(contrastRatio(light.inkSecondary, light.ground) >= AA_NORMAL);
  assert.ok(contrastRatio(light.inkStrong, light.ground) >= AA_NORMAL);
  assert.ok(contrastRatio(light.inkMuted, light.ground) >= AA_NORMAL, "ink-muted is the documented contrast floor");
  assert.ok(contrastRatio(light.inkPrimary, light.surfaceRaised) >= AA_NORMAL);
});

test("light theme: action fill and status -fg meet AA", () => {
  assert.ok(contrastRatio(light.ground, light.inkPrimary) >= AA_NORMAL, "on-action(ground) on action(ink-primary) fill");
  assert.ok(contrastRatio(light.instrumentFg, light.ground) >= AA_NORMAL);
  assert.ok(contrastRatio(light.confirmFg, light.ground) >= AA_NORMAL);
  assert.ok(contrastRatio(light.cautionFg, light.ground) >= AA_NORMAL);
  assert.ok(contrastRatio(light.dangerFg, light.ground) >= AA_NORMAL);
  assert.ok(contrastRatio(light.infoFg, light.ground) >= AA_NORMAL);
});

test("paper/document tokens meet AA on the printed page", () => {
  assert.ok(contrastRatio(paper.ink, paper.document) >= AA_NORMAL);
  assert.ok(contrastRatio(paper.inkBody, paper.document) >= AA_NORMAL);
  assert.ok(contrastRatio(paper.inkMuted, paper.document) >= AA_NORMAL);
  assert.ok(contrastRatio(paper.inkFaint, paper.document) >= AA_NORMAL, "paper-ink-faint is the printed-page floor");
});

test("action and measurement are never the same literal color (the Phase 1 invariant)", () => {
  // The whole point of Phase 1's action/measurement split: an application
  // action must never resolve to the same value as a measurement reading.
  // Ink-primary (the action fill) and Instrument Cyan must differ in both
  // hue and chroma, not just be two different-looking OKLCH strings that
  // happen to share a channel.
  assert.notEqual(dark.inkPrimary.h, dark.instrument.h);
  assert.notEqual(dark.inkPrimary.c, dark.instrument.c);
  assert.ok(
    dark.instrument.c > 0.1,
    "instrument must remain a real saturated cyan, not drift toward neutral"
  );
  assert.ok(dark.inkPrimary.c < 0.02, "action (ink-primary) must remain a near-neutral warm white, not drift toward a hue");
});
