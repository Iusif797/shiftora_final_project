import { describe, expect, it } from "bun:test";
import {
  resolveCheckinEventTime,
  resolveCheckoutEventTime,
} from "../src/lib/checkin-event-time";

describe("resolveCheckinEventTime", () => {
  const shiftStart = new Date("2026-07-22T12:00:00.000Z");
  const shiftEnd = new Date("2026-07-22T20:00:00.000Z");
  const now = new Date("2026-07-22T21:00:00.000Z");

  it("accepts delayed sync when clientTimestamp is inside the shift window", () => {
    const result = resolveCheckinEventTime({
      clientTimestamp: "2026-07-22T12:10:00.000Z",
      now,
      shiftStart,
      shiftEnd,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.eventTime.toISOString()).toBe("2026-07-22T12:10:00.000Z");
    }
  });

  it("rejects timestamps more than 2 minutes in the future", () => {
    const result = resolveCheckinEventTime({
      clientTimestamp: "2026-07-22T21:05:00.000Z",
      now,
      shiftStart,
      shiftEnd,
    });
    expect(result).toEqual({
      ok: false,
      code: "CLIENT_TIMESTAMP_IN_FUTURE",
      message: "clientTimestamp cannot be more than 2 minutes in the future",
    });
  });

  it("rejects check-in after shift end", () => {
    const result = resolveCheckinEventTime({
      clientTimestamp: "2026-07-22T20:30:00.000Z",
      now: new Date("2026-07-22T20:31:00.000Z"),
      shiftStart,
      shiftEnd,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("OUTSIDE_CHECKIN_WINDOW");
  });
});

describe("resolveCheckoutEventTime", () => {
  it("rejects checkout before check-in", () => {
    const result = resolveCheckoutEventTime({
      clientTimestamp: "2026-07-22T11:00:00.000Z",
      checkinTime: new Date("2026-07-22T12:00:00.000Z"),
      now: new Date("2026-07-22T13:00:00.000Z"),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("CLIENT_TIMESTAMP_TOO_OLD");
  });
});
