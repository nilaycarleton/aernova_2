import assert from "node:assert/strict";
import { test } from "node:test";
import { parseScopeDraft } from "../lib/ai/scope-draft-response.ts";

test("a clean response is trusted", () => {
  const draft = parseScopeDraft(
    JSON.stringify({
      introTitle: "Thanks for having us out",
      introBody: "We found moderate granule loss on the south slope.",
    })
  );
  assert.equal(draft.introTitle, "Thanks for having us out");
  assert.equal(draft.introBody, "We found moderate granule loss on the south slope.");
});

test("missing fields fall back to empty strings, not undefined", () => {
  const draft = parseScopeDraft(JSON.stringify({}));
  assert.equal(draft.introTitle, "");
  assert.equal(draft.introBody, "");
});

test("malformed JSON throws rather than silently drafting garbage", () => {
  assert.throws(() => parseScopeDraft("not json"));
});

test("a JSON array throws the same way objects with the wrong shape do", () => {
  assert.throws(() => parseScopeDraft("[1,2]"));
});

test("a markdown-fenced response is trusted, not rejected as unreadable", () => {
  // Live-caught: the system prompt asks for raw JSON with no fences, and the
  // model almost always complies — but "almost always" surfaced as a real
  // "Couldn't read the assistant's response." error in a live check.
  const fenced =
    "```json\n" +
    JSON.stringify({ introTitle: "Thanks for having us out", introBody: "Found some wear." }) +
    "\n```";
  const draft = parseScopeDraft(fenced);
  assert.equal(draft.introTitle, "Thanks for having us out");
  assert.equal(draft.introBody, "Found some wear.");
});
