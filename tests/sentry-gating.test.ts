import { test } from "node:test";
import assert from "node:assert/strict";
import { sentryOptions } from "../lib/sentry-init.ts";

// Sentry is deliberately errors-only and production-only. These pin the gating
// so a future change can't silently (a) start reporting from local dev and burn
// the error quota, (b) turn on performance tracing (separate quota), or
// (c) require a DSN to boot.

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const prev: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    prev[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    fn();
  } finally {
    for (const [key, value] of Object.entries(prev)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const DSN = "https://abc@o1.ingest.sentry.io/1";

test("no DSN => disabled (app must run before Sentry is configured)", () => {
  withEnv({ NEXT_PUBLIC_SENTRY_DSN: undefined, NODE_ENV: "production" }, () => {
    assert.equal(sentryOptions().enabled, false);
  });
});

test("DSN in production => enabled", () => {
  withEnv({ NEXT_PUBLIC_SENTRY_DSN: DSN, NODE_ENV: "production" }, () => {
    const options = sentryOptions();
    assert.equal(options.enabled, true);
    assert.equal(options.dsn, DSN);
  });
});

test("DSN in development => still disabled (don't burn quota on dev noise)", () => {
  withEnv({ NEXT_PUBLIC_SENTRY_DSN: DSN, NODE_ENV: "development" }, () => {
    assert.equal(sentryOptions().enabled, false);
  });
});

test("performance tracing stays off (errors-only)", () => {
  withEnv({ NEXT_PUBLIC_SENTRY_DSN: DSN, NODE_ENV: "production" }, () => {
    assert.equal(sentryOptions().tracesSampleRate, 0);
  });
});

test("environment falls back to NODE_ENV, and the override wins", () => {
  withEnv(
    { NEXT_PUBLIC_SENTRY_DSN: DSN, NODE_ENV: "production", NEXT_PUBLIC_SENTRY_ENVIRONMENT: undefined },
    () => {
      assert.equal(sentryOptions().environment, "production");
    }
  );
  withEnv(
    { NEXT_PUBLIC_SENTRY_DSN: DSN, NODE_ENV: "production", NEXT_PUBLIC_SENTRY_ENVIRONMENT: "staging" },
    () => {
      assert.equal(sentryOptions().environment, "staging");
    }
  );
});
