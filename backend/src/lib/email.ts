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

/** Шаблон письма верификации email при регистрации. */
export function buildVerificationEmail(args: {
  userName: string | null;
  verifyUrl: string;
}): { subject: string; html: string; text: string } {
  const greeting = args.userName ? `Привет, ${args.userName}!` : "Привет!";
  const subject = "Подтвердите email в Shiftora";
  const text = [
    greeting,
    "",
    "Подтвердите свой email, перейдя по ссылке:",
    args.verifyUrl,
    "",
    "Если вы не регистрировались в Shiftora — просто проигнорируйте это письмо.",
    "",
    "— Команда Shiftora",
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="ru">
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
               background:#0b0b10;color:#e7e7ee;padding:32px;margin:0;">
    <div style="max-width:520px;margin:0 auto;background:#15151c;border-radius:16px;
                padding:32px;border:1px solid #23232b;">
      <h1 style="font-size:22px;margin:0 0 8px;">Shiftora</h1>
      <p style="margin:0 0 24px;color:#9b9bab;">${greeting}</p>
      <p style="margin:0 0 24px;line-height:1.5;">
        Подтвердите свой email, чтобы завершить регистрацию в Shiftora.
      </p>
      <a href="${args.verifyUrl}"
         style="display:inline-block;background:#7c5cff;color:#fff;
                padding:12px 20px;border-radius:10px;text-decoration:none;
                font-weight:600;">
        Подтвердить email
      </a>
      <p style="margin:24px 0 0;color:#6b6b78;font-size:13px;line-height:1.5;">
        Если кнопка не работает, скопируйте ссылку:<br/>
        <span style="word-break:break-all;color:#9b9bab;">${args.verifyUrl}</span>
      </p>
      <hr style="border:none;border-top:1px solid #23232b;margin:24px 0;"/>
      <p style="margin:0;color:#6b6b78;font-size:12px;">
        Если вы не регистрировались в Shiftora — просто проигнорируйте это письмо.
      </p>
    </div>
  </body>
</html>`.trim();

  return { subject, html, text };
}
