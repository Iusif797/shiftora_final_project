import "@vibecodeapp/proxy";
// Sentry должен быть инициализирован максимально рано, чтобы перехватывать ошибки
// и в инициализации других модулей.
import { initSentry } from "./lib/sentry";
initSentry();

import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { env } from "./env";
import { logger as appLogger } from "./lib/logger";
import { errorHandler } from "./middleware/error-handler";
import { rateLimit } from "./middleware/rate-limit";
import { contentTypeGuard, validationErrorNormalizer } from "./lib/validation";
import { restaurantRouter } from "./routes/restaurants";
import { employeeRouter } from "./routes/employees";
import { shiftRouter } from "./routes/shifts";
import { checkinRouter } from "./routes/checkins";
import { anomalyRouter } from "./routes/anomalies";
import { analyticsRouter } from "./routes/analytics";
import { userRouter } from "./routes/users";
import { uploadRouter } from "./routes/upload";
import { invitationRouter } from "./routes/invitations";
import { billingRouter } from "./routes/billing";
import { ordersRouter } from "./routes/orders";
import { tablesRouter } from "./routes/tables";
import { menuRouter } from "./routes/menu";
import { docsRouter } from "./routes/docs";
import { prisma } from "./prisma";

type AppVars = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
};

const app = new Hono<AppVars>();

app.onError(errorHandler);

const isProduction = env.NODE_ENV === "production";

// ─── CORS ────────────────────────────────────────────────────────────────────
// В production обязательно явно задать ALLOWED_ORIGIN (csv-список).
// Хардкод *.railway.app/.fly.dev/.onrender.com убран — был артефактом скаффолда
// и расширял attack surface. Теперь поведение чёткое:
//
//   • production + ALLOWED_ORIGIN задан  → разрешены только эти origin
//   • production + ALLOWED_ORIGIN пуст   → cross-origin запрещён (origin отбрасывается)
//   • dev                                 → разрешены все origin (удобно для Expo Go / web)
//
// Better Auth трастит origin отдельно (см. auth.ts trustedOrigins).
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return origin;
      if (origin === "shiftora://" || origin.startsWith("shiftora://")) {
        return origin;
      }
      if (env.ALLOWED_ORIGIN) {
        const allowed = env.ALLOWED_ORIGIN.split(",").map((o) => o.trim());
        return allowed.includes(origin) ? origin : undefined;
      }
      if (isProduction) {
        return undefined;
      }
      return origin;
    },
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  }),
);

// ─── Request logging (pino) ──────────────────────────────────────────────────
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  appLogger.info(
    {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration_ms: ms,
    },
    "request",
  );
});

// ─── Rate limiting ───────────────────────────────────────────────────────────
app.use("/api/auth/sign-in/*", rateLimit(10, 10 * 60_000, { scope: "auth-sign-in" }));
app.use("/api/auth/sign-up/*", rateLimit(5, 10 * 60_000, { scope: "auth-sign-up" }));
app.use(
  "/api/auth/request-password-reset",
  rateLimit(5, 10 * 60_000, { scope: "auth-password-reset" }),
);
app.use("/api/auth/*", rateLimit(120, 60_000, { scope: "auth-general" }));
app.use("/api/invitations/accept/*", rateLimit(5, 10 * 60 * 1000, { scope: "invite-accept" }));
app.use("/api/invitations/verify/*", rateLimit(10, 10 * 60 * 1000, { scope: "invite-verify" }));

// ─── Session middleware ──────────────────────────────────────────────────────
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    c.set("user", null);
    c.set("session", null);
  } else {
    c.set("user", session.user);
    c.set("session", session.session);
  }
  await next();
});

app.use("/api/*", async (c, next) => {
  if (c.req.path.startsWith("/api/auth")) return next();
  return rateLimit(300, 60_000, {
    scope: "api",
    identity: (context) => {
      const user = context.get("user") as { id?: string } | null;
      return user?.id ? `user:${user.id}` : null;
    },
  })(c, next);
});

// ─── Request guards ──────────────────────────────────────────────────────────
// contentTypeGuard: state-changing запросы с телом обязаны быть application/json
//   (защита от CSRF-подобных form-based атак при SameSite=None cookies).
// validationErrorNormalizer: приводит ошибки zValidator к контракту { error }.
app.use("/api/*", contentTypeGuard);
app.use("/api/*", validationErrorNormalizer);

// ─── Health check (для оркестратора) ─────────────────────────────────────────
app.get("/health", async (c) => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), 3000),
  );
  try {
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    return c.json({
      data: {
        status: "ok",
        db: "ok",
        uptime: process.uptime(),
        // Какой коммит реально работает. Без этого «задеплоено» — утверждение,
        // а не доказательство: снаружи нельзя отличить новый код от старого.
        // RENDER_GIT_COMMIT проставляет сама платформа Render.
        commit: (process.env.RENDER_GIT_COMMIT ?? "unknown").slice(0, 8),
      },
    });
  } catch (err) {
    appLogger.error({ err }, "Health check failed (DB unreachable)");
    return c.json(
      { error: { message: "Service unavailable", code: "DB_UNREACHABLE" } },
      503,
    );
  }
});

// ─── Auth (Better Auth owns the response, без data-envelope) ─────────────────
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// ─── App routes (все возвращают { data: ... }) ──────────────────────────────
app.route("/api/restaurants", restaurantRouter);
app.route("/api/employees", employeeRouter);
app.route("/api/shifts", shiftRouter);
app.route("/api/checkins", checkinRouter);
app.route("/api/anomalies", anomalyRouter);
app.route("/api/analytics", analyticsRouter);
app.route("/api/users", userRouter);
app.route("/api/upload", uploadRouter);
app.route("/api/invitations", invitationRouter);
app.route("/api/billing", billingRouter);
app.route("/api/orders", ordersRouter);
app.route("/api/tables", tablesRouter);
app.route("/api/menu", menuRouter);

// API docs: /api/docs (Swagger UI), /api/openapi.json (raw spec).
// В production открыты только при явном ENABLE_API_DOCS=true, чтобы не отдавать
// карту API анонимам.
if (env.NODE_ENV !== "production" || env.ENABLE_API_DOCS === "true") {
  app.route("/api", docsRouter);
}

const port = Number(env.PORT);

appLogger.info(
  { port, env: env.NODE_ENV, sentry: Boolean(env.SENTRY_DSN) },
  "Backend ready",
);

export default {
  port,
  fetch: app.fetch,
};
