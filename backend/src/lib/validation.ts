import type { Context, Next } from "hono";
import { env } from "../env";

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isAllowedOrigin(origin: string): boolean {
  if (origin === "shiftora://" || origin.startsWith("shiftora://")) {
    return true;
  }
  const allowed = new Set(
    (env.ALLOWED_ORIGIN ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  return allowed.has(origin);
}

// Гарантирует, что state-changing запросы с телом приходят как application/json.
// Блокирует CSRF-подобные drive-by запросы через HTML-формы (text/plain,
// multipart, urlencoded) — они проходят без CORS-preflight и несут сессионную
// куку жертвы (cookies выставлены SameSite=None). Better Auth и Stripe webhook
// исключены: у них собственный формат тела/подписи.
export async function contentTypeGuard(c: Context, next: Next) {
  if (!STATE_CHANGING.has(c.req.method)) return next();

  const path = c.req.path;
  const externallyVerified =
    path.startsWith("/api/auth") || path === "/api/billing/webhook";
  if (externallyVerified) return next();

  const origin = c.req.header("origin");
  if (origin && env.NODE_ENV === "production" && !isAllowedOrigin(origin)) {
    return c.json(
      { error: { message: "Origin is not allowed", code: "INVALID_ORIGIN" } },
      403,
    );
  }

  if (path === "/api/upload" && c.req.method === "POST") {
    const uploadContentType = c.req.header("content-type")?.toLowerCase() ?? "";
    if (!uploadContentType.startsWith("multipart/form-data;")) {
      return c.json(
        { error: { message: "Unsupported Media Type", code: "INVALID_CONTENT_TYPE" } },
        415,
      );
    }
    return next();
  }

  if (c.req.method === "DELETE") return next();

  const contentType = c.req.header("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return c.json(
      { error: { message: "Unsupported Media Type", code: "INVALID_CONTENT_TYPE" } },
      415,
    );
  }

  return next();
}

// Приводит ошибки @hono/zod-validator к контракту { error: { message, code } }.
// По умолчанию zValidator отдаёт сырой { success:false, error: ZodError },
// который ломает клиентский разбор (mobile ждёт { data } | { error }).
export async function validationErrorNormalizer(c: Context, next: Next) {
  await next();

  if (c.res.status !== 400) return;
  const contentType = c.res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return;

  let body: unknown;
  try {
    body = await c.res.clone().json();
  } catch {
    return;
  }

  if (
    body &&
    typeof body === "object" &&
    (body as { success?: unknown }).success === false
  ) {
    const zodError = (body as { error?: { issues?: { message?: string }[] } }).error;
    const message = zodError?.issues?.[0]?.message ?? "Invalid input";
    c.res = Response.json(
      { error: { message, code: "VALIDATION_ERROR" } },
      { status: 400 },
    );
  }
}
