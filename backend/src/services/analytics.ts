import { prisma } from "../prisma";
import { generateAIInsights, type InsightsMetrics } from "./ai-insights";

export async function getOverview(restaurantId: string) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [totalShiftsThisWeek, checkins, activeEmployeesCount, anomalyCount] = await Promise.all([
    prisma.shift.count({
      where: { restaurantId, startTime: { gte: startOfWeek } },
    }),
    prisma.checkin.findMany({
      where: { restaurantId, checkinTime: { gte: startOfWeek } },
    }),
    prisma.employee.count({
      where: { restaurantId, isActive: true },
    }),
    prisma.anomaly.count({
      where: { restaurantId, isResolved: false },
    }),
  ]);

  let totalHoursWorked = 0;
  for (const checkin of checkins) {
    const end = checkin.checkoutTime ?? now;
    const hours = (end.getTime() - checkin.checkinTime.getTime()) / (1000 * 60 * 60);
    totalHoursWorked += hours;
  }

  const totalAssignments = await prisma.shiftAssignment.count({
    where: {
      shift: { restaurantId, startTime: { gte: startOfWeek } },
    },
  });
  const attendanceRate =
    totalAssignments > 0 ? Math.round((checkins.length / totalAssignments) * 100) : 0;

  return {
    totalShiftsThisWeek,
    totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
    attendanceRate,
    activeEmployeesCount,
    anomalyCount,
  };
}

export async function getLaborCosts(restaurantId: string) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const checkins = await prisma.checkin.findMany({
    where: { restaurantId, checkinTime: { gte: startOfWeek } },
    include: {
      employee: { include: { user: true } },
      shiftAssignment: { include: { shift: true } },
    },
  });

  let todayCost = 0;
  let weekCost = 0;
  const employeeBreakdown: Record<string, { name: string; today: number; week: number }> = {};

  for (const ck of checkins) {
    const rate = ck.employee.hourlyRate ?? 0;
    const end = ck.checkoutTime ?? now;
    const hours = (end.getTime() - ck.checkinTime.getTime()) / (1000 * 60 * 60);
    const cost = hours * rate;

    if (ck.checkinTime >= startOfToday) {
      todayCost += cost;
    }
    weekCost += cost;

    const empId = ck.employeeId;
    const empName = ck.employee.user?.name ?? "Unknown";
    if (!employeeBreakdown[empId]) {
      employeeBreakdown[empId] = { name: empName, today: 0, week: 0 };
    }
    employeeBreakdown[empId].week += cost;
    if (ck.checkinTime >= startOfToday) {
      employeeBreakdown[empId].today += cost;
    }
  }

  const breakdown = Object.entries(employeeBreakdown).map(([id, data]) => ({
    employeeId: id,
    name: data.name,
    today: Math.round(data.today * 100) / 100,
    week: Math.round(data.week * 100) / 100,
  }));

  return {
    today: Math.round(todayCost * 100) / 100,
    week: Math.round(weekCost * 100) / 100,
    breakdown,
  };
}

export async function getByEmployee(restaurantId: string) {
  const employees = await prisma.employee.findMany({
    where: { restaurantId },
    include: {
      user: true,
      checkins: {
        where: { checkoutTime: { not: null } },
        include: { shiftAssignment: { include: { shift: true } } },
        orderBy: { checkinTime: "desc" },
        take: 50,
      },
      assignments: {
        include: { shift: true },
        orderBy: { shift: { startTime: "desc" } },
        take: 5,
      },
    },
  });

  const lateThresholdMs = 15 * 60 * 1000;

  return employees.map((emp) => {
    let totalHours = 0;
    let onTimeCount = 0;
    let totalCheckins = 0;
    for (const checkin of emp.checkins) {
      if (checkin.checkoutTime) {
        totalHours +=
          (checkin.checkoutTime.getTime() - checkin.checkinTime.getTime()) / (1000 * 60 * 60);
      }
      const shiftStart = checkin.shiftAssignment?.shift?.startTime;
      if (shiftStart) {
        totalCheckins += 1;
        const diff = checkin.checkinTime.getTime() - new Date(shiftStart).getTime();
        if (diff <= lateThresholdMs) onTimeCount += 1;
      }
    }
    const completedShifts = emp.assignments.filter((a) => a.status === "COMPLETED").length;
    const punctualityScore =
      totalCheckins > 0 ? Math.round((onTimeCount / totalCheckins) * 100) : 100;

    return {
      id: emp.id,
      userId: emp.userId,
      position: emp.position,
      isActive: emp.isActive,
      totalHours: Math.round(totalHours * 10) / 10,
      completedShifts,
      punctualityScore,
      user: emp.user,
    };
  });
}

