/**
 * Dependency-free GeoTIFF header inspection.
 *
 * Mirrors the doctrine in `drone-metadata.ts`: no image-decoding library, just
 * a targeted read of the container format. TIFF stores everything we need —
 * dimensions and (when present) the GeoTIFF georeferencing tags — in the IFD
 * (Image File Directory), a flat list of tag/type/count/value entries. We
 * never decode pixel data, so this is cheap even on a large orthomosaic.
 *
 * Reference: TIFF 6.0 spec + GeoTIFF 1.0 spec (tags 33550/33922/34735/34737).
 * A plain (non-geo) TIFF parses fine here too — `hasGeoreferencing` is just
 * false and the geo-only fields stay null.
 */

export type GeoTiffMetadata = {
  /** True when the byte stream starts with a valid TIFF header (little- or big-endian). */
  isTiff: boolean;
  /** True when GeoTIFF georeferencing tags (pixel scale/tiepoint or a full transform) were found. */
  hasGeoreferencing: boolean;
  /** EPSG code for the projected or geographic CRS, when the GeoKeyDirectory names one. */
  epsg: number | null;
  crsKind: "projected" | "geographic" | "geocentric" | null;
  imageWidth: number | null;
  imageHeight: number | null;
  /** Ground size of one pixel, in the CRS's linear units (usually metres or degrees). */
  pixelSize: { x: number; y: number } | null;
  /** Model-space coordinates of the upper-left pixel corner, from the GeoTIFF tiepoint. */
  origin: { x: number; y: number } | null;
};

const EMPTY: GeoTiffMetadata = {
  isTiff: false,
  hasGeoreferencing: false,
  epsg: null,
  crsKind: null,
  imageWidth: null,
  imageHeight: null,
  pixelSize: null,
  origin: null,
};

const TAG_IMAGE_WIDTH = 256;
const TAG_IMAGE_LENGTH = 257;
const TAG_MODEL_PIXEL_SCALE = 33550;
const TAG_MODEL_TIEPOINT = 33922;
const TAG_MODEL_TRANSFORMATION = 34264;
const TAG_GEO_KEY_DIRECTORY = 34735;

const KEY_GT_MODEL_TYPE = 1024;
const KEY_GEOGRAPHIC_TYPE = 2048;
const KEY_PROJECTED_CS_TYPE = 3072;

// Byte width of each TIFF field type; only the ones GeoTIFF actually uses.
const TYPE_SIZE: Record<number, number> = {
  1: 1, // BYTE
  2: 1, // ASCII
  3: 2, // SHORT
  4: 4, // LONG
  5: 8, // RATIONAL
  11: 4, // FLOAT
  12: 8, // DOUBLE
};

export function looksLikeTiff(bytes: Buffer): boolean {
  if (bytes.length < 4) return false;
  const byteOrder = bytes.toString("latin1", 0, 2);
  if (byteOrder !== "II" && byteOrder !== "MM") return false;
  const little = byteOrder === "II";
  return (little ? bytes.readUInt16LE(2) : bytes.readUInt16BE(2)) === 42;
}

