import { prisma } from "../prisma";
import { AppError } from "../middleware/error-handler";

const orderInclude = {
  items: { include: { menuItem: true }, orderBy: { createdAt: "asc" as const } },
  table: true,
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function recalculateOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      restaurant: { select: { taxRate: true } },
    },
  });

  if (!order) throw new AppError(404, "Order not found", "NOT_FOUND");

  const subtotal = round2(
    order.items
      .filter((item) => item.status !== "CANCELLED")
      .reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0),
  );
  const taxRate = order.restaurant.taxRate ?? 0;
  const taxAmount = round2(subtotal * taxRate);
  const totalAmount = round2(subtotal + taxAmount);

  return prisma.order.update({
    where: { id: orderId },
    data: { subtotal, taxAmount, totalAmount },
    include: orderInclude,
  });
}

export async function syncOrderStatus(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });
  if (!order || order.status === "PAID" || order.status === "CANCELLED") return order;

  const items = order.items.filter((item) => item.status !== "CANCELLED");
  if (items.length === 0) return order;

  const allServed = items.every((item) => item.status === "SERVED");
  const anyReady = items.some((item) => item.status === "READY" || item.status === "SERVED");
  const anyPreparing = items.some((item) => item.status === "PREPARING");

  let status = order.status;
  if (allServed) status = "SERVED";
  else if (anyReady) status = "READY";
  else if (anyPreparing) status = "PREPARING";
  else status = "OPEN";

  if (status === order.status) return order;

  return prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: orderInclude,
  });
}
