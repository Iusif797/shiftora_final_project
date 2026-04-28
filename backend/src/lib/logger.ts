import pino from "pino";
import { env } from "../env";

const isProduction = env.NODE_ENV === "production";

/**
 * Структурированный логгер.
 *
 * - Production: JSON-логи в stdout (удобно парсить в CloudWatch/Datadog/Loki).
 * - Development: pino-pretty для читаемого вывода.
 *
 * Уровень задаётся через env LOG_LEVEL (по умолчанию: debug в dev, info в prod).
 *
 * Использование:
 *   logger.info({ userId }, "User signed in")
 *   logger.error({ err }, "Failed to send email")
 */
export const logger = pino({
  level: env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  base: {
    service: "shiftora-backend",
    env: env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    // Не выводим в логи секреты, если кто-то случайно положит их в payload.
    paths: [
      "password",
      "*.password",
      "token",
      "*.token",
      "authorization",
      "*.authorization",
      "cookie",
      "*.cookie",
      "BETTER_AUTH_SECRET",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "RESEND_API_KEY",
      "GEMINI_API_KEY",
    ],
    censor: "[REDACTED]",
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss.l",
            ignore: "pid,hostname,service,env",
          },
        },
      }),
});

/** Создать child-логгер с дополнительным контекстом (request_id, user_id и т.п.) */
export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
