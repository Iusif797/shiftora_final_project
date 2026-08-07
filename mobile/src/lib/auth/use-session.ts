import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { authClient, SESSION_CACHE_KEY } from "./auth-client";

export const SESSION_QUERY_KEY = ['auth-session'] as const;

/** Таймаут одной попытки. Холодный старт RN + холодный инстанс Render не влезали в 10 с. */
export const SESSION_TIMEOUT_MS = 20000;
/** Всего попыток: первая + 3 повтора. */
export const SESSION_MAX_ATTEMPTS = 4;
/** Экспоненциальная пауза между попытками: 0.7 с, 1.4 с, 2.8 с. */
export const SESSION_RETRY_BASE_MS = 700;
/** Через сколько перепроверить сессию, если отдали сохранённую (фоновая ревалидация). */
export const STALE_SESSION_REVALIDATE_MS = 15000;

type SessionResult = Awaited<ReturnType<typeof authClient.getSession>>['data'];

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Session check timeout')), ms);
    }),
  ]);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Сессия, сохранённая плагином @better-auth/expo в SecureStore после последнего
 * успешного /get-session. Читается синхронно, поэтому годится как initialData.
 * Возвращает null, если записи нет, она повреждена или срок сессии истёк.
 */
export function readStoredSession(): SessionResult | null {
  try {
    const raw = SecureStore.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      user?: { id?: string };
      session?: { id?: string; expiresAt?: string };
    } | null;
    if (!parsed?.user?.id || !parsed?.session?.id) return null;
    const expiresAt = parsed.session.expiresAt
      ? new Date(parsed.session.expiresAt).getTime()
      : NaN;
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
    return parsed as SessionResult;
  } catch {
    return null;
  }
}

/**
 * Запрос сессии с повторами и экспоненциальной паузой.
 *
 * Раньше здесь не было ни одного повтора: любой потерянный пакет, переключение
 * Wi-Fi↔LTE, не поднявшийся сетевой стек при холодном старте или разовая 500
 * мгновенно и полностью блокировали приложение экраном «попробовать снова».
 * 401/403 — это ответ сервера, а не сбой связи; повторять их бессмысленно.
 */
export async function fetchSessionWithRetry(): Promise<SessionResult | null> {
  let lastError: unknown;

  for (let attempt = 0; attempt < SESSION_MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await withTimeout(authClient.getSession(), SESSION_TIMEOUT_MS);
      const status = result.error?.status;
      if (result.error && status !== 401 && status !== 403) {
        throw new Error(result.error.message ?? 'Session check failed');
      }
      return result.data ?? null;
    } catch (error) {
      lastError = error;
      if (attempt < SESSION_MAX_ATTEMPTS - 1) {
        await sleep(SESSION_RETRY_BASE_MS * 2 ** attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Session check failed');
}

/**
 * Опции запроса сессии. Вынесены из хука, чтобы поведение (повторы, запасная
 * сессия, фоновая ревалидация) можно было прогнать тестом без рендера React.
 */
export function sessionQueryOptions(queryClient: Pick<QueryClient, 'invalidateQueries'>) {
  return {
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      try {
        return await fetchSessionWithRetry();
      } catch (error) {
        // Сервер недоступен. Если в SecureStore лежит непросроченная сессия —
        // отдаём её, чтобы вошедший человек не упирался в экран «попробовать
        // снова» из-за секундного провала сети, и перепроверяем её в фоне.
        const stored = readStoredSession();
        if (stored) {
          setTimeout(() => {
            void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
          }, STALE_SESSION_REVALIDATE_MS);
          return stored;
        }
        throw error;
      }
    },
    // Мгновенный старт из сохранённой сессии; updatedAt=0 помечает её
    // устаревшей, поэтому react-query сразу же обновляет её в фоне.
    initialData: readStoredSession,
    initialDataUpdatedAt: 0,
    staleTime: 1000 * 60 * 5,
    retry: 0,
  };
}

export const useSession = () => {
  const queryClient = useQueryClient();
  return useQuery(sessionQueryOptions(queryClient));
};

export const useInvalidateSession = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
};
