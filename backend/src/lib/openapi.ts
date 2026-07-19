import { env } from "../env";

/**
 * OpenAPI 3.0 спецификация Shiftora API.
 *
 * Это вручную поддерживаемая спека — при добавлении новых эндпоинтов или
 * изменении схем нужно обновить этот файл. Преимущество перед автогенерацией
 * через @hono/zod-openapi — нулевой риск сломать существующие роуты.
 *
 * Доступна на /api/docs (Swagger UI) и /api/openapi.json (raw spec).
 */
export function buildOpenApiSpec() {
  return {
    openapi: "3.0.3",
    info: {
      title: "Shiftora API",
      version: "1.0.0",
      description: [
        "REST API для системы управления сменами Shiftora.",
        "",
        "**Конвенция envelope:** все успешные ответы возвращают `{ data: <value> }`,",
        "ошибки — `{ error: { message, code } }`. Исключение: `/api/auth/*`",
        "(этим управляет Better Auth напрямую).",
        "",
        "**Аутентификация:** session-cookie от Better Auth.",
      ].join("\n"),
    },
    servers: [
      { url: env.BACKEND_URL, description: env.NODE_ENV },
      { url: "http://localhost:3000", description: "local dev" },
    ],
    tags: [
      { name: "Health" },
      { name: "Auth" },
      { name: "Users" },
      { name: "Restaurants" },
      { name: "Employees" },
      { name: "Shifts" },
      { name: "Checkins" },
      { name: "Anomalies" },
      { name: "Analytics" },
      { name: "Invitations" },
      { name: "Billing" },
      { name: "Orders" },
      { name: "Upload" },
    ],
    components: {
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                message: { type: "string" },
                code: { type: "string" },
              },
              required: ["message"],
            },
          },
          required: ["error"],
        },
        Envelope: {
          type: "object",
          properties: { data: {} },
          required: ["data"],
        },
      },
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "better-auth.session_token",
        },
      },
    },
    security: [{ cookieAuth: [] }],
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Health check (liveness + DB ping)",
          security: [],
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "object",
                        properties: {
                          status: { type: "string", example: "ok" },
                          db: { type: "string", example: "ok" },
                          uptime: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "503": {
              description: "Database unreachable",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/Error" } },
              },
            },
          },
        },
      },
      "/api/auth/sign-up/email": {
        post: {
          tags: ["Auth"],
          summary: "Регистрация по email/password (Better Auth)",
          security: [],
          description:
            "Не возвращает envelope — формат отличается от остальных эндпоинтов (Better Auth).",
        },
      },
      "/api/auth/sign-in/email": {
        post: {
          tags: ["Auth"],
          summary: "Логин по email/password (Better Auth)",
          security: [],
        },
      },
      "/api/auth/get-session": {
        get: {
          tags: ["Auth"],
          summary: "Получить текущую сессию",
          security: [],
        },
      },
      "/api/users/me": {
        get: {
          tags: ["Users"],
          summary: "Профиль текущего пользователя + employee/restaurant",
          responses: {
            "200": { $ref: "#/components/schemas/Envelope" } as object,
            "401": {
              description: "Unauthenticated",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/Error" } },
              },
            },
          },
        },
      },
      "/api/restaurants": {
        get: { tags: ["Restaurants"], summary: "Список ресторанов пользователя" },
        post: { tags: ["Restaurants"], summary: "Создать ресторан" },
      },
      "/api/employees": {
        get: { tags: ["Employees"], summary: "Сотрудники ресторана" },
        post: { tags: ["Employees"], summary: "Добавить сотрудника" },
      },
      "/api/shifts": {
        get: { tags: ["Shifts"], summary: "Смены (с фильтрами)" },
        post: { tags: ["Shifts"], summary: "Создать смену" },
      },
      "/api/checkins/checkin": {
        post: {
          tags: ["Checkins"],
          summary: "Чек-ин с подписанным QR, геолокацией и фото",
        },
      },
      "/api/checkins/checkout": {
        post: { tags: ["Checkins"], summary: "Чек-аут активной смены" },
      },
      "/api/shifts/{id}/checkin-tokens": {
        get: {
          tags: ["Shifts"],
          summary: "Короткоживущие QR-токены назначений смены (manager/owner)",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
        },
      },
      "/api/anomalies": {
        get: { tags: ["Anomalies"], summary: "Аномалии (опоздания/пропуски)" },
      },
      "/api/analytics": {
        get: { tags: ["Analytics"], summary: "Аналитика по ресторану" },
      },
      "/api/invitations": {
        post: { tags: ["Invitations"], summary: "Создать приглашение в ресторан" },
      },
      "/api/billing/checkout": {
        post: { tags: ["Billing"], summary: "Создать Stripe Checkout сессию" },
      },
      "/api/billing/webhook": {
        post: {
          tags: ["Billing"],
          summary: "Stripe webhook (subscription events)",
          security: [],
        },
      },
      "/api/orders": {
        get: { tags: ["Orders"], summary: "Заказы ресторана" },
        post: { tags: ["Orders"], summary: "Создать заказ для свободного стола" },
      },
      "/api/orders/{id}/confirm-payment": {
        post: {
          tags: ["Orders"],
          summary: "Подтвердить Stripe Checkout после возврата в приложение",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
        },
      },
    },
  } as const;
}
