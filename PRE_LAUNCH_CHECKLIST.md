# Shiftora — Доработки перед запуском

**Дата аудита:** 2026-04-28
**Стек:** Bun + Hono + Prisma + PostgreSQL (backend) · Expo + React Native (mobile) · Better Auth · Stripe · Gemini · Sentry

Общая оценка: **проект готов к запуску на 75–80%**. Архитектура чистая, код качественный, критичных блокеров нет. Но перед боевым деплоем нужно закрыть ряд пробелов в инфраструктуре, документации и операционной готовности.

---

## 1. Критичные доработки (блокеры запуска)

Без этого продакшен запускать нельзя.

### 1.1. Создать `backend/.env.example`
Сейчас `.env.example` есть только в `mobile/`. В `backend/src/env.ts` Zod-схема валидирует переменные, но новый разработчик/деплой-инженер не знает, что нужно задать. Нужен файл со всеми переменными и комментариями:

```
DATABASE_URL=postgresql://user:pass@host:5432/shiftora
BETTER_AUTH_SECRET=                # openssl rand -hex 32
BACKEND_URL=https://api.shiftora.app
FRONTEND_URL=https://app.shiftora.app
ALLOWED_ORIGIN=https://app.shiftora.app
NODE_ENV=production
PORT=3000

# Опционально
SENTRY_DSN=
GEMINI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
STRIPE_BUSINESS_PRICE_ID=
```

### 1.2. Миграции Prisma в продакшене
Сейчас в `package.json` стартовый скрипт — просто `bun run src/index.ts`. По правилам проекта (`.claude/rules/api-patterns.md`):
- dev/preview: `bunx prisma db push`
- production: `bunx prisma migrate deploy`

**Что сделать:**
- Создать первую миграцию: `bunx prisma migrate dev --name init`
- Закоммитить папку `prisma/migrations/`
- Изменить продакшен-старт на `bunx prisma migrate deploy && bun run src/index.ts`
- В Dockerfile добавить шаг `RUN bunx prisma generate` (если ещё не явный)

### 1.3. Rate limiting перенести на Redis
`backend/src/middleware/rate-limit.ts` хранит счётчики в `Map` — при рестарте контейнера/деплое всё обнуляется, и при горизонтальном масштабировании каждый инстанс имеет свой стейт (защита бесполезна). Использовать Redis (Upstash/Railway Redis) или хотя бы PostgreSQL-таблицу.

### 1.4. Sentry на бэкенде
Sentry подключён только в мобильном. На бэке ошибки уйдут в `console.error` и потеряются. Добавить `@sentry/bun` в `backend/src/index.ts` и в `error-handler.ts` — отправлять туда непредвиденные ошибки.

### 1.5. Production CORS / origins
В `backend/src/index.ts` хардкодом разрешены домены `.railway.app`, `.fly.dev`, `.onrender.com`, `.vibecode.run`. Заменить на собственный продакшен-домен Shiftora через `ALLOWED_ORIGIN` (поддержка уже есть). То же — в `auth.ts` `trustedOrigins`: убрать ненужные wildcard'ы и оставить только реальные origin приложения.

### 1.6. Health check для оркестратора
Эндпоинт `/health` есть, но он простой. Добавить проверку соединения с БД (`prisma.$queryRaw` SELECT 1) — Railway/Fly/k8s по этому эндпоинту решают, жив ли инстанс.

---

## 2. Высокий приоритет (закрыть до публичного запуска)

### 2.1. README.md в корне репозитория
Сейчас его нет. Нужен README с:
- описанием проекта;
- быстрым стартом (clone → bun install → `.env` → `prisma db push` → `bun dev`);
- ссылками на бэкенд/мобайл;
- стеком и архитектурой.

### 2.2. Документация API
Зод-схемы есть в `routes/*.ts`, но нет OpenAPI/Postman-коллекции. Использовать `@hono/zod-openapi` — даст и валидацию, и Swagger UI бесплатно. Минимально — Postman/Insomnia коллекция.

### 2.3. Линтинг в CI
`.github/workflows/ci.yml` запускает только typecheck. Добавить:
- ESLint (mobile уже настроен, в backend завести)
- Prettier check
- На pull request — обязательное прохождение

### 2.4. Структурированное логирование
Сейчас `console.log/error`. Для продакшена использовать `pino` (быстрый, JSON-логи) — будет нормально парситься в CloudWatch/Datadog/Loki:

