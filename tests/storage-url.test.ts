import assert from "node:assert/strict";
import { test } from "node:test";
import { isOwnStorageUrl, keyFromUrl } from "../lib/storage.ts";

// These run under the local driver, which is what a dev machine and CI use.
// The S3 driver's public base is checked by `keyFromUrl` on the same path.

test("a URL we minted is recognised", () => {
  assert.equal(isOwnStorageUrl("/uploads/quotes/abc/def.jpg"), true);
});

test("somebody else's image is not ours", () => {
  // The case that matters: this string arrives from a browser, on a row that
  // ends up rendered on a page we hand to a homeowner.
  assert.equal(isOwnStorageUrl("https://example.com/tracker.gif"), false);
  assert.equal(isOwnStorageUrl("//evil.example/x.png"), false);
});

test("a javascript: URL is not a photo", () => {
  assert.equal(isOwnStorageUrl("javascript:alert(1)"), false);
  assert.equal(isOwnStorageUrl("data:image/svg+xml,<svg onload=alert(1)>"), false);
});

test("empty is not ours", () => {
  assert.equal(isOwnStorageUrl(""), false);
});

test("a traversal cannot pass as one of ours", () => {
  // This one round-trips through the local driver unchanged, so the round trip
  // alone would accept it. It is rejected on the `..` segment instead — and it
  // matters beyond display, because such a key reaching `getBytes` is a read
  // from outside the uploads root.
  assert.equal(keyFromUrl("/uploads/../../etc/passwd"), "../../etc/passwd");
  assert.equal(isOwnStorageUrl("/uploads/../../etc/passwd"), false);
  assert.equal(isOwnStorageUrl("/uploads/quotes/../../../.env"), false);
});
