import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dailyWork, employees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const employeeId = parseInt(id);

  const employee = await db.query.employees.findFirst({
    where: eq(employees.id, employeeId),
  });
  if (!employee) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  const records = await db.query.dailyWork.findMany({
    where: eq(dailyWork.employeeId, employeeId),
    with: { operation: true, order: true },
  });

  let totalPieces = 0;
  let totalEarned = 0;
  const days = new Set<string>();
  let firstDate: string | null = null;
  let lastDate: string | null = null;

  type OpAgg = { name: string; pieces: number; earned: number };
  const byOrder = new Map<number, { orderId: number; orderName: string; pieces: number; earned: number; ops: Map<string, OpAgg> }>();
  const byOperation = new Map<string, OpAgg>();

  for (const r of records) {
    const earned = r.quantity * parseFloat(r.operation.pricePerUnit);
    totalPieces += r.quantity;
    totalEarned += earned;
    days.add(r.date);
    if (!firstDate || r.date < firstDate) firstDate = r.date;
    if (!lastDate || r.date > lastDate) lastDate = r.date;

    // Заказ + разбивка операций внутри заказа
    const o = byOrder.get(r.orderId) ?? {
      orderId: r.orderId,
      orderName: r.order?.name ?? "—",
      pieces: 0,
      earned: 0,
      ops: new Map<string, OpAgg>(),
    };
    o.pieces += r.quantity;
    o.earned += earned;
    const orderOp = o.ops.get(r.operation.name) ?? { name: r.operation.name, pieces: 0, earned: 0 };
    orderOp.pieces += r.quantity;
    orderOp.earned += earned;
    o.ops.set(r.operation.name, orderOp);
    byOrder.set(r.orderId, o);

    // Общая разбивка по операциям
    const op = byOperation.get(r.operation.name) ?? { name: r.operation.name, pieces: 0, earned: 0 };
    op.pieces += r.quantity;
    op.earned += earned;
    byOperation.set(r.operation.name, op);
  }

  return NextResponse.json({
    totals: {
      totalPieces,
      totalEarned,
      ordersCount: byOrder.size,
      operationsCount: byOperation.size,
      workingDays: days.size,
      firstDate,
      lastDate,
    },
    byOperation: [...byOperation.values()].sort((a, b) => b.earned - a.earned),
    byOrder: [...byOrder.values()]
      .map((o) => ({
        orderId: o.orderId,
        orderName: o.orderName,
        pieces: o.pieces,
        earned: o.earned,
        operations: [...o.ops.values()].sort((a, b) => b.earned - a.earned),
      }))
      .sort((a, b) => b.earned - a.earned),
  });
}
