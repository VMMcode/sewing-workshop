import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dailyWork } from "@/lib/db/schema";

type OpAgg = { name: string; ops: number; earned: number };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  // Берём все записи один раз; период применяем в JS для ведомости,
  // а рентабельность считаем по всем записям (экономика заказа от периода не зависит).
  const all = await db.query.dailyWork.findMany({
    with: { operation: true, order: true },
  });

  // --- Рентабельность заказов (за всё время) ---
  const profit = new Map<number, { orderId: number; orderName: string; revenue: number | null; payout: number; itemCount: number; completed: boolean; completedAt: string | null; opTotals: Map<number, number> }>();
  for (const r of all) {
    const earned = r.quantity * parseFloat(r.operation.pricePerUnit);
    const price = r.order?.pricePerPiece ? parseFloat(r.order.pricePerPiece) : 0;
    const itemCount = r.order?.fabricReceived ?? 0;
    const revenue = price ? price * itemCount : null;
    const p = profit.get(r.orderId) ?? {
      orderId: r.orderId,
      orderName: r.order?.name ?? "—",
      revenue,
      payout: 0,
      itemCount,
      completed: r.order?.status === "completed",
      completedAt: r.order?.completedAt ?? null,
      opTotals: new Map<number, number>(),
    };
    p.payout += earned;
    // Сумма выработки по каждой операции — чтобы выявить перерасход
    p.opTotals.set(r.operationId, (p.opTotals.get(r.operationId) ?? 0) + r.quantity);
    profit.set(r.orderId, p);
  }
  const byOrderProfit = [...profit.values()]
    .map((p) => ({
      orderId: p.orderId,
      orderName: p.orderName,
      revenue: p.revenue,
      payout: p.payout,
      margin: p.revenue != null ? p.revenue - p.payout : null,
      marginPct: p.revenue ? (p.revenue - p.payout) / p.revenue : null,
      completed: p.completed,
      completedAt: p.completedAt,
      // Перерасход: по какой-либо операции сделано больше, чем изделий в заказе
      hasOverage: p.itemCount > 0 && [...p.opTotals.values()].some((t) => t > p.itemCount),
    }))
    .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0));

  const totalRevenue = byOrderProfit.reduce((s, o) => s + (o.revenue ?? 0), 0);
  const totalPayoutAll = byOrderProfit.reduce((s, o) => s + o.payout, 0);

  // --- Ведомость к выплате за период: швея → заказ → операция ---
  const filtered = all.filter(
    (r) => (!dateFrom || r.date >= dateFrom) && (!dateTo || r.date <= dateTo)
  );

  let totalEarned = 0;
  let totalOps = 0;
  const periodOrders = new Set<number>();

  type OrderAgg = { orderId: number; orderName: string; ops: number; earned: number; operations: Map<string, OpAgg> };
  const seam = new Map<string, { name: string; ops: number; earned: number; orders: Map<number, OrderAgg> }>();

  for (const r of filtered) {
    const earned = r.quantity * parseFloat(r.operation.pricePerUnit);
    totalEarned += earned;
    totalOps += r.quantity;
    periodOrders.add(r.orderId);

    const s = seam.get(r.seamstressName) ?? { name: r.seamstressName, ops: 0, earned: 0, orders: new Map() };
    s.ops += r.quantity;
    s.earned += earned;

    const o = s.orders.get(r.orderId) ?? {
      orderId: r.orderId,
      orderName: r.order?.name ?? "—",
      ops: 0,
      earned: 0,
      operations: new Map(),
    };
    o.ops += r.quantity;
    o.earned += earned;

    const op = o.operations.get(r.operation.name) ?? { name: r.operation.name, ops: 0, earned: 0 };
    op.ops += r.quantity;
    op.earned += earned;
    o.operations.set(r.operation.name, op);

    s.orders.set(r.orderId, o);
    seam.set(r.seamstressName, s);
  }

  const bySeamstress = [...seam.values()]
    .map((s) => ({
      name: s.name,
      ops: s.ops,
      earned: s.earned,
      orders: [...s.orders.values()]
        .map((o) => ({
          orderId: o.orderId,
          orderName: o.orderName,
          ops: o.ops,
          earned: o.earned,
          operations: [...o.operations.values()].sort((a, b) => b.earned - a.earned),
        }))
        .sort((a, b) => b.earned - a.earned),
    }))
    .sort((a, b) => b.earned - a.earned);

  return NextResponse.json({
    totals: {
      totalEarned,
      totalOps,
      seamstressCount: seam.size,
      ordersCount: periodOrders.size,
    },
    profit: {
      totalRevenue,
      totalPayout: totalPayoutAll,
      totalMargin: totalRevenue - totalPayoutAll,
    },
    byOrderProfit,
    bySeamstress,
  });
}
