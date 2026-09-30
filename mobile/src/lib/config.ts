/**
 * Единственный источник адреса бэкенда для мобильного приложения.
 *
 * Почему константа-запасной вариант, а не только process.env:
 * переменные EXPO_PUBLIC_* подставляются в бандл во время сборки. Если сборка
 * идёт там, где переменной нет (локальный Xcode без mobile/.env, CI без
 * EAS environment), `process.env.EXPO_PUBLIC_BACKEND_URL` превращается в
 * `undefined`, и приложение уходит в прод с baseUrl "undefined/api/...".
 * Так уже случилось: в iOS-бандле сборки 4 адрес бэкенда отсутствовал
 * полностью (0 вхождений "onrender.com"), потому что окружение EAS `production`
 * не содержало ни одной переменной.
 *
 * Адрес не является секретом — он уже лежит в репозитории в mobile/.env.example.
 *
 * 2026-08-16: адрес переведён со стороннего хостинга (Render, аккаунт внешнего
 * автора) на наш собственный бэкенд. Публичный адрес выдаёт nginx на ops:
 * https://api.shiftora.it-enterprise.cloud -> 127.0.0.1:3011 (shiftora-nase-api).
 * Домен .cloud — по доменной политике это «наши облачные сервисы».
 *
 * ВАЖНО: базовый адрес — это ГОЛЫЙ origin без пути. Префикс /api дописывает
 * каждый вызов в src/lib/api/api.ts. Если сюда попадёт значение с хвостом
 * "/api", все запросы уедут на /api/api/... и приложение молча ляжет.
 */
const DEFAULT_BACKEND_URL = "https://api.shiftora.it-enterprise.cloud";

const fromEnv = process.env.EXPO_PUBLIC_BACKEND_URL;

export const BACKEND_URL: string =
  typeof fromEnv === "string" && fromEnv.length > 0 ? fromEnv : DEFAULT_BACKEND_URL;

/** true, если адрес взят из запасной константы, а не из окружения сборки. */
export const BACKEND_URL_IS_FALLBACK = BACKEND_URL === DEFAULT_BACKEND_URL && !fromEnv;
