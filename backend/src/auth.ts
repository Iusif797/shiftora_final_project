import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { Resend } from "resend";
import { prisma } from "./prisma";
import { env } from "./env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BACKEND_URL,

  trustedOrigins: [
    "vibecode://*/*",
    "exp://*/*",
    "shiftora://*/*",
    "http://localhost:*",
    "http://127.0.0.1:*",
    "http://192.168.*:*",
    "https://*.dev.vibecode.run",
    "https://*.vibecode.run",
    "https://*.vibecodeapp.com",
    "https://*.vibecode.dev",
    "https://vibecode.dev",
  ],

  plugins: [
    expo(),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "sign-in") return;

        if (!resend) {
          throw new Error("RESEND_API_KEY is not set. Get a free key at https://resend.com/api-keys");
        }

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#0d0d14 0%,#070711 100%);min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Shiftora</span>
            </td>
          </tr>
          <tr>
            <td style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:40px 32px;box-shadow:0 8px 32px rgba(0,0,0,0.4);">
              <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#ffffff;">Your login code</p>
              <p style="margin:0 0 28px;font-size:14px;color:rgba(255,255,255,0.5);line-height:1.5;">Enter this code in the app to sign in</p>
              <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
                <span style="font-size:32px;font-weight:700;color:#ffffff;letter-spacing:8px;font-variant-numeric:tabular-nums;">${otp}</span>
              </div>
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.4);">Code expires in 10 minutes</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:32px;">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.3);">If you didn't request this code, you can ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        try {
          const { error } = await resend.emails.send({
            from: "Shiftora <onboarding@resend.dev>",
            to: email,
            subject: "Your Shiftora login code",
            html,
          });

          if (error) {
            console.error("[auth] Resend error:", error);
            const msg = String(error.message || "");
            if (msg.includes("own email") || msg.includes("verify a domain")) {
              if (env.NODE_ENV === "development") {
                console.log(`[auth] DEV: OTP for ${email} = ${otp}`);
                return;
              }
              throw new Error(
                "Email sending is limited. Add and verify your domain at resend.com/domains"
              );
            }
            throw new Error(error.message || "Failed to send OTP");
          }
        } catch (err) {
          console.error("[auth] sendVerificationOTP failed:", err);
          throw err;
        }
      },
    }),
  ],

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
