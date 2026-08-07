# Shiftora production checklist

> **Note (7 Aug 2026) — Stripe is backend-only.** The mobile app contains no
> path to Stripe: no billing screen, no checkout call, no payment SDK. It was
> removed for Apple App Store Review Guideline 3.1.1 (digital subscriptions
> must use in-app purchase). The backend Stripe code, webhooks and existing
> subscriptions are untouched. Everything about that change, including how to
> restore it, is in [`archiv/stripe-billing-2026-08-07/README.md`](./archiv/stripe-billing-2026-08-07/README.md).
> Any mention of Stripe below therefore describes the **backend only**.


Updated: 2026-07-14

## Completed in the codebase

- [x] Strict production environment validation, HTTPS origins and CSRF protection.
- [x] PostgreSQL-backed rate limiting for authentication and application routes.
- [x] Server-side role and restaurant-boundary checks for sensitive routes.
- [x] Signed, expiring QR check-in tokens with shift, assignment, time and geofence checks.
- [x] Atomic invitation acceptance and email-bound invitation checks.
- [x] Stripe amount/metadata verification and idempotent retryable webhooks.
- [x] Upload size, MIME, file-signature and ownership validation.
- [x] Prisma migration history, database constraints and production `migrate deploy` startup.
- [x] Backend Sentry support, structured logging and database health check.
- [x] Password reset, privacy policy and terms screens.
- [x] CI checks for migrations, types, lint, tests, web export and dependency audits.
- [x] Backend tests, mobile typecheck/lint/web export and zero known dependency advisories.

## Required before the first real deployment

- [ ] Back up the production database and follow the fresh/legacy migration procedure in `DEPLOY.md`.
- [ ] Store all production secrets in the hosting provider; never copy development `.env` files.
- [ ] Configure exact HTTPS URLs, `ALLOWED_ORIGIN`, a strong auth secret and trusted-proxy setting.
- [ ] Verify the Resend sender domain and run sign-up, verification and password-reset delivery tests.
- [ ] Configure and verify Stripe webhook signing in staging and production.
- [ ] Enable PostgreSQL automated backups and test restoring one snapshot.
- [ ] Configure Sentry release/environment tags and an external `/health` uptime alert.
- [ ] Run the full manager/employee/payment flow against staging with production-equivalent settings.
- [ ] Test camera, location, notifications and deep links on physical iOS and Android devices.
- [ ] Have company-specific Terms and Privacy Policy reviewed and complete store privacy forms.

## Release commands

```bash
cd backend
bun install --frozen-lockfile
bunx prisma validate
bun run typecheck
bun test
bun audit

cd ../mobile
bun install --frozen-lockfile
bun run typecheck
bun run lint -- --max-warnings 0
bun run build
bun audit
```

All commands above must exit successfully. Deployment details and the safe procedure for an existing `db push` database are in `DEPLOY.md`.