export async function getWorkloadForecast(
  restaurantId: string,
  startDate: Date,
  endDate: Date
) {
  const now = new Date();
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const [historicalCheckins, upcomingShifts] = await Promise.all([
    prisma.checkin.findMany({
      where: {
        restaurantId,
        checkinTime: { gte: fourWeeksAgo },
        checkoutTime: { not: null },
      },
      include: { shiftAssignment: { include: { shift: true } } },
    }),
    prisma.shift.findMany({
      where: {
        restaurantId,
        startTime: { gte: startDate, lte: endDate },
        status: { in: ["SCHEDULED", "ACTIVE"] },
      },
      include: { assignments: true },
    }),
  ]);

  const slotDurationHours = 3;
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const countByDateSlot: Record<string, number> = {};

  for (const ck of historicalCheckins) {
    const start = new Date(ck.checkinTime);
    const dayOfWeek = start.getDay();
    const hour = Math.floor(start.getHours() / slotDurationHours) * slotDurationHours;
    const dateStr = start.toISOString().slice(0, 10);
    const slotKey = `${dayOfWeek}-${hour}`;
    const key = `${dateStr}|${slotKey}`;
    countByDateSlot[key] = (countByDateSlot[key] ?? 0) + 1;
  }

  const bySlot: Record<string, number[]> = {};
  for (const [key, count] of Object.entries(countByDateSlot)) {
    const slotKey = key.split("|")[1]!;
    if (!bySlot[slotKey]) bySlot[slotKey] = [];
    bySlot[slotKey].push(count);
  }

  const baselineBySlot: Record<string, number> = {};
  for (const [key, arr] of Object.entries(bySlot)) {
    const avg = arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    baselineBySlot[key] = Math.max(1, Math.ceil(avg * 1.1));
  }

  const slots: { day: string; start: string; end: string; needed: number; assigned: number; shortage: number }[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    for (let h = 0; h < 24; h += slotDurationHours) {
      const slotKey = `${dayOfWeek}-${h}`;
      const needed = baselineBySlot[slotKey] ?? 2;
      const slotStart = new Date(d);
      slotStart.setHours(h, 0, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(h + slotDurationHours, 0, 0, 0);

      let assigned = 0;
      for (const shift of upcomingShifts) {
        const shiftStart = new Date(shift.startTime);
        const shiftEnd = new Date(shift.endTime);
        if (shiftStart < slotEnd && shiftEnd > slotStart) {
          assigned += shift.assignments.filter((a) => a.status !== "CANCELLED").length;
        }
      }

      const shortage = Math.max(0, needed - assigned);
      if (shortage > 0 || assigned > 0) {
        slots.push({
          day: dayNames[dayOfWeek] + " " + d.toISOString().slice(0, 10),
          start: `${h.toString().padStart(2, "0")}:00`,
          end: `${(h + slotDurationHours).toString().padStart(2, "0")}:00`,
          needed,
          assigned,
          shortage,
        });
      }
    }
  }

  return { slots: slots.filter((s) => s.shortage > 0 || s.assigned > 0) };
}

function getInsightsRules(
  avgHoursPerEmployee: number,
  attendanceRate: number,
  anomalies: { isResolved: boolean }[],
  checkins: { checkinTime: Date; checkoutTime: Date | null }[],
  employees: { checkins: unknown[] }[]
) {
  const trends: { type: string; title: string; description: string; severity: string }[] = [];
  if (avgHoursPerEmployee > 40) {
    trends.push({
      type: "high-hours",
      title: "High Average Hours",
      description: `Team averaging ${Math.round(avgHoursPerEmployee)} hours/month`,
      severity: "info",
    });
  }
  if (attendanceRate < 85) {
    trends.push({
      type: "attendance",
      title: "Attendance Below Target",
      description: `Current attendance rate: ${attendanceRate}%`,
      severity: "warning",
    });
  }
  if (attendanceRate > 95) {
    trends.push({
      type: "excellent-attendance",
      title: "Excellent Attendance",
      description: "Your team has outstanding attendance",
      severity: "success",
    });
  }

  const recommendations: { id: string; title: string; action: string; priority: string }[] = [];
  if (anomalies.length > 5) {
    recommendations.push({
      id: "anomaly-review",
      title: "Review Scheduling Anomalies",
      action: "Check recurring scheduling conflicts",
      priority: "high",
    });
  }
  const avgCheckinTime = checkins.length > 0
    ? checkins.reduce((sum, ck) => sum + ck.checkinTime.getHours(), 0) / checkins.length
    : 0;
  if (avgCheckinTime > 9) {
    recommendations.push({
      id: "late-checkins",
      title: "Address Late Check-ins",
      action: "Team checking in after 9 AM on average",
      priority: "medium",
    });
  }
  if (employees.length > 0 && employees.filter((e) => e.checkins.length === 0).length > 2) {
    recommendations.push({
      id: "inactive-staff",
      title: "Review Inactive Staff",
      action: "Some team members have no recent activity",
      priority: "medium",
    });
  }
  recommendations.push({
    id: "optimize-schedule",
    title: "Optimize Next Week's Schedule",
    action: "Based on historical patterns and availability",
    priority: "low",
  });

  let staffingHealth = "optimal";
  if (attendanceRate < 75) staffingHealth = "critical";
  else if (attendanceRate < 85) staffingHealth = "warning";
  else if (attendanceRate < 90) staffingHealth = "caution";

  const predictedChallenges: { challenge: string; likelihood: string; suggestedAction: string }[] = [];
  if (anomalies.filter((a) => !a.isResolved).length > 0) {
    predictedChallenges.push({
      challenge: "Potential Schedule Conflicts",
      likelihood: "high",
      suggestedAction: "Review and adjust upcoming shifts",
    });
  }
  if (avgHoursPerEmployee > 50) {
    predictedChallenges.push({
      challenge: "Staff Burnout Risk",
      likelihood: "moderate",
      suggestedAction: "Consider reducing shifts or hiring additional staff",
    });
  }
  if (checkins.filter((ck) => !ck.checkoutTime).length > 0) {
    predictedChallenges.push({
      challenge: "Incomplete Check-outs",
      likelihood: "moderate",
      suggestedAction: "Remind staff to check out at end of shift",
    });
  }

  return { trends, recommendations, staffingHealth, predictedChallenges };
}

export async function getInsights(restaurantId: string) {
  const now = new Date();
  const lastMonth = new Date(now);
  lastMonth.setMonth(now.getMonth() - 1);

  const [employees, shifts, checkins, anomalies] = await Promise.all([
    prisma.employee.findMany({
      where: { restaurantId },
      include: {
        checkins: { where: { checkinTime: { gte: lastMonth } } },
        assignments: {
          where: { shift: { startTime: { gte: lastMonth } } },
          include: { shift: true },
        },
      },
    }),
    prisma.shift.findMany({
      where: { restaurantId, startTime: { gte: lastMonth } },
    }),
    prisma.checkin.findMany({
      where: { restaurantId, checkinTime: { gte: lastMonth } },
    }),
    prisma.anomaly.findMany({
      where: { restaurantId, detectedAt: { gte: lastMonth } },
    }),
  ]);

  const avgCheckinTime = checkins.length > 0
    ? checkins.reduce((sum, ck) => sum + ck.checkinTime.getHours(), 0) / checkins.length
    : 0;

  const totalHoursWorked = checkins.reduce((sum, ck) => {
    if (ck.checkoutTime) {
      return sum + (ck.checkoutTime.getTime() - ck.checkinTime.getTime()) / (1000 * 60 * 60);
    }
    return sum;
  }, 0);

  const avgHoursPerEmployee = employees.length > 0 ? totalHoursWorked / employees.length : 0;
  const attendanceRate =
    shifts.length > 0
      ? Math.round(
          (checkins.filter((ck) => ck.checkoutTime).length / (shifts.length * 0.8)) * 100
        )
      : 0;

  const metrics: InsightsMetrics = {
    avgHoursPerEmployee,
    attendanceRate,
    totalAnomalies: anomalies.length,
    activeEmployees: employees.filter((e) => e.isActive).length,
    avgCheckinTime,
    totalHoursWorked,
    unresolvedAnomalies: anomalies.filter((a) => !a.isResolved).length,
    incompleteCheckouts: checkins.filter((ck) => !ck.checkoutTime).length,
    inactiveStaffCount: employees.filter((e) => e.checkins.length === 0).length,
  };

  const aiResult = await generateAIInsights(metrics);
  const rules = getInsightsRules(
    avgHoursPerEmployee,
    attendanceRate,
    anomalies,
    checkins,
    employees
  );

  const { trends, recommendations, staffingHealth, predictedChallenges } =
    aiResult ?? rules;

  return {
    trends,
    recommendations,
    staffingHealth,
    predictedChallenges,
    metrics: {
      avgHoursPerEmployee: Math.round(avgHoursPerEmployee * 10) / 10,
      attendanceRate,
      totalAnomalies: anomalies.length,
      activeEmployees: employees.filter((e) => e.isActive).length,
    },
  };
}