```ts
import pino from "pino";
export const logger = pino({ level: env.NODE_ENV === "production" ? "info" : "debug" });
```

И заменить все `console.*` на `logger.*`.

### 2.5. Smoke-тесты основных потоков
Нет ни одного теста. Минимально — Vitest/Bun test для бэкенда:
- POST /api/auth/sign-up → 200
- POST /api/restaurants → 201, returns `{ data }` envelope
- POST /api/checkins → проверка геолокации/фото
- Webhook Stripe → правильный subscription update

### 2.6. Валидация регистрации
В `mobile/src/app/sign-up.tsx` и на бэке нужно проверить:
- минимальная длина пароля (Better Auth по умолчанию 8, но стоит явно прописать 10–12);
- проверка прочности пароля на фронте (zxcvbn);
- email верификация (Better Auth поддерживает — включить `emailVerification: { sendOnSignUp: true }` через Resend, который уже подключён).

### 2.7. Юридические страницы
Перед публикацией в App Store/Play Market требуются:
- Privacy Policy (особенно из-за обработки фото и геолокации сотрудников — это PII);
- Terms of Service;
- В мобильном приложении ссылки на них на экранах sign-up и settings.

### 2.8. Бэкап БД
Включить автоматические бэкапы PostgreSQL у провайдера (Railway/Render это делают встроенно, но нужно проверить retention — минимум 7 дней + ручной snapshot перед миграциями).

---

## 3. Средний приоритет (первые 2–4 недели после запуска)

### 3.1. docker-compose для локалки
Нет `docker-compose.yml`. Удобно для нового разработчика поднять PostgreSQL + Redis + backend одной командой:

```yaml
services:
  postgres: { image: postgres:16, ... }
  redis: { image: redis:7, ... }
  backend: { build: ./backend, depends_on: [postgres, redis] }
```

### 3.2. Seed-скрипт
Нет `prisma/seed.ts`. Полезен для демо-аккаунтов и для e2e-тестов: создавать ресторан, владельца, 5 сотрудников, 10 смен.

### 3.3. E2E тесты мобильного
Maestro или Detox — покрыть три сценария: регистрация → онбординг → дашборд; check-in со сменой; manager создаёт смену → сотрудник её видит.

### 3.4. Loading states
В части экранов (`mobile/src/app/(tabs)/*`) loading отрисован через `ActivityIndicator`, но скелетоны/empty states не везде. Особенно на дашборде и списках смен.

### 3.5. Push-уведомления end-to-end
Backend (`services/notifications.ts`) шлёт через Expo Push API, но нужна проверка:
- регистрация Expo push token в `User` модели после логина;
- обработка `notificationResponseListener` в мобильном для deep-link на нужный экран;
- тестирование на iOS (требует APNs key в Expo).

### 3.6. Мониторинг и метрики
- Uptime: BetterStack / UptimeRobot
- Метрики: `/metrics` endpoint в Prometheus-формате
- Алерты: error rate > 1%, p95 latency > 500ms

### 3.7. Stripe webhook idempotency
Проверить, что в `backend/src/routes/billing.ts` обработчик webhook'ов идемпотентен — Stripe ретраит события при сетевых ошибках, и двойное создание подписки = баг.

### 3.8. Защита от brute-force на login
Кроме общего rate-limit (20 req/min на /api/auth/*) — добавить блокировку по конкретному email после N неудачных попыток (Better Auth поддерживает `bruteForce` plugin).

---

## 4. Соответствие правилам проекта

Сверка с `.claude/rules/api-patterns.md`:

| Правило | Статус |
|---|---|
| Все app-роуты возвращают `{ data: ... }` | OK |
| `/api/auth/*` без envelope (Better Auth) | OK |
| Auth trustedOrigins — string array с `*` | OK |
| CORS echo конкретный origin (не `*`) | OK |
| API typing — внутреннее значение, не envelope | OK |
| Production: `prisma migrate deploy` | НЕ выполнено (см. 1.2) |

---

## 5. Резюме

**Готово к запуску после того, как закроют пункты раздела 1 (критичные).** Это примерно 1–2 дня работы:
1. `.env.example` для backend
2. Prisma migrations и обновлённый Dockerfile/start script
3. Redis для rate-limit
4. Sentry на backend
5. Реальные origin'ы вместо хардкод-доменов
6. Health check с проверкой БД

После этого можно делать closed beta. Перед публичным запуском — закрыть раздел 2 (особенно email-верификацию, юридические страницы и бэкапы БД).
