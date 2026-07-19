# Production deployment

Shiftora backend deploys as a Docker service and uses PostgreSQL. The container runs `prisma migrate deploy` before starting the API. It never uses `db push` or `--accept-data-loss` in production.

## 1. Infrastructure

- Managed PostgreSQL with automated backups and point-in-time recovery where available.
- Docker host such as Render, Railway or Fly.io.
- A production API hostname with HTTPS.
- Resend account and a verified sender domain.
- Stripe webhook endpoint if billing or POS card payments are enabled.
- Sentry DSN and external uptime monitoring are strongly recommended.

Create a manual database snapshot immediately before every production migration.

## 2. Required environment

Start from `backend/.env.example`. Production validation deliberately stops startup if security-critical values are missing.

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=<at-least-32-random-characters>
BACKEND_URL=https://api.example.com
FRONTEND_URL=https://app.example.com
ALLOWED_ORIGIN=https://app.example.com
TRUST_PROXY_HEADERS=true
RESEND_API_KEY=re_...
FROM_EMAIL=Shiftora <no-reply@example.com>
```

`ALLOWED_ORIGIN` accepts a comma-separated list of exact HTTPS origins; do not add wildcards. Set `TRUST_PROXY_HEADERS=true` only behind a trusted proxy that replaces forwarded headers. Add Stripe, storage, Gemini and Sentry variables from the example only for the features you enable.

API documentation is disabled in production by default. Temporarily set `ENABLE_API_DOCS=true` only when it is actually needed.

## 3. Database migrations

### Fresh database

No manual preparation is required:

```bash
cd backend
bun install --frozen-lockfile
bunx prisma migrate deploy
```

### Existing database previously created with `prisma db push`

Do not run `migrate deploy` blindly: Prisma will see existing tables but no applied migration history.

1. Create and verify a backup.
2. Compare the live schema with `backend/prisma/schema.prisma` and confirm that the `init` and `pos` structures already exist.
3. Resolve only migrations whose SQL is already represented in the live schema:

```bash
cd backend
bunx prisma migrate resolve --applied 20260428120000_init
bunx prisma migrate resolve --applied 20260428150000_pos
bunx prisma migrate deploy
```

The hardening migration performs preflight checks and refuses to add unique constraints if duplicate assignments, check-ins or active table orders already exist. Correct that data deliberately, then rerun the migration. Never mark the hardening migration as applied unless its SQL was actually executed.

## 4. Deploy and verify

Build the image from `backend/Dockerfile`, inject environment variables through the host's secret manager, then verify:

```bash
curl --fail https://api.example.com/health
```

Expected shape:

```json
{"data":{"status":"ok","db":"ok","uptime":123}}
```

Also verify a real sign-up/sign-in/reset-password flow, invitation acceptance, manager shift creation, employee QR check-in/out, order payment and Stripe webhook delivery in a staging environment configured like production.

## 5. Mobile release

Set the HTTPS API URL in the build environment (never a local address), then use EAS production profiles:

```bash
cd mobile
bun install --frozen-lockfile
bun run typecheck
bun run lint -- --max-warnings 0
bunx eas build --platform all --profile production
```

Before store submission, replace the bundled legal text with company-specific details reviewed for the jurisdictions where Shiftora operates, complete Apple/Google privacy declarations, and test location, camera, notifications and payment return links on physical iOS and Android devices.

## 6. Rollback

Prisma production migrations are forward-only. If deployment fails, keep the previous application image available and restore from the verified snapshot when a schema rollback is necessary. Do not use `db push --accept-data-loss` as a rollback mechanism.
