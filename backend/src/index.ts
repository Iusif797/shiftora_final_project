import "@vibecodeapp/proxy";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth";
import { env } from "./env";
import { errorHandler } from "./middleware/error-handler";
import { rateLimit } from "./middleware/rate-limit";
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

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return origin;
      if (env.ALLOWED_ORIGIN) {
        const allowed = env.ALLOWED_ORIGIN.split(",").map((o) => o.trim());
        return allowed.includes(origin) ? origin : undefined;
      }
      if (isProduction) {
        const allowedPatterns = [
          ".shiftora.app",
          ".railway.app",
          ".fly.dev",
          ".onrender.com",
          ".vibecode.run",
          ".vibecodeapp.com",
        ];
        if (allowedPatterns.some((p) => origin.includes(p))) return origin;
        // Allow localhost for local dev testing against prod backend
        if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) return origin;
        return undefined;
      }
      return origin;
    },
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })
);

app.use("*", logger());

app.use("/api/auth/*", rateLimit(20, 60_000));
app.use("/api/invitations/accept/*", rateLimit(5, 10 * 60 * 1000));
app.use("/api/*", async (c, next) => {
  if (c.req.path.startsWith("/api/auth")) return next();
  return rateLimit(100, 60_000)(c, next);
});

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

app.get("/health", async (c) => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), 3000)
  );
  try {
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    return c.json({
      data: { status: "ok", db: "ok", uptime: process.uptime() },
    });
  } catch {
    return c.json(
      { error: { message: "Service unavailable", code: "DB_UNREACHABLE" } },
      503
    );
  }
});

app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

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

const port = Number(env.PORT);

export default {
  port,
  fetch: app.fetch,
};
