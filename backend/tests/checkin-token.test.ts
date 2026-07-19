import { describe, expect, it } from "bun:test";
import { issueCheckinToken, verifyCheckinToken } from "../src/lib/checkin-token";

describe("signed check-in QR tokens", () => {
  it("accepts an untampered token before expiration", () => {
    const issued = issueCheckinToken("assignment-123", 1_000);
    expect(verifyCheckinToken(issued.token, 2_000)).toEqual({
      assignmentId: "assignment-123",
      expiresAt: issued.expiresAt,
    });
  });

  it("rejects expired and modified tokens", () => {
    const issued = issueCheckinToken("assignment-123", 1_000);
    expect(verifyCheckinToken(issued.token, issued.expiresAt.getTime() + 1)).toBeNull();
    expect(verifyCheckinToken(issued.token.replace("assignment-123", "assignment-999"), 2_000)).toBeNull();
    expect(verifyCheckinToken(`${issued.token}:extra`, 2_000)).toBeNull();
  });
});
