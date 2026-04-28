import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { env } from "./env";
import { sendEmail, buildVerificationEmail } from "./lib/email";
import { logger } from "./lib/logger";

// trustedOrigins строится из явного ALLOWED_ORIGIN + dev-схем для Expo / localhost.
// Хардкод *.railway.app/.fly.dev и т.п. убран — origin приложения должен задаваться
// через env, а не зашитым списком провайдеров.
function buildTrustedOrigins(): string[] {
  const fromEnv = env.ALLOWED_ORIGIN
    ? env.ALLOWED_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
    : [];

  const devSchemes = [
    "shiftora://*/*",
    "exp://*/*",
    "vibecode://*/*",
    "http://localhost:*",
    "http://127.0.0.1:*",
    "http://192.168.*:*",
  ];

  return [...fromEnv, ...devSchemes];
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BACKEND_URL,
  user: {
    additionalFields: {
      role: { type: "string", input: false },
      restaurantId: { type: "string", input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    // Требуем email-верификацию только если в окружении задан RESEND_API_KEY —
    // иначе письмо отправить нечем, и sign-up намертво залипнет на "verify email".
    // Когда добавите ключ в Render env, верификация включится автоматически.
    requireEmailVerification:
      env.NODE_ENV === "production" && Boolean(env.RESEND_API_KEY),
  },
  emailVerification: {
    sendOnSignUp: Boolean(env.RESEND_API_KEY),
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      try {
        const { subject, html, text } = buildVerificationEmail({
          userName: user.name ?? null,
          verifyUrl: url,
        });
        await sendEmail({ to: user.email, subject, html, text });
      } catch (err) {
        // Не валим регистрацию, если письмо не ушло — пользователь сможет запросить повторно.
        logger.error({ err, email: user.email }, "Failed to send verification email");
      }
    },
  },

  trustedOrigins: buildTrustedOrigins(),

  plugins: [expo()],

  advanced: {
    trustedProxyHeaders: true,
    disableCSRFCheck: true,
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      partitioned: true,
    },
  },
});
