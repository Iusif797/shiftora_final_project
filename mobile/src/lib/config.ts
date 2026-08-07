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
 */
const DEFAULT_BACKEND_URL = "https://shiftora-final-project.onrender.com";

const fromEnv = process.env.EXPO_PUBLIC_BACKEND_URL;

export const BACKEND_URL: string =
  typeof fromEnv === "string" && fromEnv.length > 0 ? fromEnv : DEFAULT_BACKEND_URL;

/** true, если адрес взят из запасной константы, а не из окружения сборки. */
export const BACKEND_URL_IS_FALLBACK = BACKEND_URL === DEFAULT_BACKEND_URL && !fromEnv;
