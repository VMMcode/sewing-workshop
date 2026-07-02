import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, dailyWork } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Аналитика по операциям заказа: сумма выработки по каждой операции,
// сравнение с числом изделий (fabricReceived) и разбивка по швеям.
// Перерасход = по операции сделано больше, чем изделий в заказе
// (по каждому изделию операция может быть проведена только один раз).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orderId = parseInt(id);

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { orderOperations: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  const records = await db.query.dailyWork.findMany({
    where: eq(dailyWork.orderId, orderId),
  });

  const itemCount = order.fabricReceived ?? 0;

  // Сумма и разбивка по швеям для каждой операции
  const totals = new Map<number, number>();
  const bySeamstress = new Map<number, Map<string, number>>();
  for (const r of records) {
    totals.set(r.operationId, (totals.get(r.operationId) ?? 0) + r.quantity);
    const seam = bySeamstress.get(r.operationId) ?? new Map<string, number>();
    seam.set(r.seamstressName, (seam.get(r.seamstressName) ?? 0) + r.quantity);
    bySeamstress.set(r.operationId, seam);
  }

  const operations = order.orderOperations.map((op) => {
    const total = totals.get(op.id) ?? 0;
    // Перерасход считаем только если число изделий задано (> 0)
    const overage = itemCount > 0 ? Math.max(0, total - itemCount) : 0;
    const seam = bySeamstress.get(op.id) ?? new Map<string, number>();
    return {
      operationId: op.id,
      name: op.name,
      pricePerUnit: op.pricePerUnit,
      total,
      overage,
      isOver: overage > 0,
      bySeamstress: [...seam.entries()]
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity),
    };
  });

  return NextResponse.json({
    orderId: order.id,
    orderName: order.name,
    itemCount,
    completed: order.status === "completed",
    completedAt: order.completedAt ?? null,
    hasOverage: operations.some((o) => o.isOver),
    operations,
  });
}
