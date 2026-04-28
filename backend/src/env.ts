import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().optional().default("3000"),
  NODE_ENV: z.string().optional().default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  BACKEND_URL: z.string().optional().default("http://localhost:3000"),
  FRONTEND_URL: z.string().optional().default("http://localhost:8081"),
  ALLOWED_ORIGIN: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .optional(),
  GEMINI_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRO_PRICE_ID: z.string().optional(),
  STRIPE_BUSINESS_PRICE_ID: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().optional().default("Shiftora <noreply@example.com>"),
  // Явный флаг включения email-верификации. По умолчанию off, чтобы существующие
  // аккаунты не оказались заблокированы при первом деплое. Включайте, когда
  // готовы рассылать письма (нужен RESEND_API_KEY) и точно знаете, что у всех
  // юзеров emailVerified=true (либо готовы их вручную пометить).
  EMAIL_VERIFICATION_REQUIRED: z
    .enum(["true", "false"])
    .optional()
    .default("false"),
});

function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);

    // Production safety checks: переменные опциональны на уровне схемы,
    // но в production некоторые из них критичны.
    if (parsed.NODE_ENV === "production") {
      const warnings: string[] = [];
      if (!parsed.ALLOWED_ORIGIN) {
        warnings.push(
          "ALLOWED_ORIGIN не задан — все cross-origin запросы будут отклонены."
        );
      }
      if (!parsed.SENTRY_DSN) {
        warnings.push("SENTRY_DSN не задан — ошибки бэкенда не будут трекаться.");
      }
      if (!parsed.RESEND_API_KEY) {
        warnings.push(
          "RESEND_API_KEY не задан — email-верификация и приглашения работать не будут."
        );
      }
      if (parsed.BETTER_AUTH_SECRET.length < 32) {
        warnings.push(
          "BETTER_AUTH_SECRET короче 32 символов — слабый секрет для production."
        );
      }
      if (warnings.length > 0) {
        console.warn("[env] production warnings:");
        warnings.forEach((w) => console.warn(`  - ${w}`));
      }
    }

    console.log("Environment validated successfully");
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Environment variable validation failed:");
      error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

export const env = validateEnv();
export type Env = z.infer<typeof envSchema>;
