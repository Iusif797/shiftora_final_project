/**
 * Регрессионный тест: rate-limiter не должен ронять запросы, когда счётчик
 * лимитов недоступен (провал Postgres / пула Supabase).
 *
 * До исправления в src/middleware/rate-limit.ts было:
 *     if (env.NODE_ENV === "production") throw error;
 * то есть любая икота БД превращалась в 500 на всех /api/auth/* — войти не мог
 * никто. В истории репозитория это уже случалось: коммит 44d3a61
 * «transient supabase pooler outage».
 *
 * Имя файла начинается с `zz-`, чтобы `bun test` запускал его ПОСЛЕДНИМ:
 * mock.module в Bun действует на весь процесс, и подменённый prisma не должен
 * доставаться соседним тестам.
 *
 * Запуск: cd backend && bun test tests/zz-rate-limit-fail-open.test.ts
 */
import { describe, it, expect, mock } from "bun:test";
import { readFileSync } from "node:fs";
import { Hono } from "hono";

let queryAttempts = 0;

// БД недоступна — любое обращение к счётчику падает.
mock.module("../src/prisma", () => ({
  prisma: {
    $queryRaw: () => {
      queryAttempts += 1;
      return Promise.reject(
        new Error("Can't reach database server at pooler.supabase.com:6543"),
      );
    },
    rateLimitBucket: {
      deleteMany: () => Promise.reject(new Error("db down")),
    },
  },
}));

const { rateLimit } = await import("../src/middleware/rate-limit");

let scopeCounter = 0;
function makeApp(max = 120, windowMs = 60_000) {
  // Отдельная identity на каждый тест: TRUST_PROXY_HEADERS в тестах = false,
  // поэтому по IP все запросы попали бы в одну корзину.
  const identity = `test-client-${(scopeCounter += 1)}`;
  const app = new Hono();
  app.use(
    "/api/auth/*",
    rateLimit(max, windowMs, { scope: "auth-general", identity: () => identity }),
  );
  app.get("/api/auth/get-session", (c) => c.json({ data: { session: null } }));
  return app;
}

const call = (app: Hono) =>
  app.fetch(new Request("http://localhost/api/auth/get-session"));

describe("rate-limit: fail-open при недоступной БД", () => {
  it("пропускает запрос вместо 500, когда счётчик лимитов недоступен", async () => {
    const app = makeApp();
    const before = queryAttempts;
    const res = await call(app);

    expect(queryAttempts).toBe(before + 1); // БД реально дёргали, и она упала
    expect(res.status).toBe(200); // и запрос всё равно прошёл
    expect(res.headers.get("RateLimit-Degraded")).toBe("in-memory");
    expect(await res.json()).toEqual({ data: { session: null } });
  });

  it("при недоступной БД лимит продолжает считаться в памяти процесса", async () => {
    const app = makeApp(3, 60_000);
    const codes: number[] = [];
    for (let i = 0; i < 5; i += 1) codes.push((await call(app)).status);
    // Первые 3 проходят, дальше 429 — а не 500.
    expect(codes).toEqual([200, 200, 200, 429, 429]);
    expect(codes).not.toContain(500);
  });

  it("падение БД не роняет весь поток входа", async () => {
    const app = makeApp();
    const results = await Promise.all(Array.from({ length: 10 }, () => call(app)));
    expect(results.every((r) => r.status === 200)).toBe(true);
  });

  it("в production ошибка счётчика больше не пробрасывается наружу", () => {
    // Прямая защита от возврата снятой строки: тесты идут не в NODE_ENV=production,
    // поэтому проверяем сам код — ветки «в проде бросаем» быть не должно.
    const source = readFileSync(
      new URL("../src/middleware/rate-limit.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(/NODE_ENV\s*===\s*"production"\s*\)\s*throw/);
    expect(source).toContain("consumeMemoryBucket(key, resetAt)");
  });
});
