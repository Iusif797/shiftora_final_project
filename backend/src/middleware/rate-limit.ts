import { type Context, type Next } from "hono";
import { env } from "../env";
import { logger } from "../lib/logger";

/**
 * In-memory rate limiter.
 *
 * ⚠️  ОГРАНИЧЕНИЯ (важно для production):
 *
 *   1. Состояние хранится в памяти процесса — теряется при рестарте/деплое.
 *   2. На нескольких инстансах каждый имеет свой счётчик, поэтому реальный
 *      лимит = N_instances × maxRequests. Защита от brute-force ослабевает.
 *   3. Не работает за CDN / load balancer без правильной передачи x-forwarded-for.
 *
 * Подходит для:
 *   • single-instance деплой (Railway/Render базовый план);
 *   • защита от случайных всплесков (не от целевых атак).
 *
 * TODO перед масштабированием: переехать на Redis (Upstash) или хотя бы
 * хранилище, разделяемое между инстансами (PostgreSQL-таблица с upsert + TTL).
 *
 * См. PRE_LAUNCH_CHECKLIST.md, раздел "Критичные доработки".
 */

const store = new Map<string, { count: number; resetAt: number }>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();
let warnedInProduction = false;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, value] of store) {
    if (value.resetAt < now) store.delete(key);
  }
}

function warnOnceInProduction() {
  if (warnedInProduction) return;
  if (env.NODE_ENV !== "production") return;
  warnedInProduction = true;
  logger.warn(
    {
      hint: "См. PRE_LAUNCH_CHECKLIST.md — для масштабирования нужен Redis",
    },
    "rate-limit: используется in-memory store; не переживает рестарт и не разделяется между инстансами",
  );
}

export function rateLimit(maxRequests: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    warnOnceInProduction();
    cleanup();

    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      "unknown";
    const path = new URL(c.req.url).pathname;
    const key = `${ip}:${path}`;
    const now = Date.now();

    const entry = store.get(key);
    if (!entry || entry.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }

    entry.count++;
    if (entry.count > maxRequests) {
      c.header("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return c.json(
        { error: { message: "Too many requests", code: "RATE_LIMITED" } },
        429,
      );
    }

    await next();
  };
}
