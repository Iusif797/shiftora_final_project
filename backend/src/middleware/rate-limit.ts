import { type Context, type Next } from "hono";
import { createHash } from "node:crypto";
import { env } from "../env";
import { prisma } from "../prisma";

type RateLimitOptions = {
  scope?: string;
  identity?: (c: Context) => string | null | undefined;
};
const memoryStore = new Map<string, { count: number; resetAt: Date }>();
let lastDatabaseCleanup = 0;
let lastDegradedLog = 0;

function consumeMemoryBucket(key: string, resetAt: Date) {
  const current = memoryStore.get(key);
  if (!current || current.resetAt <= new Date()) {
    const created = { count: 1, resetAt };
    memoryStore.set(key, created);
    return created;
  }
  current.count += 1;
  return current;
}

/**
 * Счётчик лимитов недоступен (обычно — провал Postgres / пула Supabase).
 * Пишем в лог не чаще раза в минуту, чтобы падение БД не залило логи.
 */
function logDegraded(error: unknown) {
  const now = Date.now();
  if (now - lastDegradedLog < 60_000) return;
  lastDegradedLog = now;
  console.error(
    "[rate-limit] счётчик лимитов недоступен, переходим на счёт в памяти (fail-open):",
    error instanceof Error ? error.message : error,
  );
}

function clientAddress(c: Context): string {
  if (env.TRUST_PROXY_HEADERS !== "true") return "untrusted-proxy";
  return (
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    "unknown"
  );
}

function bucketKey(c: Context, options: RateLimitOptions): string {
  const identity = options.identity?.(c) ?? clientAddress(c);
  const routeScope = options.scope ?? new URL(c.req.url).pathname;
  return createHash("sha256")
    .update(`${env.BETTER_AUTH_SECRET}:${identity}:${routeScope}`)
    .digest("hex");
}

export function rateLimit(
  maxRequests: number,
  windowMs: number,
  options: RateLimitOptions = {},
) {
  return async (c: Context, next: Next) => {
    const key = bucketKey(c, options);
    const resetAt = new Date(Date.now() + windowMs);
    let entry: { count: number; resetAt: Date } | undefined;
    try {
      const rows = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
        INSERT INTO "RateLimitBucket" ("key", "count", "resetAt", "updatedAt")
        VALUES (${key}, 1, ${resetAt}, NOW())
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE
            WHEN "RateLimitBucket"."resetAt" <= NOW() THEN 1
            ELSE "RateLimitBucket"."count" + 1
          END,
          "resetAt" = CASE
            WHEN "RateLimitBucket"."resetAt" <= NOW() THEN ${resetAt}
            ELSE "RateLimitBucket"."resetAt"
          END,
          "updatedAt" = NOW()
        RETURNING "count", "resetAt"
      `;
      entry = rows[0];
      if (Date.now() - lastDatabaseCleanup > 60 * 60 * 1000) {
        lastDatabaseCleanup = Date.now();
        void prisma.rateLimitBucket
          .deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
          .catch(() => {});
      }
    } catch (error) {
      // FAIL-OPEN. Раньше в production ошибка пробрасывалась наружу, и любая
      // икота Postgres превращалась в 500 на всех /api/auth/* — то есть никто
      // не мог войти. Заблокировать вход всем из-за недоступного счётчика
      // лимитов хуже, чем на минуту считать лимит только в памяти процесса:
      // сами лимиты выставлены с большим запасом.
      logDegraded(error);
      entry = consumeMemoryBucket(key, resetAt);
      c.header("RateLimit-Degraded", "in-memory");
    }
    const remaining = Math.max(0, maxRequests - (entry?.count ?? maxRequests));
    const retryAfter = Math.max(
      0,
      Math.ceil(((entry?.resetAt ?? resetAt).getTime() - Date.now()) / 1000),
    );
    c.header("RateLimit-Limit", String(maxRequests));
    c.header("RateLimit-Remaining", String(remaining));
    c.header("RateLimit-Reset", String(retryAfter));

    if ((entry?.count ?? 0) > maxRequests) {
      c.header("Retry-After", String(retryAfter));
      return c.json(
        { error: { message: "Too many requests", code: "RATE_LIMITED" } },
        429,
      );
    }

    return next();
  };
}
