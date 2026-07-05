/**
 * Dependency-free drone image metadata extraction.
 *
 * DJI aircraft embed GPS, altitude, and gimbal data in an XMP packet (the
 * `drone-dji:*` namespace) inside the JPEG, and encode the capture timestamp in
 * the filename (DJI_YYYYMMDDHHMMSS_...). We parse both rather than pulling in a
 * full EXIF library: the XMP packet is plain XML, so a scan of the file bytes
 * recovers everything the capture-QA / geotag stages need.
 *
 * Non-DJI cameras that only write binary EXIF GPS are not covered here; they
 * would need a proper EXIF parser. Returns nulls for anything not found.
 */

export type DroneImageMetadata = {
  latitude: number | null;
  longitude: number | null;
  /** Height above takeoff (preferred) or absolute altitude, in feet. */
  altitudeFt: number | null;
  captureDate: Date | null;
};

const M_TO_FT = 3.280839895;

// Limit the XMP scan to the start of the file; the XMP/APP1 segment is near the
// top of a JPEG, so we avoid decoding tens of MB of image data as text.
const XMP_SCAN_BYTES = 256 * 1024;

function readXmpField(xml: string, field: string): string | null {
  // Attribute form: drone-dji:Field="value"
  const attr = new RegExp(`drone-dji:${field}\\s*=\\s*"([^"]*)"`).exec(xml);
  if (attr) return attr[1].trim();
  // Element form: <drone-dji:Field>value</drone-dji:Field>
  const elem = new RegExp(`<drone-dji:${field}>([^<]*)</drone-dji:${field}>`).exec(xml);
  return elem ? elem[1].trim() : null;
}

function toNumber(value: string | null): number | null {
  if (value == null) return null;
  const n = Number(value.replace(/^\+/, ""));
  return Number.isFinite(n) ? n : null;
}

function captureDateFromFileName(fileName?: string): Date | null {
  if (!fileName) return null;
  const m = /DJI_(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(fileName);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseDroneImageMetadata(bytes: Buffer, fileName?: string): DroneImageMetadata {
  const xml = bytes.subarray(0, XMP_SCAN_BYTES).toString("latin1");

  const latitude = toNumber(readXmpField(xml, "GpsLatitude") ?? readXmpField(xml, "Latitude"));
  const longitude = toNumber(readXmpField(xml, "GpsLongitude") ?? readXmpField(xml, "Longitude"));

  // RelativeAltitude (height above takeoff) is the most useful for GSD; fall
  // back to AbsoluteAltitude. Both are metres in the XMP.
  const altitudeM = toNumber(
    readXmpField(xml, "RelativeAltitude") ?? readXmpField(xml, "AbsoluteAltitude")
  );
  const altitudeFt = altitudeM == null ? null : Math.round(altitudeM * M_TO_FT * 10) / 10;

  // Prefer the XMP timestamp when present, otherwise the DJI filename pattern.
  const xmpDateRaw =
    /(?:exif:DateTimeOriginal|xmp:CreateDate)\s*=\s*"([^"]+)"/.exec(xml)?.[1] ??
    /<(?:exif:DateTimeOriginal|xmp:CreateDate)>([^<]+)</.exec(xml)?.[1] ??
    null;
  let captureDate: Date | null = null;
  if (xmpDateRaw) {
    const parsed = new Date(xmpDateRaw.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3"));
    captureDate = Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (!captureDate) captureDate = captureDateFromFileName(fileName);

  return { latitude, longitude, altitudeFt, captureDate };
}
