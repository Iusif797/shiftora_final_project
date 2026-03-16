import { prisma } from "../prisma";

interface GenerateShiftsParams {
  restaurantId: string;
  userId: string;
  startDate?: Date;
  endDate?: Date;
}

interface CreatedShift {
  shift: { id: string };
  assignments: unknown[];
}

export async function generateShifts(params: GenerateShiftsParams): Promise<{ created: CreatedShift[] }> {
  const { restaurantId, userId } = params;
  const startDate =
    params.startDate ??
    (() => {
      const d = new Date();
      d.setDate(d.getDate() + ((7 - d.getDay()) % 7) || 7);
      d.setHours(0, 0, 0, 0);
      return d;
    })();
  const endDate =
    params.endDate ?? new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);

  const [employees, existingShifts, historicalCheckins] = await Promise.all([
    prisma.employee.findMany({
      where: { restaurantId, isActive: true },
      include: { user: true },
    }),
    prisma.shift.findMany({
      where: {
        restaurantId,
        startTime: { gte: startDate, lte: endDate },
        status: { in: ["SCHEDULED", "ACTIVE"] },
      },
      include: { assignments: true },
    }),
    prisma.checkin.findMany({
      where: {
        restaurantId,
        checkinTime: { gte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) },
        checkoutTime: { not: null },
      },
      include: { shiftAssignment: { include: { shift: true } } },
    }),
  ]);

  const slotDurationHours = 3;
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

  const existingBySlot: Record<string, number> = {};
  for (const shift of existingShifts) {
    const start = new Date(shift.startTime);
    const dayOfWeek = start.getDay();
    const hour = Math.floor(start.getHours() / slotDurationHours) * slotDurationHours;
    const dateStr = start.toISOString().slice(0, 10);
    const slotKey = `${dayOfWeek}-${hour}`;
    const key = `${dateStr}|${slotKey}`;
    existingBySlot[key] = (existingBySlot[key] ?? 0) + shift.assignments.length;
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const created: CreatedShift[] = [];
  const employeeUsage: Record<string, number> = {};

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const dateStr = d.toISOString().slice(0, 10);
    for (let h = 9; h < 22; h += slotDurationHours) {
      const slotKey = `${dayOfWeek}-${h}`;
      const needed = baselineBySlot[slotKey] ?? 2;
      const key = `${dateStr}|${slotKey}`;
      const existing = existingBySlot[key] ?? 0;
      const shortage = Math.max(0, needed - existing);
      if (shortage === 0) continue;

      const slotStart = new Date(d);
      slotStart.setHours(h, 0, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(h + slotDurationHours, 0, 0, 0);

      const shift = await prisma.shift.create({
        data: {
          restaurantId,
          title: `${dayNames[dayOfWeek]} ${h}:00`,
          startTime: slotStart,
          endTime: slotEnd,
          status: "SCHEDULED",
          createdById: userId,
        },
      });

      const sorted = [...employees].sort(
        (a, b) => (employeeUsage[a.id] ?? 0) - (employeeUsage[b.id] ?? 0)
      );
      const toAssign = sorted.slice(0, shortage);
      const assignments: unknown[] = [];

      for (const emp of toAssign) {
        const a = await prisma.shiftAssignment.create({
          data: { shiftId: shift.id, employeeId: emp.id },
          include: { employee: { include: { user: true } } },
        });
        assignments.push(a);
        employeeUsage[emp.id] = (employeeUsage[emp.id] ?? 0) + 1;
      }

      created.push({ shift, assignments });
    }
  }

  return { created };
}
