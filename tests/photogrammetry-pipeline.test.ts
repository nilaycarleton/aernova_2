import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCaptureQualityProfile } from "../lib/photogrammetry-pipeline.ts";

type FakeImage = {
  id: string;
  type: "DRONE" | "ORTHOMOSAIC";
  metadataJson: Record<string, unknown> | null;
  altitudeFt: number | null;
  captureDate: Date | null;
};

function fakeImages(count: number, build: (index: number) => Partial<FakeImage>) {
  return Array.from({ length: count }, (_, i) => ({
    id: `img-${i}`,
    type: "DRONE" as const,
    metadataJson: null,
    altitudeFt: null,
    captureDate: null,
    ...build(i),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any[];
}

test("a JPEG set with GPS EXIF scores as geotagged", () => {
  const images = fakeImages(12, () => ({ metadataJson: { gps: true, latitude: 43.6, longitude: -79.4 } }));
  const profile = buildCaptureQualityProfile(images);
  const gpsItem = profile.items.find((item) => item.key === "gps");
  assert.equal(gpsItem?.value, "12/12");
  assert.equal(gpsItem?.status, "pass");
});

test("a georeferenced GeoTIFF set scores as geotagged even with no JPEG-style GPS fields", () => {
  const images = fakeImages(12, () => ({
    metadataJson: { fileKind: "geotiff", geotiff: { hasGeoreferencing: true, epsg: 32633 } },
  }));
  const profile = buildCaptureQualityProfile(images);
  const gpsItem = profile.items.find((item) => item.key === "gps");
  assert.equal(gpsItem?.value, "12/12");
  assert.equal(gpsItem?.status, "pass");
});

test("a plain (non-geo) TIFF with no georeferencing does not falsely count as geotagged", () => {
  const images = fakeImages(12, () => ({
    metadataJson: { fileKind: "geotiff", geotiff: { hasGeoreferencing: false } },
  }));
  const profile = buildCaptureQualityProfile(images);
  const gpsItem = profile.items.find((item) => item.key === "gps");
  assert.equal(gpsItem?.value, "0/12");
  assert.equal(gpsItem?.status, "fail");
});

test("a mixed JPEG + GeoTIFF set counts both kinds of location signal", () => {
  const images = [
    ...fakeImages(6, () => ({ metadataJson: { gps: true, latitude: 1, longitude: 2 } })),
    ...fakeImages(6, () => ({ metadataJson: { fileKind: "geotiff", geotiff: { hasGeoreferencing: true } } })),
  ];
  const profile = buildCaptureQualityProfile(images);
  const gpsItem = profile.items.find((item) => item.key === "gps");
  assert.equal(gpsItem?.value, "12/12");
});

test("missing metadata entirely does not crash scoring (empty upload payload)", () => {
  const images = fakeImages(3, () => ({ metadataJson: null }));
  assert.doesNotThrow(() => buildCaptureQualityProfile(images));
  const profile = buildCaptureQualityProfile(images);
  assert.equal(profile.items.find((item) => item.key === "gps")?.value, "0/3");
});
