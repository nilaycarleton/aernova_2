import { test } from "node:test";
import assert from "node:assert/strict";
import { storage, keyFromUrl, storageDriverName } from "../lib/storage.ts";

// The NodeODM submission reads each source image with
//   storage.getBytes(keyFromUrl(image.url))
// so a URL the active driver produced MUST map back to the exact key it was
// stored under. If this round-trip breaks under S3, submission silently finds
// no bytes and the reconstruction fails after the images are already uploaded.
// These tests pin the invariant for both drivers. url() makes no network call,
// so the S3 cases need no credentials.

const KEYS = [
  "imagery/proj_123/abc.jpg",
  "inspections/proj_123/def.jpeg",
  "processing/proj_123/img_1/all.zip",
];

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

test("local driver: url -> keyFromUrl round-trips", () => {
  withEnv({ STORAGE_DRIVER: "local", STORAGE_PUBLIC_BASE_URL: undefined }, () => {
    assert.equal(storageDriverName(), "local");
    for (const key of KEYS) {
      const url = storage.url(key);
      assert.ok(url.startsWith("/uploads/"), `expected a /uploads URL, got ${url}`);
      assert.equal(keyFromUrl(url), key);
    }
  });
});

test("s3 driver: url -> keyFromUrl round-trips", () => {
  withEnv(
    {
      STORAGE_DRIVER: "s3",
      S3_BUCKET: "aernova-test",
      STORAGE_PUBLIC_BASE_URL: "https://cdn.example.com",
    },
    () => {
      assert.equal(storageDriverName(), "s3");
      for (const key of KEYS) {
        const url = storage.url(key);
        assert.equal(url, `https://cdn.example.com/${key}`);
        // This is exactly what createNodeOdmTask relies on.
        assert.equal(keyFromUrl(url), key);
      }
    }
  );
});

test("s3 driver: a trailing slash on the public base still round-trips", () => {
  withEnv(
    {
      STORAGE_DRIVER: "s3",
      S3_BUCKET: "aernova-test",
      STORAGE_PUBLIC_BASE_URL: "https://cdn.example.com/",
    },
    () => {
      const key = "imagery/proj_123/abc.jpg";
      assert.equal(keyFromUrl(storage.url(key)), key);
    }
  );
});

test("s3 driver: a public base with a path prefix still round-trips", () => {
  withEnv(
    {
      STORAGE_DRIVER: "s3",
      S3_BUCKET: "aernova-test",
      STORAGE_PUBLIC_BASE_URL: "https://example.com/assets",
    },
    () => {
      const key = "imagery/proj_123/abc.jpg";
      const url = storage.url(key);
      assert.equal(url, `https://example.com/assets/${key}`);
      // Must strip the whole base, not just the origin — otherwise the key
      // would come back as "assets/imagery/..." and miss in the bucket.
      assert.equal(keyFromUrl(url), key);
    }
  );
});

test("legacy /uploads URLs still resolve to their key after switching to s3", () => {
  // Rows written before the S3 switch kept "/uploads/<key>" URLs. keyFromUrl
  // must still recover the key so those records aren't orphaned by the switch.
  withEnv(
    {
      STORAGE_DRIVER: "s3",
      S3_BUCKET: "aernova-test",
      STORAGE_PUBLIC_BASE_URL: "https://cdn.example.com",
    },
    () => {
      assert.equal(keyFromUrl("/uploads/imagery/proj_123/abc.jpg"), "imagery/proj_123/abc.jpg");
    }
  );
});
