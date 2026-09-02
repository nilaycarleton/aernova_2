import assert from "node:assert/strict";
import { test } from "node:test";
import { ClientStatus } from "@prisma/client";
import { clientStatusTone } from "../lib/client-status.ts";

test("ACTIVE reads as success", () => {
  assert.equal(clientStatusTone(ClientStatus.ACTIVE), "success");
});

test("LEAD and ARCHIVED both read as neutral", () => {
  assert.equal(clientStatusTone(ClientStatus.LEAD), "neutral");
  assert.equal(clientStatusTone(ClientStatus.ARCHIVED), "neutral");
});
