FROM oven/bun:1.2-alpine

WORKDIR /app

# OpenSSL нужен Prisma engine на Alpine
RUN apk add --no-cache openssl wget

# Манифесты + Prisma схема
COPY package.json bun.lock* ./
COPY prisma ./prisma/

# Установка зависимостей.
# `--no-frozen-lockfile` явно отключает автоматический frozen mode, который
# Bun включает в CI/production окружении. Это позволяет регенерировать
# bun.lock при добавлении новых зависимостей без перекоммита локально.
# После первого успешного деплоя рекомендуется локально выполнить
# `bun install`, закоммитить bun.lock и вернуть `--frozen-lockfile`
# для воспроизводимых сборок.
RUN bun install --no-frozen-lockfile

# Сгенерировать Prisma client под целевую платформу
RUN bunx prisma generate

# Копируем код
COPY src ./src/
COPY tsconfig.json ./

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Healthcheck для оркестратора (Render/Railway/Fly).
# Использует тот же /health, что и в коде: проверяет коннект к БД.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1

# Production-старт:
#   1. Применить миграции если они закоммичены — `prisma migrate deploy`.
#      Если в prisma/migrations нет поддиректорий миграций — fallback на `db push`,
#      чтобы первый деплой не падал на проекте без созданной локально миграции.
#   2. Запустить сервер.
CMD ["sh", "-c", "if [ -d prisma/migrations ] && [ -n \"$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d 2>/dev/null)\" ]; then echo '[startup] applying prisma migrations...'; bunx prisma migrate deploy; else echo '[startup] no prisma migrations found — running db push'; bunx prisma db push --accept-data-loss; fi && exec bun src/index.ts"]
