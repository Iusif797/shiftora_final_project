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
  ENABLE_API_DOCS: z.enum(["true", "false"]).optional(),
  TRUST_PROXY_HEADERS: z.enum(["true", "false"]).optional().default("false"),
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
      const errors: string[] = [];
      const warnings: string[] = [];
      if (!parsed.ALLOWED_ORIGIN) {
        errors.push("ALLOWED_ORIGIN must contain the production app origin(s).");
      } else {
        for (const origin of parsed.ALLOWED_ORIGIN.split(",").map((value) => value.trim())) {
          try {
            const url = new URL(origin);
            if (url.protocol !== "https:" || url.origin !== origin) {
              errors.push(`ALLOWED_ORIGIN entry must be an HTTPS origin without a path: ${origin}`);
            }
          } catch {
            errors.push(`ALLOWED_ORIGIN contains an invalid URL: ${origin}`);
          }
        }
      }
      if (!parsed.BACKEND_URL.startsWith("https://")) {
        errors.push("BACKEND_URL must use HTTPS in production.");
      }
      if (!parsed.FRONTEND_URL.startsWith("https://")) {
        errors.push("FRONTEND_URL must use HTTPS in production.");
      }
      if (parsed.TRUST_PROXY_HEADERS !== "true") {
        errors.push(
          "TRUST_PROXY_HEADERS=true is required behind the production reverse proxy for per-client rate limiting.",
        );
      }
      if (!parsed.SENTRY_DSN) {
        warnings.push("SENTRY_DSN не задан — ошибки бэкенда не будут трекаться.");
      }
      if (!parsed.RESEND_API_KEY) {
        errors.push("RESEND_API_KEY is required for verification and password reset email.");
      }
      if (parsed.FROM_EMAIL.includes("example.com")) {
        errors.push("FROM_EMAIL must use a verified production sending domain.");
      }
      if (parsed.STRIPE_SECRET_KEY && !parsed.STRIPE_WEBHOOK_SECRET) {
        errors.push("STRIPE_WEBHOOK_SECRET is required when Stripe is enabled.");
      }
      if (parsed.BETTER_AUTH_SECRET.length < 32) {
        errors.push("BETTER_AUTH_SECRET must be at least 32 characters.");
      }
      if (parsed.EMAIL_VERIFICATION_REQUIRED === "true" && !parsed.RESEND_API_KEY) {
        errors.push(
          "RESEND_API_KEY is required when EMAIL_VERIFICATION_REQUIRED=true.",
        );
      }
      if (errors.length > 0) {
        console.error("[env] invalid production configuration:");
        errors.forEach((message) => console.error(`  - ${message}`));
        process.exit(1);
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
