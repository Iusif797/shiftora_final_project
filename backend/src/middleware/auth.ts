import { type Context, type Next } from "hono";
import { auth } from "../auth";
import { AppError } from "./error-handler";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  restaurantId: string | null;
  image: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AuthContext = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
};

export async function authMiddleware(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    c.set("user", null);
    c.set("session", null);
  } else {
    c.set("user", session.user);
    c.set("session", session.session);
  }
  await next();
}

export function getAuthUser(c: Context): SessionUser | null {
  return c.get("user") as SessionUser | null;
}

export function requireAuth(c: Context): SessionUser | null {
  const user = getAuthUser(c);
  if (!user) return null;
  return user;
}

export function requireRole(c: Context, roles: string[]): SessionUser | null {
  const user = requireAuth(c);
  if (!user) return null;
  if (!roles.includes(user.role)) return null;
  return user;
}

export function assertRestaurantAccess(user: SessionUser, resourceRestaurantId: string): void {
  if (user.restaurantId !== resourceRestaurantId) {
    throw new AppError(403, "Нет доступа", "FORBIDDEN");
  }
}
