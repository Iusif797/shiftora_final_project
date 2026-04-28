FROM oven/bun:1.2-alpine AS base
WORKDIR /app

# OpenSSL нужен Prisma engine на Alpine
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json bun.lock ./
COPY prisma ./prisma/
RUN bun install --frozen-lockfile --production

FROM base AS build
COPY package.json bun.lock ./
COPY prisma ./prisma/
RUN bun install --frozen-lockfile
COPY src ./src/
COPY tsconfig.json ./

FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./
COPY --from=build /app/tsconfig.json ./

# Сгенерировать Prisma client под целевую платформу
RUN bunx prisma generate

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Healthcheck для оркестратора (Railway/Fly/k8s).
# Используется тот же /health, что и в коде: проверяет коннект к БД.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1

# Production-старт:
#   1. Применить миграции (если есть) — `prisma migrate deploy`.
#      Если папка миграций пустая — fallback на `db push` с предупреждением,
#      чтобы первый деплой не падал на проекте без миграций.
#   2. Запустить сервер.
CMD ["sh", "-c", "if [ -d prisma/migrations ] && [ \"$(ls -A prisma/migrations 2>/dev/null)\" ]; then bunx prisma migrate deploy; else echo '[startup] prisma/migrations пуста — fallback на db push'; bunx prisma db push --accept-data-loss; fi && exec bun src/index.ts"]
