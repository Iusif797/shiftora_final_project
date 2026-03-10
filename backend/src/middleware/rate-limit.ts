import { type Context, type Next } from "hono";

const store = new Map<string, { count: number; resetAt: number }>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, value] of store) {
    if (value.resetAt < now) store.delete(key);
  }
}

export function rateLimit(maxRequests: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    cleanup();

    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
      ?? c.req.header("x-real-ip")
      ?? "unknown";
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
