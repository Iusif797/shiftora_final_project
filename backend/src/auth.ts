import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { expo } from "@better-auth/expo";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { env } from "./env";
import { sendEmail, buildPasswordResetEmail, buildVerificationEmail } from "./lib/email";
import { logger } from "./lib/logger";

// trustedOrigins строится из явного ALLOWED_ORIGIN + dev-схем для Expo / localhost.
// Хардкод *.railway.app/.fly.dev и т.п. убран — origin приложения должен задаваться
// через env, а не зашитым списком провайдеров.
function buildTrustedOrigins(): string[] {
  const fromEnv = env.ALLOWED_ORIGIN
    ? env.ALLOWED_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
    : [];

  const appSchemes = ["shiftora://", "shiftora://*", "shiftora://**"];
  if (env.NODE_ENV === "production") return [...fromEnv, ...appSchemes];

  return [
    ...fromEnv,
    ...appSchemes,
    "exp://",
    "exp://**",
    "vibecode://",
    "vibecode://**",
    "http://localhost:*",
    "http://127.0.0.1:*",
    "http://192.168.*:*",
  ];
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
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const employee = await prisma.employee.findUnique({
            where: { userId: session.userId },
            select: { isActive: true },
          });
          if (employee && !employee.isActive) {
            throw new APIError("FORBIDDEN", {
              message: "This workspace account has been deactivated",
            });
          }
          return { data: session };
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      const message = buildPasswordResetEmail({
        userName: user.name ?? null,
        resetUrl: url,
      });
      void sendEmail({ to: user.email, ...message }).catch((err) => {
        logger.error({ err, email: user.email }, "Failed to send password reset email");
      });
    },
    // Email-верификация включается ТОЛЬКО явным env-флагом EMAIL_VERIFICATION_REQUIRED=true.
    // Это предотвращает ситуацию, когда существующие пользователи (созданные до
    // включения проверки) оказываются заблокированы при логине из-за emailVerified=false.
    requireEmailVerification: env.EMAIL_VERIFICATION_REQUIRED === "true",
  },
  emailVerification: {
    // Письма с подтверждением шлём только если есть RESEND_API_KEY И флаг включён.
    sendOnSignUp:
      env.EMAIL_VERIFICATION_REQUIRED === "true" && Boolean(env.RESEND_API_KEY),
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
    trustedProxyHeaders: env.TRUST_PROXY_HEADERS === "true",
    disableCSRFCheck: false,
    defaultCookieAttributes: {
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      secure: env.NODE_ENV === "production",
      partitioned: false,
    },
  },
});
