# Деплой Backend на Render

Backend работает с Supabase (PostgreSQL). Для постоянной работы задеплой на Render.

## Шаг 1: Регистрация

1. Зайди на [render.com](https://render.com)
2. Войди через GitHub

## Шаг 2: Создание сервиса

1. **New +** → **Web Service**
2. Подключи репозиторий `shiftora_final_project`
3. Или **New +** → **Blueprint** — Render подхватит `render.yaml` из репозитория

### Если создаёшь вручную (без Blueprint)

| Поле | Значение |
|------|----------|
| Name | `shiftora-backend` |
| Region | Frankfurt или Oregon |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | `Docker` |

## Шаг 3: Переменные окружения

В **Environment** добавь:

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | Строка Supabase (Supabase → Settings → Database) |
| `BETTER_AUTH_SECRET` | Секрет 32+ символов (`openssl rand -hex 32`) |
| `BACKEND_URL` | Оставь пустым — заполнишь после деплоя |
| `NODE_ENV` | `production` |

**Важно:** пароль в `DATABASE_URL` с спецсимволами — в URL-кодировке (`/` → `%2F`, `$` → `%24`, `?` → `%3F`).

## Шаг 4: BACKEND_URL после деплоя

1. После первого деплоя Render выдаст URL вида `https://shiftora-backend.onrender.com`
2. В **Environment** добавь `BACKEND_URL` = этот URL
3. **Manual Deploy** → **Deploy latest commit**

## Шаг 5: Проверка

```bash
curl https://ТВОЙ-RENDER-URL/health
```

Ожидаемый ответ: `{"status":"ok","service":"shiftora-api","env":"production"}`

## В mobile/.env

```
EXPO_PUBLIC_BACKEND_URL=https://ТВОЙ-RENDER-URL
```

## Стоимость

Render даёт бесплатный тариф. Сервис может «засыпать» после 15 минут неактивности — первый запрос после этого будет медленнее (~30 сек).
