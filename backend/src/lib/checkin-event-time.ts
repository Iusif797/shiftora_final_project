const FUTURE_SKEW_MS = 2 * 60 * 1000;
const AFTER_SHIFT_GRACE_MS = 12 * 60 * 60 * 1000;
const BEFORE_SHIFT_MS = 60 * 60 * 1000;

export type EventTimeErrorCode =
  | "INVALID_CLIENT_TIMESTAMP"
  | "CLIENT_TIMESTAMP_IN_FUTURE"
  | "CLIENT_TIMESTAMP_TOO_OLD"
  | "OUTSIDE_CHECKIN_WINDOW";

export type EventTimeResult =
  | { ok: true; eventTime: Date }
  | { ok: false; code: EventTimeErrorCode; message: string };

export function resolveCheckinEventTime(input: {
  clientTimestamp?: string;
  now?: Date;
  shiftStart: Date;
  shiftEnd: Date;
}): EventTimeResult {
  const now = input.now ?? new Date();
  const eventTime = input.clientTimestamp ? new Date(input.clientTimestamp) : now;

  if (Number.isNaN(eventTime.getTime())) {
    return {
      ok: false,
      code: "INVALID_CLIENT_TIMESTAMP",
      message: "Invalid clientTimestamp",
    };
  }

  if (eventTime.getTime() - now.getTime() > FUTURE_SKEW_MS) {
    return {
      ok: false,
      code: "CLIENT_TIMESTAMP_IN_FUTURE",
      message: "clientTimestamp cannot be more than 2 minutes in the future",
    };
  }

  const earliestAllowed = new Date(input.shiftStart.getTime() - BEFORE_SHIFT_MS);
  const latestAllowed = new Date(input.shiftEnd.getTime() + AFTER_SHIFT_GRACE_MS);

  if (eventTime < earliestAllowed || eventTime > latestAllowed) {
    return {
      ok: false,
      code: "CLIENT_TIMESTAMP_TOO_OLD",
      message: "clientTimestamp is outside the allowed sync window for this shift",
    };
  }

  if (eventTime > input.shiftEnd) {
    return {
      ok: false,
      code: "OUTSIDE_CHECKIN_WINDOW",
      message: "Check-in is only available from 60 minutes before the shift until it ends",
    };
  }

  return { ok: true, eventTime };
}

export function resolveCheckoutEventTime(input: {
  clientTimestamp?: string;
  now?: Date;
  checkinTime: Date;
}): EventTimeResult {
  const now = input.now ?? new Date();
  const eventTime = input.clientTimestamp ? new Date(input.clientTimestamp) : now;

  if (Number.isNaN(eventTime.getTime())) {
    return {
      ok: false,
      code: "INVALID_CLIENT_TIMESTAMP",
      message: "Invalid clientTimestamp",
    };
  }

  if (eventTime.getTime() - now.getTime() > FUTURE_SKEW_MS) {
    return {
      ok: false,
      code: "CLIENT_TIMESTAMP_IN_FUTURE",
      message: "clientTimestamp cannot be more than 2 minutes in the future",
    };
  }

  if (eventTime.getTime() < input.checkinTime.getTime() - FUTURE_SKEW_MS) {
    return {
      ok: false,
      code: "CLIENT_TIMESTAMP_TOO_OLD",
      message: "Checkout time cannot be before check-in",
    };
  }

  return { ok: true, eventTime };
}
