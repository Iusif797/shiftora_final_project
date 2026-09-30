/**
 * Local file storage — replaces the former third-party dependency on
 * `storage.vibecodeapp.com`.
 *
 * Why this exists: uploads used to be POSTed to a third party, which then
 * handed back a public CDN URL that we stored in `Asset.url`. That meant every
 * user file (employee photos, check-in evidence) lived on infrastructure we do
 * not own, under a URL we do not control, with no way to delete it for certain.
 * Files now stay on our own disk, behind our own API.
 *
 * Addressing model: each stored file gets a 256-bit random `fileId` which is
 * also its capability token. The download route is unauthenticated but the id
 * is unguessable, which preserves the previous behaviour (a plain <Image
 * source={{uri}}> in the app works without attaching an auth header) while
 * moving the bytes onto our infrastructure. This is strictly stronger than what
 * it replaces: the old third-party CDN URLs were public too, but on someone
 * else's server.
 *
 * The id is hex-only and validated on every read, so it can never escape the
 * storage root via path traversal.
 */
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/** Root directory for stored files. Must be a writable, persistent volume. */
export const STORAGE_ROOT =
  process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim().length > 0
    ? process.env.UPLOAD_DIR.trim()
    : join(process.cwd(), "data", "uploads");

/** Extension used on disk for each accepted content type. */
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** A stored file id is exactly 64 lowercase hex chars (32 random bytes). */
const FILE_ID_RE = /^[0-9a-f]{64}$/;

export function isValidFileId(fileId: string): boolean {
  return FILE_ID_RE.test(fileId);
}

export function newFileId(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Resolve the on-disk path for a file id. Sharded two levels deep so a single
 * directory never accumulates millions of entries.
 *
 * Only ever called with an id that passed `isValidFileId`, so the id cannot
 * contain `/` or `..` — the result is always inside STORAGE_ROOT.
 */
export function pathForFileId(fileId: string, contentType: string): string {
  if (!isValidFileId(fileId)) {
    throw new Error("Refusing to resolve a path for a malformed file id");
  }
  const ext = EXTENSION_BY_MIME[contentType] ?? "bin";
  return join(STORAGE_ROOT, fileId.slice(0, 2), fileId.slice(2, 4), `${fileId}.${ext}`);
}

export async function writeStoredFile(
  fileId: string,
  contentType: string,
  bytes: Uint8Array,
): Promise<void> {
  const target = pathForFileId(fileId, contentType);
  await mkdir(dirname(target), { recursive: true });
  // `wx` => fail if it somehow already exists rather than overwrite another
  // user's file. With 256 bits of randomness this should never fire.
  await writeFile(target, bytes, { flag: "wx" });
}

export async function readStoredFile(
  fileId: string,
  contentType: string,
): Promise<Uint8Array | null> {
  if (!isValidFileId(fileId)) return null;
  try {
    return new Uint8Array(await readFile(pathForFileId(fileId, contentType)));
  } catch {
    return null;
  }
}

export async function deleteStoredFile(fileId: string, contentType: string): Promise<void> {
  if (!isValidFileId(fileId)) return;
  await rm(pathForFileId(fileId, contentType), { force: true });
}

/** Weak ETag for cache validation; content is immutable per id. */
export function etagFor(bytes: Uint8Array): string {
  return `"${createHash("sha256").update(bytes).digest("hex").slice(0, 32)}"`;
}

/**
 * Public URL for a stored file. Derived from BACKEND_URL so the hostname is
 * configuration, never hard-coded into the source.
 */
export function publicUrlForFileId(backendUrl: string, fileId: string): string {
  return `${backendUrl.replace(/\/+$/, "")}/api/upload/f/${fileId}`;
}
