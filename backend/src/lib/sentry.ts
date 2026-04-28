import * as Sentry from "@sentry/bun";
import { env } from "../env";

let initialized = false;

/**
 * Инициализация Sentry на бэкенде.
 *
 * Безопасно вызывать многократно — повторные вызовы no-op.
 * Если SENTRY_DSN не задан, Sentry просто не активируется
 * (вызовы Sentry.captureException становятся no-op).
 */
export function initSentry() {
  if (initialized) return;
  if (!env.SENTRY_DSN) return;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    // 10% перформанс-трейсинга в проде, 100% — в dev
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Не собираем PII по умолчанию
    sendDefaultPii: false,
    // Игнорируем шумные ошибки
    ignoreErrors: [
      "RATE_LIMITED",
      // Better Auth бросает на невалидных сессиях — это норма, не ошибка
      "INVALID_SESSION",
    ],
  });

  initialized = true;
}

export { Sentry };
