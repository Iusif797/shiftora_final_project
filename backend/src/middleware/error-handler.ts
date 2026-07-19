import { type Context } from "hono";
import { type ContentfulStatusCode } from "hono/utils/http-status";
import { logger } from "../lib/logger";
import { Sentry } from "../lib/sentry";

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
  // AppError — наши собственные ошибки с известным статусом и кодом.
  // Их не отправляем в Sentry (это бизнес-ошибки, не баги), только в debug-лог.
  if (err instanceof AppError) {
    logger.debug(
      { statusCode: err.statusCode, code: err.code, path: c.req.path },
      err.message,
    );
    return c.json(
      { error: { message: err.message, code: err.code ?? "APP_ERROR" } },
      err.statusCode as ContentfulStatusCode,
    );
  }

  // Непредвиденные ошибки — баги. Логируем и отправляем в Sentry.
  logger.error(
    {
      err: { message: err.message, stack: err.stack, name: err.name },
      method: c.req.method,
      path: c.req.path,
    },
    "Unhandled error",
  );

  try {
    Sentry.captureException(err, {
      tags: { path: c.req.path, method: c.req.method },
    });
  } catch {
    // Sentry не должен ломать обработку ошибок, если что-то пошло не так.
  }

  return c.json(
    { error: { message: "Internal server error", code: "INTERNAL_ERROR" } },
    500,
  );
}
