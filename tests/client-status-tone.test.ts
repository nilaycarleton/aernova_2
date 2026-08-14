import assert from "node:assert/strict";
import { test } from "node:test";
import { ClientStatus } from "@prisma/client";
import { clientStatusTone } from "../lib/client-status.ts";

test("ACTIVE reads as success, matching CLIENT_STATUS_META's confirm-tinted badge", () => {
  assert.equal(clientStatusTone(ClientStatus.ACTIVE), "success");
});

test("LEAD and ARCHIVED both read as neutral, matching CLIENT_STATUS_META's muted badges", () => {
  assert.equal(clientStatusTone(ClientStatus.LEAD), "neutral");
  assert.equal(clientStatusTone(ClientStatus.ARCHIVED), "neutral");
});
