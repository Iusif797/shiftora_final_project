/**
 * Регрессионный тест обработки сессии при провале сети.
 *
 * До исправления в src/lib/auth/use-session.ts стояло `retry: 0` и таймаут 10 с,
 * а сохранённая сессия не использовалась. Один неудачный GET /api/auth/get-session
 * (потерянный пакет, переключение Wi-Fi↔LTE, разовая 500) намертво запирал
 * вошедшего человека на экране «попробовать снова».
 *
 * Тест прогоняет НАСТОЯЩИЙ @tanstack/react-query поверх подменённых
 * authClient и SecureStore — то есть проверяет поведение, а не заглушки.
 *
 * Запуск: cd mobile && bun test tests/use-session.test.ts
 */
import { describe, it, expect, beforeEach, mock } from "bun:test";

// ── подменённый SecureStore ──────────────────────────────────────────────────
const store = new Map<string, string>();
mock.module("expo-secure-store", () => ({
  getItem: (key: string) => store.get(key) ?? null,
  getItemAsync: async (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  setItemAsync: async (key: string, value: string) => void store.set(key, value),
  deleteItemAsync: async (key: string) => void store.delete(key),
}));

// ── подменённый authClient: сеть под нашим контролем ─────────────────────────
let failuresLeft = 0;
let calls = 0;
const freshSession = {
  user: { id: "u-fresh", email: "chief@it-enterprise.pro" },
  session: { id: "s-fresh", expiresAt: new Date(Date.now() + 864e5).toISOString() },
};

mock.module("../src/lib/auth/auth-client", () => ({
  SESSION_STORAGE_PREFIX: "shiftora",
  SESSION_CACHE_KEY: "shiftora_session_data",
  authClient: {
    getSession: async () => {
      calls += 1;
      if (failuresLeft > 0) {
        failuresLeft -= 1;
        throw new TypeError("Network request failed");
      }
      return { data: freshSession, error: null };
    },
  },
}));

const { QueryClient } = await import("@tanstack/react-query");
const mod = await import("../src/lib/auth/use-session");
const { sessionQueryOptions, SESSION_MAX_ATTEMPTS, SESSION_TIMEOUT_MS, readStoredSession } = mod;

const storedSession = {
  user: { id: "u-stored", email: "chief@it-enterprise.pro" },
  session: { id: "s-stored", expiresAt: new Date(Date.now() + 864e5).toISOString() },
};

function run() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: 0, gcTime: 0 } } });
  return qc.fetchQuery(sessionQueryOptions(qc) as any);
}

beforeEach(() => {
  store.clear();
  failuresLeft = 0;
  calls = 0;
});

describe("useSession: устойчивость к провалу сети", () => {
  it("таймаут 20 с и 4 попытки — параметры, а не намерение", () => {
    expect(SESSION_TIMEOUT_MS).toBe(20000);
    expect(SESSION_MAX_ATTEMPTS).toBe(4);
  });

  it("переживает 3 подряд упавших запроса и всё-таки получает сессию", async () => {
    failuresLeft = 3; // столько раз сеть падает, четвёртая попытка проходит
    const data = await run();
    expect(calls).toBe(4);
    expect((data as any)?.user?.id).toBe("u-fresh");
  });

  it("сервер недоступен полностью, но сохранённая сессия есть → человек входит", async () => {
    failuresLeft = Number.MAX_SAFE_INTEGER;
    store.set("shiftora_session_data", JSON.stringify(storedSession));
    const data = await run();
    expect(calls).toBe(SESSION_MAX_ATTEMPTS); // все попытки исчерпаны
    expect((data as any)?.user?.id).toBe("u-stored"); // и всё равно не заблокирован
  });

  it("сервер недоступен и сохранённой сессии нет → честная ошибка (экран «попробовать снова»)", async () => {
    failuresLeft = Number.MAX_SAFE_INTEGER;
    await expect(run()).rejects.toThrow();
  });

  it("просроченная сохранённая сессия запасным вариантом не считается", async () => {
    store.set(
      "shiftora_session_data",
      JSON.stringify({
        user: { id: "u-old" },
        session: { id: "s-old", expiresAt: new Date(Date.now() - 1000).toISOString() },
      }),
    );
    expect(readStoredSession()).toBeNull();
    failuresLeft = Number.MAX_SAFE_INTEGER;
    await expect(run()).rejects.toThrow();
  });

  it("битая запись в SecureStore не роняет чтение", () => {
    store.set("shiftora_session_data", "{не json");
    expect(readStoredSession()).toBeNull();
  });
});
