# Как залить изменения в GitHub

Sandbox Claude не имеет права писать в `.git/` (это by design — чтобы агент не коммитил без вашего ведома) и не имеет сетевого доступа к github.com. Поэтому push нужно сделать у вас в терминале — это одна команда.

## Вариант 1 (рекомендую) — отдельный коммит с моими доработками

Откройте Terminal на macOS, перейдите в папку проекта и выполните:

```bash
cd ~/Desktop/shiftora_final

# Сначала уберите stale lock-файл, если остался
rm -f .git/index.lock

# Проверьте, что вы на нужной ветке
git status

# Добавьте только мои изменения (mobile-изменения не трогаю — это ваши)
git add \
  .gitignore \
  .github/workflows/ci.yml \
  README.md \
  DEPLOY.md \
  PRE_LAUNCH_CHECKLIST.md \
  PUSH_INSTRUCTIONS.md \
  backend/.env.example \
  backend/Dockerfile \
  backend/package.json \
  backend/scripts/start \
  backend/src/auth.ts \
  backend/src/env.ts \
  backend/src/index.ts \
  backend/src/middleware/error-handler.ts \
  backend/src/middleware/rate-limit.ts \
  backend/src/lib/email.ts \
  backend/src/lib/logger.ts \
  backend/src/lib/openapi.ts \
  backend/src/lib/sentry.ts \
  backend/src/routes/docs.ts \
  backend/tests/smoke.test.ts \
  backend/prisma/migrations/.gitkeep

# Коммит
git commit -m "feat(prod-readiness): pre-launch hardening

- backend: pino structured logging, Sentry capture, email verification via Resend
- backend: clean CORS (no hardcoded provider domains), explicit ALLOWED_ORIGIN
- backend: rate-limit warning, env production safety checks
- backend: Prisma migrate deploy in Dockerfile, healthcheck, db-aware /health
- backend: Swagger UI on /api/docs, OpenAPI spec, smoke tests
- ci: postgres service, smoke tests, mobile lint
- docs: PRE_LAUNCH_CHECKLIST, expanded README, .env.example
- gitignore: exclude .claude/worktrees/"

# Если в репо ещё нет ветки (свежий клон) — pull сначала, чтобы избежать non-fast-forward
git pull --rebase origin main

# Push
git push origin main
```

## Вариант 2 — отдельная ветка для PR-ревью

Если хотите ревью через Pull Request:

```bash
cd ~/Desktop/shiftora_final
rm -f .git/index.lock

git checkout -b pre-launch-fixes
git add <тот же список файлов что выше>
git commit -m "feat(prod-readiness): pre-launch hardening"
git push -u origin pre-launch-fixes
```

Затем откройте https://github.com/Iusif797/shiftora_final_project/pulls и создайте PR из ветки `pre-launch-fixes` → `main`.

## Что насчёт mobile-файлов

В `git status` будут также:
- `mobile/app.json`
- `mobile/src/app/_layout.tsx`
- `mobile/src/lib/auth/use-session.ts`
- `mobile/eas.json` (новый)

Это **ваши** изменения, которые были в working dir до моей работы. Я их не трогал. Решите, отдельно их коммитить или вместе с моими — это ваше решение, я не знаю, что в них.

## Если нужна авторизация

При `git push` GitHub попросит логин:
- **HTTPS:** username + Personal Access Token (PAT) вместо пароля. Создать PAT: https://github.com/settings/tokens → Fine-grained → права на `Contents: Read and write` для репозитория.
- **SSH:** если вы настроили SSH-ключ — поменяйте remote: `git remote set-url origin git@github.com:Iusif797/shiftora_final_project.git`, дальше `git push` без пароля.

## Проверка после push

После push GitHub Actions запустит CI (`.github/workflows/ci.yml`):
1. `backend-check` — typecheck + smoke-тесты против тестового Postgres.
2. `mobile-check` — typecheck + ESLint.
3. `docker-build` (только на main) — сборка Docker-образа.

Если что-то упадёт — посмотрите логи во вкладке Actions репозитория.