export function looksLikeJpeg(bytes: Buffer): boolean {
  return bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

/**
 * Preserve the existing image/* upload contract while admitting real TIFFs
 * whose OS file picker supplied an empty or generic MIME type. The TIFF
 * exception is based on container bytes, never on a renameable extension.
 */
export function isSupportedImageryUpload(bytes: Buffer, mimeType: string): boolean {
  return mimeType.startsWith("image/") || looksLikeTiff(bytes);
}

type Reader = {
  u16(offset: number): number;
  u32(offset: number): number;
  f64(offset: number): number;
};

function makeReader(bytes: Buffer, little: boolean): Reader {
  return little
    ? {
        u16: (o) => bytes.readUInt16LE(o),
        u32: (o) => bytes.readUInt32LE(o),
        f64: (o) => bytes.readDoubleLE(o),
      }
    : {
        u16: (o) => bytes.readUInt16BE(o),
        u32: (o) => bytes.readUInt32BE(o),
        f64: (o) => bytes.readDoubleBE(o),
      };
}

type IfdEntry = { tag: number; type: number; count: number; valueOffset: number };

/** Reads one IFD (the first one — georeferencing lives there for every real-world GeoTIFF). */
function readIfd(bytes: Buffer, reader: Reader, ifdOffset: number): IfdEntry[] {
  const entryCount = reader.u16(ifdOffset);
  const entries: IfdEntry[] = [];
  for (let i = 0; i < entryCount; i++) {
    const base = ifdOffset + 2 + i * 12;
    if (base + 12 > bytes.length) break;
    entries.push({
      tag: reader.u16(base),
      type: reader.u16(base + 2),
      count: reader.u32(base + 4),
      valueOffset: base + 8,
    });
  }
  return entries;
}

/** Resolves a SHORT/LONG entry to its numbers, following the offset when the value doesn't fit inline. */
function readInts(bytes: Buffer, reader: Reader, entry: IfdEntry): number[] {
  const size = TYPE_SIZE[entry.type];
  if (!size) return [];
  const totalBytes = size * entry.count;
  const dataStart = totalBytes <= 4 ? entry.valueOffset : reader.u32(entry.valueOffset);
  const read = entry.type === 3 ? reader.u16 : reader.u32;
  const out: number[] = [];
  for (let i = 0; i < entry.count; i++) {
    const pos = dataStart + i * size;
    if (pos + size > bytes.length) break;
    out.push(read(pos));
  }
  return out;
}

/** Resolves a DOUBLE (type 12) entry — used for pixel scale / tiepoint / transform. */
function readDoubles(bytes: Buffer, reader: Reader, entry: IfdEntry): number[] {
  if (entry.type !== 12) return [];
  const dataStart = reader.u32(entry.valueOffset); // DOUBLE arrays never fit inline
  const out: number[] = [];
  for (let i = 0; i < entry.count; i++) {
    const pos = dataStart + i * 8;
    if (pos + 8 > bytes.length) break;
    out.push(reader.f64(pos));
  }
  return out;
}

function crsKindFor(modelType: number | undefined): GeoTiffMetadata["crsKind"] {
  if (modelType === 1) return "projected";
  if (modelType === 2) return "geographic";
  if (modelType === 3) return "geocentric";
  return null;
}

export function parseGeoTiffMetadata(bytes: Buffer): GeoTiffMetadata {
  try {
    if (!looksLikeTiff(bytes)) return EMPTY;
    const little = bytes.toString("latin1", 0, 2) === "II";
    const reader = makeReader(bytes, little);
    const firstIfdOffset = reader.u32(4);
    const entries = readIfd(bytes, reader, firstIfdOffset);

    const byTag = new Map(entries.map((entry) => [entry.tag, entry]));

    const widthEntry = byTag.get(TAG_IMAGE_WIDTH);
    const heightEntry = byTag.get(TAG_IMAGE_LENGTH);
    const imageWidth = widthEntry ? (readInts(bytes, reader, widthEntry)[0] ?? null) : null;
    const imageHeight = heightEntry ? (readInts(bytes, reader, heightEntry)[0] ?? null) : null;

    const pixelScaleEntry = byTag.get(TAG_MODEL_PIXEL_SCALE);
    const tiepointEntry = byTag.get(TAG_MODEL_TIEPOINT);
    const transformEntry = byTag.get(TAG_MODEL_TRANSFORMATION);

    const pixelScale = pixelScaleEntry ? readDoubles(bytes, reader, pixelScaleEntry) : [];
    const tiepoint = tiepointEntry ? readDoubles(bytes, reader, tiepointEntry) : [];
    const transform = transformEntry ? readDoubles(bytes, reader, transformEntry) : [];

    let pixelSize: GeoTiffMetadata["pixelSize"] = null;
    let origin: GeoTiffMetadata["origin"] = null;

    if (pixelScale.length >= 2 && tiepoint.length >= 6) {
      pixelSize = { x: pixelScale[0], y: pixelScale[1] };
      // Tiepoint is [i, j, k, x, y, z] — raster (i,j) maps to model (x,y). We
      // only ever anchor the (0,0) upper-left corner, which is what every real
      // orthomosaic/DSM export uses.
      origin = { x: tiepoint[3], y: tiepoint[4] };
    } else if (transform.length >= 16) {
      // Full affine transform: [a b c d; e f g h; ...]. Pixel size is the
      // diagonal scale terms; origin is the translation column.
      pixelSize = { x: transform[0], y: Math.abs(transform[5]) };
      origin = { x: transform[3], y: transform[7] };
    }

    let epsg: number | null = null;
    let crsKind: GeoTiffMetadata["crsKind"] = null;
    const geoKeyEntry = byTag.get(TAG_GEO_KEY_DIRECTORY);
    if (geoKeyEntry) {
      const raw = readInts(bytes, reader, { ...geoKeyEntry, type: 3 });
      // Header: [KeyDirectoryVersion, KeyRevision, MinorRevision, NumberOfKeys]
      const numberOfKeys = raw[3] ?? 0;
      const keys = new Map<number, number>();
      for (let i = 0; i < numberOfKeys; i++) {
        const base = 4 + i * 4;
        const keyId = raw[base];
        const tiffTagLocation = raw[base + 1];
        const value = raw[base + 3];
        if (keyId === undefined) continue;
        // TIFFTagLocation 0 means the value is inline in this same SHORT array
        // (the only case GeoTIFF actually uses for the keys we read).
        if (tiffTagLocation === 0) keys.set(keyId, value);
      }
      crsKind = crsKindFor(keys.get(KEY_GT_MODEL_TYPE));
      const projected = keys.get(KEY_PROJECTED_CS_TYPE);
      const geographic = keys.get(KEY_GEOGRAPHIC_TYPE);
      const candidate = projected && projected !== 32767 ? projected : geographic;
      epsg = candidate && candidate !== 32767 ? candidate : null;
    }

    const hasGeoreferencing = Boolean(pixelSize && origin);

    return {
      isTiff: true,
      hasGeoreferencing,
      epsg,
      crsKind,
      imageWidth,
      imageHeight,
      pixelSize,
      origin,
    };
  } catch {
    // Malformed/truncated TIFF: treat as a plain (non-geo) file rather than
    // failing the upload — the original bytes are preserved regardless.
    return { ...EMPTY, isTiff: looksLikeTiff(bytes) };
  }
}
