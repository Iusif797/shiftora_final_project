import { Hono } from "hono";
import { type AuthContext, getAuthUser } from "../middleware/auth";
import {
  getByEmployee,
  getInsights,
  getLaborCosts,
  getOverview,
  getWorkloadForecast,
} from "../services/analytics";

const router = new Hono<AuthContext>();

router.get("/overview", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!user.restaurantId) {
    return c.json({
      data: {
        totalShiftsThisWeek: 0,
        totalHoursWorked: 0,
        attendanceRate: 0,
        activeEmployeesCount: 0,
        anomalyCount: 0,
      },
    });
  }

  const data = await getOverview(user.restaurantId);
  return c.json({ data });
});

router.get("/labor-cost", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!user.restaurantId) {
    return c.json({ data: { today: 0, week: 0, breakdown: [] } });
  }

  const data = await getLaborCosts(user.restaurantId);
  return c.json({ data });
});

router.get("/employees", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!user.restaurantId) return c.json({ data: [] });

  const data = await getByEmployee(user.restaurantId);
  return c.json({ data });
});

router.get("/workload-forecast", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!user.restaurantId) {
    return c.json({ data: { slots: [] } });
  }

  const now = new Date();
  const startDate = c.req.query("startDate")
    ? new Date(c.req.query("startDate")!)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDate = c.req.query("endDate")
    ? new Date(c.req.query("endDate")!)
    : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  const data = await getWorkloadForecast(user.restaurantId, startDate, endDate);
  return c.json({ data });
});

router.get("/insights", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!user.restaurantId) {
    return c.json({
      data: {
        trends: [],
        recommendations: [],
        staffingHealth: "optimal",
        predictedChallenges: [],
      },
    });
  }

  const data = await getInsights(user.restaurantId);
  return c.json({ data });
});

export { router as analyticsRouter };
