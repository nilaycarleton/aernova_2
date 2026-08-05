import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hubMeasurements,
  hubModelGlbUrl,
  shareableInvoices,
  shareableQuotes,
} from "../lib/client-hub.ts";

test("a quote only shows once it has a share token", () => {
  const quotes = [
    { id: "draft", shareToken: null },
    { id: "sent", shareToken: "ABCDE-FGHJK-MNPQR-STVWX" },
  ];
  assert.deepEqual(
    shareableQuotes(quotes).map((q) => q.id),
    ["sent"]
  );
});

test("an invoice only shows once it has a share token", () => {
  const invoices = [
    { id: "draft", shareToken: null },
    { id: "sent", shareToken: "ABCDE-FGHJK-MNPQR-STVWX" },
  ];
  assert.deepEqual(
    shareableInvoices(invoices).map((i) => i.id),
    ["sent"]
  );
});

test("hubMeasurements picks a fixed set in a fixed order, ignoring DISTANCE and WASTE_FACTOR", () => {
  const measurements = [
    { type: "WASTE_FACTOR" as const, value: 10 },
    { type: "RAKE" as const, value: 3 },
    { type: "AREA" as const, value: 2000 },
    { type: "DISTANCE" as const, value: 5 },
    { type: "PITCH" as const, value: 6 },
  ];
  assert.deepEqual(
    hubMeasurements(measurements).map((m) => m.type),
    ["AREA", "PITCH", "RAKE"]
  );
});

test("hubMeasurements keeps only the first entry per type", () => {
  const measurements = [
    { type: "AREA" as const, value: 1800 },
    { type: "AREA" as const, value: 2200 },
  ];
  const result = hubMeasurements(measurements);
  assert.equal(result.length, 1);
  assert.equal(result[0].value, 1800);
});

test("hubModelGlbUrl is null when there's no MODEL imagery at all", () => {
  assert.equal(hubModelGlbUrl([]), null);
  assert.equal(hubModelGlbUrl([{ type: "DRONE", extractedJson: null }]), null);
});

test("hubModelGlbUrl is null when the model package can't be parsed", () => {
  assert.equal(hubModelGlbUrl([{ type: "MODEL", extractedJson: null }]), null);
  assert.equal(hubModelGlbUrl([{ type: "MODEL", extractedJson: "not an object" }]), null);
});

const modelPackage = (assets: Record<string, string>) => ({
  kind: "aernova-photogrammetry-model" as const,
  assets,
});

test("hubModelGlbUrl prefers viewerGlb, falls back to texturedModelGlb", () => {
  assert.equal(
    hubModelGlbUrl([
      { type: "MODEL", extractedJson: modelPackage({ viewerGlb: "/uploads/a/viewer.glb" }) },
    ]),
    "/uploads/a/viewer.glb"
  );
  assert.equal(
    hubModelGlbUrl([
      { type: "MODEL", extractedJson: modelPackage({ texturedModelGlb: "/uploads/a/model.glb" }) },
    ]),
    "/uploads/a/model.glb"
  );
});

test("hubModelGlbUrl refuses a non-relative asset path", () => {
  assert.equal(
    hubModelGlbUrl([
      { type: "MODEL", extractedJson: modelPackage({ viewerGlb: "https://evil.example/x.glb" }) },
    ]),
    null
  );
});

test("hubModelGlbUrl refuses the authenticated download-proxy shape", () => {
  // /api/jobs/*/processing/*/download sits behind Clerk's session check like
  // every other /api/jobs/* route — fine for the signed-in authoring viewer,
  // unreachable for an anonymous homeowner on this public page.
  assert.equal(
    hubModelGlbUrl([
      {
        type: "MODEL",
        extractedJson: modelPackage({
          viewerGlb: "/api/jobs/abc123/processing/def456/download?asset=viewerGlb",
        }),
      },
    ]),
    null
  );
});
