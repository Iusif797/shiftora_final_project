import { type Context } from "hono";
import { type StatusCode } from "hono/utils/http-status";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json(
      { error: { message: err.message, code: err.code ?? "APP_ERROR" } },
      err.statusCode as StatusCode,
    );
  }

  console.error(`[ERROR] ${err.message}`, err.stack);

  return c.json(
    { error: { message: "Internal server error", code: "INTERNAL_ERROR" } },
    500,
  );
}
