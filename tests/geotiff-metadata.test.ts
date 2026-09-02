import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isSupportedImageryUpload,
  looksLikeJpeg,
  looksLikeTiff,
  parseGeoTiffMetadata,
} from "../lib/geotiff-metadata.ts";

const JPEG_SOI = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);

/**
 * Hand-builds a minimal little-endian TIFF with a real GeoTIFF georeferencing
 * block, laid out exactly like a real orthomosaic/DSM export from ODM:
 *   - ImageWidth/ImageLength (256/257)
 *   - ModelPixelScaleTag (33550): 0.1m pixels
 *   - ModelTiepointTag (33922): raster (0,0) -> UTM (500000, 4800000)
 *   - GeoKeyDirectoryTag (34735): GTModelTypeGeoKey=1 (projected),
 *     ProjectedCSTypeGeoKey=32633 (UTM zone 33N)
 */
function buildSyntheticGeoTiff(): Buffer {
  const IFD_OFFSET = 8;
  const ENTRY_COUNT = 5;
  const DATA_START = IFD_OFFSET + 2 + ENTRY_COUNT * 12 + 4; // = 74
  const PIXEL_SCALE_OFFSET = DATA_START; // 24 bytes
  const TIEPOINT_OFFSET = PIXEL_SCALE_OFFSET + 24; // 48 bytes
  const GEOKEY_OFFSET = TIEPOINT_OFFSET + 48; // 24 bytes
  const TOTAL = GEOKEY_OFFSET + 24;

  const buf = Buffer.alloc(TOTAL);
  buf.write("II", 0, "latin1");
  buf.writeUInt16LE(42, 2);
  buf.writeUInt32LE(IFD_OFFSET, 4);

  buf.writeUInt16LE(ENTRY_COUNT, IFD_OFFSET);
  let entryBase = IFD_OFFSET + 2;

  function writeEntry(tag: number, type: number, count: number, inlineOrOffset: number) {
    buf.writeUInt16LE(tag, entryBase);
    buf.writeUInt16LE(type, entryBase + 2);
    buf.writeUInt32LE(count, entryBase + 4);
    buf.writeUInt32LE(inlineOrOffset, entryBase + 8);
    entryBase += 12;
  }

  writeEntry(256, 3, 1, 512); // ImageWidth
  writeEntry(257, 3, 1, 512); // ImageLength
  writeEntry(33550, 12, 3, PIXEL_SCALE_OFFSET); // ModelPixelScaleTag
  writeEntry(33922, 12, 6, TIEPOINT_OFFSET); // ModelTiepointTag
  writeEntry(34735, 3, 12, GEOKEY_OFFSET); // GeoKeyDirectoryTag

  buf.writeUInt32LE(0, entryBase); // next IFD offset (none)

  buf.writeDoubleLE(0.1, PIXEL_SCALE_OFFSET);
  buf.writeDoubleLE(0.1, PIXEL_SCALE_OFFSET + 8);
  buf.writeDoubleLE(0, PIXEL_SCALE_OFFSET + 16);

  const tiepoint = [0, 0, 0, 500000, 4800000, 0];
  tiepoint.forEach((v, i) => buf.writeDoubleLE(v, TIEPOINT_OFFSET + i * 8));

  const geoKeys = [1, 1, 0, 2, 1024, 0, 1, 1, 3072, 0, 1, 32633];
  geoKeys.forEach((v, i) => buf.writeUInt16LE(v, GEOKEY_OFFSET + i * 2));

  return buf;
}

function buildPlainTiff(): Buffer {
  const IFD_OFFSET = 8;
  const ENTRY_COUNT = 2;
  const buf = Buffer.alloc(IFD_OFFSET + 2 + ENTRY_COUNT * 12 + 4);
  buf.write("II", 0, "latin1");
  buf.writeUInt16LE(42, 2);
  buf.writeUInt32LE(IFD_OFFSET, 4);
  buf.writeUInt16LE(ENTRY_COUNT, IFD_OFFSET);
  buf.writeUInt16LE(256, IFD_OFFSET + 2);
  buf.writeUInt16LE(3, IFD_OFFSET + 4);
  buf.writeUInt32LE(1, IFD_OFFSET + 6);
  buf.writeUInt32LE(100, IFD_OFFSET + 10);
  buf.writeUInt16LE(257, IFD_OFFSET + 14);
  buf.writeUInt16LE(3, IFD_OFFSET + 16);
  buf.writeUInt32LE(1, IFD_OFFSET + 18);
  buf.writeUInt32LE(100, IFD_OFFSET + 22);
  buf.writeUInt32LE(0, IFD_OFFSET + 26);
  return buf;
}

test("a real JPEG is detected as JPEG, not TIFF", () => {
  assert.equal(looksLikeJpeg(JPEG_SOI), true);
  assert.equal(looksLikeTiff(JPEG_SOI), false);
});

test("a synthetic GeoTIFF is detected as TIFF, not JPEG", () => {
  const tiff = buildSyntheticGeoTiff();
  assert.equal(looksLikeTiff(tiff), true);
  assert.equal(looksLikeJpeg(tiff), false);
});

test("georeferencing (pixel scale + tiepoint + CRS) is extracted from a real GeoTIFF layout", () => {
  const meta = parseGeoTiffMetadata(buildSyntheticGeoTiff());
  assert.equal(meta.isTiff, true);
  assert.equal(meta.hasGeoreferencing, true);
  assert.equal(meta.crsKind, "projected");
  assert.equal(meta.epsg, 32633);
  assert.equal(meta.imageWidth, 512);
  assert.equal(meta.imageHeight, 512);
  assert.deepEqual(meta.pixelSize, { x: 0.1, y: 0.1 });
  assert.deepEqual(meta.origin, { x: 500000, y: 4800000 });
});

test("a plain (non-geo) TIFF parses without georeferencing rather than throwing", () => {
  const meta = parseGeoTiffMetadata(buildPlainTiff());
  assert.equal(meta.isTiff, true);
  assert.equal(meta.hasGeoreferencing, false);
  assert.equal(meta.epsg, null);
  assert.equal(meta.imageWidth, 100);
  assert.equal(meta.imageHeight, 100);
});

test("a non-TIFF file (e.g. a JPEG) returns isTiff:false with no georeferencing", () => {
  const meta = parseGeoTiffMetadata(JPEG_SOI);
  assert.equal(meta.isTiff, false);
  assert.equal(meta.hasGeoreferencing, false);
});

test("a truncated/malformed TIFF-looking buffer degrades safely instead of throwing", () => {
  const truncated = Buffer.from([0x49, 0x49, 42, 0, 8, 0, 0, 0]); // header only, no IFD
  assert.doesNotThrow(() => parseGeoTiffMetadata(truncated));
  const meta = parseGeoTiffMetadata(truncated);
  assert.equal(meta.hasGeoreferencing, false);
});

test("an empty buffer is not mistaken for a TIFF", () => {
  assert.equal(looksLikeTiff(Buffer.alloc(0)), false);
  assert.equal(looksLikeJpeg(Buffer.alloc(0)), false);
});

test("a real TIFF is accepted when the OS supplies no MIME type", () => {
  assert.equal(isSupportedImageryUpload(buildSyntheticGeoTiff(), ""), true);
});

test("a renamed non-image is not accepted solely because its MIME type is blank", () => {
  assert.equal(isSupportedImageryUpload(Buffer.from("not a TIFF"), ""), false);
});

test("existing browser-recognized image formats remain accepted", () => {
  assert.equal(isSupportedImageryUpload(Buffer.from("png bytes are decoded later"), "image/png"), true);
});
