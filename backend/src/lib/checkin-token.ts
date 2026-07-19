import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env";

const PREFIX = "shiftora:checkin:v1";
const TOKEN_LIFETIME_MS = 10 * 60 * 1000;

function signature(value: string): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(value)
    .digest("base64url");
}

export function issueCheckinToken(
  assignmentId: string,
  now = Date.now(),
): { token: string; expiresAt: Date } {
  const expiresAt = new Date(now + TOKEN_LIFETIME_MS);
  const unsigned = `${PREFIX}:${assignmentId}:${expiresAt.getTime()}`;
  return { token: `${unsigned}:${signature(unsigned)}`, expiresAt };
}

export function verifyCheckinToken(
  token: string,
  now = Date.now(),
): { assignmentId: string; expiresAt: Date } | null {
  const parts = token.split(":");
  if (parts.length !== 6 || parts.slice(0, 3).join(":") !== PREFIX) return null;

  const assignmentId = parts[3] ?? "";
  const expiresAtMs = Number(parts[4]);
  const provided = parts[5] ?? "";
  // A base64url signature never contains ':'. The strict length check above
  // prevents ambiguous parsing of malformed values.
  if (!assignmentId || !Number.isSafeInteger(expiresAtMs) || expiresAtMs < now) return null;

  const unsigned = `${PREFIX}:${assignmentId}:${expiresAtMs}`;
  const expected = signature(unsigned);
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  if (
    providedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(providedBytes, expectedBytes)
  ) {
    return null;
  }

  return { assignmentId, expiresAt: new Date(expiresAtMs) };
}
