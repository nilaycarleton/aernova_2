import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCaptureResponse, type ServiceForCapture } from "../lib/ai/capture-response.ts";

const CATALOG: ServiceForCapture[] = [
  { id: "svc_shingle", name: "Shingle repair", unit: "each", unitPriceCents: 45_000 },
  { id: "svc_flashing", name: "Flashing replacement", unit: "linear ft", unitPriceCents: 1_200 },
];

test("a clean match is trusted, price taken from the catalog", () => {
  const draft = parseCaptureResponse(
    JSON.stringify({
      jobName: "Chimney flashing repair",
      description: "Flashing around the chimney is lifting.",
      serviceId: "svc_flashing",
      suggestedPriceCents: 999_999, // the model's own number, deliberately wrong
    }),
    CATALOG
  );
  assert.equal(draft.serviceId, "svc_flashing");
  // The catalog's price, not the one the model echoed back.
  assert.equal(draft.suggestedPriceCents, 1_200);
});

test("a hallucinated serviceId is dropped, not trusted", () => {
  const draft = parseCaptureResponse(
    JSON.stringify({
      jobName: "Roof job",
      description: "Something.",
      serviceId: "svc_does_not_exist",
      suggestedPriceCents: 5_000,
    }),
    CATALOG
  );
  assert.equal(draft.serviceId, null);
  assert.equal(draft.suggestedPriceCents, null);
});

test("no match is a legitimate answer, not an error", () => {
  const draft = parseCaptureResponse(
    JSON.stringify({ jobName: "Fence repair", description: "Not a roofing job.", serviceId: null }),
    CATALOG
  );
  assert.equal(draft.serviceId, null);
  assert.equal(draft.suggestedPriceCents, null);
  assert.equal(draft.jobName, "Fence repair");
});

test("a blank or missing job name falls back rather than saving empty", () => {
  const draft = parseCaptureResponse(JSON.stringify({ jobName: "   ", description: "x" }), CATALOG);
  assert.equal(draft.jobName, "New job");
});

test("malformed JSON throws rather than silently drafting garbage", () => {
  assert.throws(() => parseCaptureResponse("not json at all", CATALOG));
});

test("a JSON array (not an object) throws the same way", () => {
  assert.throws(() => parseCaptureResponse("[1,2,3]", CATALOG));
});

test("markdown-fenced JSON is trusted, not rejected as unreadable", () => {
  // Live-caught (2026-08-06): the system prompt asks for raw JSON with no
  // fences, and the model almost always complies — but "almost always" isn't
  // good enough to throw a contractor's draft away over. A fence is stripped
  // before parsing rather than failing a well-formed response over wrapping.
  const draft = parseCaptureResponse(
    "```json\n" + JSON.stringify({ jobName: "Chimney flashing repair" }) + "\n```",
    CATALOG
  );
  assert.equal(draft.jobName, "Chimney flashing repair");
});
