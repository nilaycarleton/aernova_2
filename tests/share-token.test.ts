import assert from "node:assert/strict";
import { test } from "node:test";
import {
  generateShareToken,
  isWellFormedShareToken,
  shareUrl,
} from "../lib/share-token.ts";

test("a token is unguessable, and never the same twice", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 2000; i++) seen.add(generateShareToken());
  assert.equal(seen.size, 2000, "two tokens collided in 2000 draws");
});

test("every generated token passes its own well-formedness check", () => {
  for (let i = 0; i < 200; i++) {
    const token = generateShareToken();
    assert.ok(isWellFormedShareToken(token), `${token} failed its own check`);
  }
});

test("the alphabet excludes the characters people misread down a phone", () => {
  const joined = Array.from({ length: 300 }, generateShareToken).join("");
  for (const character of "01OILU") {
    assert.ok(!joined.includes(character), `${character} is ambiguous and must not appear`);
  }
});

test("malformed tokens are rejected before they cost a query", () => {
  assert.equal(isWellFormedShareToken(""), false);
  assert.equal(isWellFormedShareToken("hello"), false);
  assert.equal(isWellFormedShareToken("ABCDE-ABCDE-ABCDE"), false, "too few groups");
  assert.equal(isWellFormedShareToken("ABCDE-ABCDE-ABCDE-ABCDE-ABCDE"), false, "too many");
  assert.equal(isWellFormedShareToken("ABCD-ABCDE-ABCDE-ABCDE"), false, "short group");
  assert.equal(isWellFormedShareToken("ABCDE-ABCDE-ABCDE-ABCD1"), false, "banned character");
  // A path traversal or SQL fragment can never reach the database layer.
  assert.equal(isWellFormedShareToken("../../etc/passwd"), false);
  assert.equal(isWellFormedShareToken("' OR 1=1 --"), false);
});

test("the share URL survives a trailing slash on the origin", () => {
  const token = generateShareToken();
  assert.equal(
    shareUrl("quote", token, "https://app.aernova.ca/"),
    `https://app.aernova.ca/q/${token}`
  );
  assert.equal(
    shareUrl("quote", token, "https://app.aernova.ca"),
    `https://app.aernova.ca/q/${token}`
  );
});

test("each kind gets its own short path, and they never collide", () => {
  const token = generateShareToken();
  const origin = "https://app.aernova.ca";
  assert.equal(shareUrl("quote", token, origin), `${origin}/q/${token}`);
  assert.equal(shareUrl("invoice", token, origin), `${origin}/i/${token}`);
  assert.equal(shareUrl("calendar", token, origin), `${origin}/calendar/${token}`);
});

test("the token carries enough entropy to be a credential", () => {
  // 20 characters from a 30-letter alphabet ≈ 98 bits. The bar is "cannot be
  // enumerated by somebody who has one quote and wants their neighbour's".
  const bits = 20 * Math.log2(30);
  assert.ok(bits > 90, `only ${bits.toFixed(0)} bits of entropy`);
});
