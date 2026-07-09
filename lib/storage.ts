import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";

/**
 * Storage abstraction for user-uploaded files (drone imagery, inspection
 * photos). Two drivers:
 *
 *  - "local"  → writes under public/uploads/<key>, served at /uploads/<key>.
 *               Default; preserves the original on-disk behaviour for dev.
 *  - "s3"     → puts objects in an S3-compatible bucket (AWS S3 or Cloudflare
 *               R2) and serves them from STORAGE_PUBLIC_BASE_URL/<key>.
 *
 * Callers pass a stable key (e.g. "imagery/<projectId>/<file>") and store the
 * returned `url` on the record. Swapping drivers is an env change only.
 */

export type PutResult = { key: string; url: string };

export interface StorageDriver {
  put(key: string, bytes: Buffer, contentType?: string): Promise<PutResult>;
  getBytes(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  /** Public URL for a stored key (does not check existence). */
  url(key: string): string;
}

function normalizeKey(key: string) {
  return key.replace(/^\/+/, "");
}

/**
 * Recover the storage key from a stored public URL, so callers that only kept
 * the `url` (e.g. ProjectImagery.url) can still read the bytes back through the
 * active driver. Handles the local `/uploads/<key>` form and the S3
 * `<publicBase>/<key>` form, falling back to the URL pathname.
 */
export function keyFromUrl(url: string): string {
  if (url.startsWith("/uploads/")) return normalizeKey(url.slice("/uploads/".length));
  const base = (process.env.STORAGE_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  if (base && url.startsWith(`${base}/`)) return normalizeKey(url.slice(base.length + 1));
  try {
    return normalizeKey(new URL(url).pathname.replace(/^\/uploads\//, ""));
  } catch {
    return normalizeKey(url);
  }
}

// --- Local disk driver -----------------------------------------------------

function localPath(key: string) {
  return path.join(process.cwd(), "public", "uploads", normalizeKey(key));
}

const localDriver: StorageDriver = {
  url(key) {
    return `/uploads/${normalizeKey(key)}`;
  },
  async put(key, bytes) {
    const target = localPath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
    return { key: normalizeKey(key), url: this.url(key) };
  },
  async getBytes(key) {
    return readFile(localPath(key)).catch(() => null);
  },
  async delete(key) {
    await unlink(localPath(key)).catch(() => undefined);
  },
};

// --- S3 / R2 driver --------------------------------------------------------

function s3Config() {
  const bucket = process.env.S3_BUCKET;
  const publicBase = (process.env.STORAGE_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  if (!bucket) throw new Error("S3_BUCKET is not configured");
  if (!publicBase) throw new Error("STORAGE_PUBLIC_BASE_URL is not configured");
  return {
    bucket,
    publicBase,
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  };
}

// Lazily import the AWS SDK so the local driver (and the build) never require
// it. Only loaded when STORAGE_DRIVER=s3.
let s3ClientPromise: Promise<{ client: unknown; PutObjectCommand: unknown; GetObjectCommand: unknown; DeleteObjectCommand: unknown }> | null = null;
async function getS3() {
  if (!s3ClientPromise) {
    s3ClientPromise = (async () => {
      const cfg = s3Config();
      const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = await import(
        "@aws-sdk/client-s3"
      );
      const client = new S3Client({
        region: cfg.region,
        endpoint: cfg.endpoint,
        credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
      });
      return { client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand };
    })();
  }
  return s3ClientPromise;
}

const s3Driver: StorageDriver = {
  url(key) {
    return `${s3Config().publicBase}/${normalizeKey(key)}`;
  },
  async put(key, bytes, contentType) {
    const { client, PutObjectCommand } = await getS3();
    const cfg = s3Config();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client as any).send(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new (PutObjectCommand as any)({
        Bucket: cfg.bucket,
        Key: normalizeKey(key),
        Body: bytes,
        ContentType: contentType,
      })
    );
    return { key: normalizeKey(key), url: this.url(key) };
  },
  async getBytes(key) {
    const { client, GetObjectCommand } = await getS3();
    const cfg = s3Config();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await (client as any).send(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (GetObjectCommand as any)({ Bucket: cfg.bucket, Key: normalizeKey(key) })
      );
      const bytes = await res.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch {
      return null;
    }
  },
  async delete(key) {
    const { client, DeleteObjectCommand } = await getS3();
    const cfg = s3Config();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client as any).send(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new (DeleteObjectCommand as any)({ Bucket: cfg.bucket, Key: normalizeKey(key) })
    );
  },
};

// --- Driver selection ------------------------------------------------------

function selectedDriver(): StorageDriver {
  const driver = (process.env.STORAGE_DRIVER || "local").toLowerCase();
  return driver === "s3" ? s3Driver : localDriver;
}

export const storage: StorageDriver = {
  url: (key) => selectedDriver().url(key),
  put: (key, bytes, contentType) => selectedDriver().put(key, bytes, contentType),
  getBytes: (key) => selectedDriver().getBytes(key),
  delete: (key) => selectedDriver().delete(key),
};

export function storageDriverName() {
  return (process.env.STORAGE_DRIVER || "local").toLowerCase() === "s3" ? "s3" : "local";
}
