import { Resend } from "resend";
import { env } from "../env";
import { logger } from "./logger";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (_resend) return _resend;
  _resend = new Resend(env.RESEND_API_KEY);
  return _resend;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Универсальный отправитель писем через Resend.
 *
 * Поведение, когда RESEND_API_KEY не задан:
 *   • письмо НЕ отправляется, но и ошибки не бросается — в логах warn;
 *   • это позволяет деплоить бэк без Resend (например, для первого smoke-деплоя
 *     на Render), а в auth.ts email-верификация автоматически отключается,
 *     если ключа нет.
 *
 * Когда добавите RESEND_API_KEY в env — отправка включается без перезапуска кода
 * (Resend клиент создаётся лениво при первом вызове).
 */
export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  const resend = getResend();
  if (!resend) {
    logger.warn(
      { to, subject, env: env.NODE_ENV },
      "[email-stub] RESEND_API_KEY не задан — письмо не отправлено",
    );
    logger.debug({ html: html.slice(0, 200) }, "[email-stub] preview");
    return { id: "stub" };
  }

  const result = await resend.emails.send({
    from: env.FROM_EMAIL,
    to,
    subject,
    html,
    text,
  });

  if (result.error) {
    logger.error({ err: result.error, to }, "Failed to send email via Resend");
    throw new Error(`Resend error: ${result.error.message}`);
  }

  logger.info({ to, subject, id: result.data?.id }, "Email sent");
  return { id: result.data?.id ?? null };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[char] ?? char;
  });
}

/** Шаблон письма верификации email при регистрации. */
export function buildVerificationEmail(args: {
  userName: string | null;
  verifyUrl: string;
}): { subject: string; html: string; text: string } {
  const safeName = args.userName ? escapeHtml(args.userName) : null;
  const safeUrl = escapeHtml(args.verifyUrl);
  const greeting = safeName ? `Hello, ${safeName}!` : "Hello!";
  const subject = "Verify your Shiftora email";
  const text = [
    args.userName ? `Hello, ${args.userName}!` : "Hello!",
    "",
    "Verify your email by opening this link:",
    args.verifyUrl,
    "",
    "If you did not create a Shiftora account, you can ignore this email.",
    "",
    "— Shiftora",
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
               background:#0b0b10;color:#e7e7ee;padding:32px;margin:0;">
    <div style="max-width:520px;margin:0 auto;background:#15151c;border-radius:16px;
                padding:32px;border:1px solid #23232b;">
      <h1 style="font-size:22px;margin:0 0 8px;">Shiftora</h1>
      <p style="margin:0 0 24px;color:#9b9bab;">${greeting}</p>
      <p style="margin:0 0 24px;line-height:1.5;">
        Verify your email to finish setting up your Shiftora account.
      </p>
      <a href="${safeUrl}"
         style="display:inline-block;background:#7c5cff;color:#fff;
                padding:12px 20px;border-radius:10px;text-decoration:none;
                font-weight:600;">
        Verify email
      </a>
      <p style="margin:24px 0 0;color:#6b6b78;font-size:13px;line-height:1.5;">
        If the button does not work, copy this link:<br/>
        <span style="word-break:break-all;color:#9b9bab;">${safeUrl}</span>
      </p>
      <hr style="border:none;border-top:1px solid #23232b;margin:24px 0;"/>
      <p style="margin:0;color:#6b6b78;font-size:12px;">
        If you did not create a Shiftora account, you can ignore this email.
      </p>
    </div>
  </body>
</html>`.trim();

  return { subject, html, text };
}

export function buildPasswordResetEmail(args: {
  userName: string | null;
  resetUrl: string;
}): { subject: string; html: string; text: string } {
  const safeName = args.userName ? escapeHtml(args.userName) : null;
  const safeUrl = escapeHtml(args.resetUrl);
  const greeting = safeName ? `Hello, ${safeName}!` : "Hello!";
  const subject = "Reset your Shiftora password";
  const text = [
    args.userName ? `Hello, ${args.userName}!` : "Hello!",
    "",
    "Reset your password using this link (valid for 60 minutes):",
    args.resetUrl,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0b0b10;color:#e7e7ee;padding:32px;margin:0;">
    <div style="max-width:520px;margin:0 auto;background:#15151c;border-radius:16px;padding:32px;border:1px solid #23232b;">
      <h1 style="font-size:22px;margin:0 0 8px;">Shiftora</h1>
      <p style="margin:0 0 24px;color:#9b9bab;">${greeting}</p>
      <p style="margin:0 0 24px;line-height:1.5;">Use the button below to reset your password. This link expires in 60 minutes.</p>
      <a href="${safeUrl}" style="display:inline-block;background:#fff;color:#000;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;">Reset password</a>
      <p style="margin:24px 0 0;color:#6b6b78;font-size:13px;line-height:1.5;">If the button does not work, copy this link:<br/><span style="word-break:break-all;color:#9b9bab;">${safeUrl}</span></p>
      <hr style="border:none;border-top:1px solid #23232b;margin:24px 0;"/>
      <p style="margin:0;color:#6b6b78;font-size:12px;">If you did not request a password reset, you can ignore this email.</p>
    </div>
  </body>
</html>`.trim();

  return { subject, html, text };
}
