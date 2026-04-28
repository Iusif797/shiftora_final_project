# Shiftora

Shift management platform for restaurants. Manage employee schedules, track attendance with QR check-ins, detect anomalies, and get workforce analytics — all from a mobile app.

## Architecture

| Component | Stack | Port |
|-----------|-------|------|
| **Backend** | Hono + Prisma + PostgreSQL + Better Auth | 3000 |
| **Mobile** | Expo React Native + NativeWind | 8081 |

## Features

- **Email & Password Authentication** — secure session-based sign-in via Better Auth
- **Role-based Access** — owner, manager, employee with scoped permissions
- **Invitation System** — owners generate invite codes, employees join via code
- **Shift Management** — create, assign, and auto-generate schedules
- **QR Check-in/out** — employees scan QR codes to clock in and out
- **Anomaly Detection** — automatic late arrival and missed shift alerts
- **Workforce Analytics** — attendance rates, labor costs, workload forecasts, AI insights
- **Restaurant Management** — multi-tenant with per-restaurant data isolation
- **Offline Detection** — banner when network is unavailable

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.1+
- [Node.js](https://nodejs.org) v20+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- PostgreSQL database (or [Neon.tech](https://neon.tech) free tier)

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL DATABASE_URL
bun install
bunx prisma generate
bunx prisma db push
bun run dev
```

### Mobile

```bash
cd mobile
cp .env.example .env
# Edit .env with your backend URL
npm install --legacy-peer-deps
npm start
```

## Deployment

### Backend (Docker)

```bash
cd backend
docker build -t shiftora-api .
docker run -p 3000:3000 --env-file .env.production shiftora-api
```

### Recommended Cloud Stack

| Service | Provider | Cost |
|---------|----------|------|
| API Server | Railway / Fly.io | ~$5/mo |
| Database | Neon.tech (PostgreSQL) | Free tier |
| File Storage | Cloudflare R2 | Free tier |

### Mobile (EAS Build)

```bash
cd mobile
npx eas build --platform ios
npx eas submit --platform ios
```

## Project Structure

```
shiftora/
├── .github/workflows/   # CI/CD pipeline
├── backend/
│   ├── Dockerfile       # Production container
│   ├── prisma/          # Database schema + migrations
│   └── src/
│       ├── auth.ts      # Better Auth configuration
│       ├── env.ts       # Environment validation (Zod)
│       ├── index.ts     # Hono app + middleware
│       ├── prisma.ts    # Prisma client
│       ├── middleware/
│       │   ├── auth.ts        # Session + role guards
│       │   ├── error-handler.ts  # Global error handling
│       │   └── rate-limit.ts  # Rate limiting
│       └── routes/
│           ├── analytics.ts
│           ├── anomalies.ts
│           ├── checkins.ts
│           ├── employees.ts
│           ├── invitations.ts  # Invite code system
│           ├── restaurants.ts
│           ├── shifts.ts
│           ├── upload.ts
│           └── users.ts
├── mobile/
│   └── src/
│       ├── app/         # Expo Router screens
│       ├── components/  # Reusable UI components
│       ├── lib/         # API client, auth, utilities
│       ├── theme/       # Design tokens
│       └── types/       # TypeScript interfaces
└── README.md
```

## API Documentation

После старта бэкенда:

- **Swagger UI:** `GET /api/docs`
- **OpenAPI JSON:** `GET /api/openapi.json` (для Postman/Insomnia/codegen)

Спека вручную поддерживается в [`backend/src/lib/openapi.ts`](./backend/src/lib/openapi.ts).

### API Conventions

Все приложение-роуты возвращают envelope `{ data: <value> }`, ошибки — `{ error: { message, code } }`. Исключение: `/api/auth/*` (Better Auth владеет ответом). Подробности: [`.claude/rules/api-patterns.md`](./.claude/rules/api-patterns.md).

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check + ping БД (`{ data: { status, db, uptime } }`) |
| GET | `/api/docs` | Swagger UI |
| GET | `/api/openapi.json` | OpenAPI 3.0 spec |
| POST | `/api/auth/*` | Authentication (Better Auth) |
| GET/POST | `/api/restaurants/*` | Restaurant CRUD |
| GET/POST/PUT | `/api/employees/*` | Employee management |
| GET/POST/PUT/DELETE | `/api/shifts/*` | Shift scheduling |
| POST | `/api/shifts/generate` | Auto-generate schedule |
| POST | `/api/checkins/checkin` | Clock in |
| POST | `/api/checkins/checkout` | Clock out |
| GET | `/api/analytics/*` | Workforce analytics |
| GET | `/api/anomalies` | Scheduling anomalies |
| POST/GET | `/api/invitations` | Invite code management |
| GET | `/api/invitations/verify/:code` | Verify invite code |
| POST | `/api/invitations/accept/:code` | Accept invitation |
| POST | `/api/upload` | File upload |

## Production Readiness

Полный чек-лист перед запуском: [`PRE_LAUNCH_CHECKLIST.md`](./PRE_LAUNCH_CHECKLIST.md).

### Known Limitations

- **Rate limit — in-memory.** Состояние теряется при рестарте, не разделяется между инстансами. Для продакшена с несколькими репликами или защиты от целевого brute-force — переехать на Redis. См. `backend/src/middleware/rate-limit.ts`.

### Environment Variables

Все переменные backend описаны в [`backend/.env.example`](./backend/.env.example) с пояснениями. Валидация выполняется через Zod в `backend/src/env.ts` при старте — приложение упадёт, если обязательные переменные отсутствуют.

### Observability

- **Backend logs:** pino (JSON в production, pretty в dev). Уровень: `LOG_LEVEL` env.
- **Backend errors:** Sentry (если задан `SENTRY_DSN`).
- **Mobile:** Sentry React Native + Expo Insights.
- **Health:** `GET /health` проверяет коннект к БД (`prisma.$queryRaw 'SELECT 1'` с таймаутом 3s).

### Email

Транзакционные письма (верификация, приглашения) через [Resend](https://resend.com). В production требуется `RESEND_API_KEY` и верифицированный домен в `FROM_EMAIL`. В dev без ключа письма выводятся в лог как stub.

## License

Private — all rights reserved.
