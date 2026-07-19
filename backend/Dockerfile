FROM oven/bun:1.3.10-alpine

WORKDIR /app

# OpenSSL нужен Prisma engine на Alpine
RUN apk add --no-cache openssl wget

# Манифесты + Prisma схема
COPY package.json bun.lock* ./
COPY prisma ./prisma/

# Reproducible dependency install; the image must match the reviewed lockfile.
RUN bun install --frozen-lockfile

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

USER bun

# Never mutate a production schema with `db push --accept-data-loss`.
CMD ["sh", "-c", "bunx prisma migrate deploy && exec bun src/index.ts"]
