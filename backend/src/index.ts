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
      if (isProduction) {
        const allowedPatterns = [
          ".shiftora.app",
          ".vibecode.run",
          ".vibecodeapp.com",
        ];
        if (allowedPatterns.some((p) => origin.includes(p))) return origin;
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

app.get("/health", (c) => c.json({ status: "ok", service: "shiftora-api", env: env.NODE_ENV }));

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

const port = Number(env.PORT);

export default {
  port,
  fetch: app.fetch,
};
