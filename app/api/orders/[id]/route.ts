import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderOperations, dailyWork } from "@/lib/db/schema";
import { eq, inArray, sql } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, parseInt(id)),
    with: { orderOperations: true },
  });

  if (!order) return NextResponse.json(order);

  // Кол-во записей выработки по каждой операции (чтобы предупреждать при удалении)
  const counts = await db
    .select({ operationId: dailyWork.operationId, count: sql<number>`cast(count(*) as int)` })
    .from(dailyWork)
    .where(eq(dailyWork.orderId, parseInt(id)))
    .groupBy(dailyWork.operationId);
  const countMap = new Map(counts.map((c) => [c.operationId, Number(c.count)]));

  return NextResponse.json({
    ...order,
    orderOperations: order.orderOperations.map((op) => ({
      ...op,
      workCount: countMap.get(op.id) ?? 0,
    })),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // Если архивируем
  if (body.archived !== undefined) {
    await db.update(orders)
      .set({ archived: body.archived })
      .where(eq(orders.id, parseInt(id)));
    return NextResponse.json({ ok: true });
  }

  // Обновление полей заказа
  const { name, description, fabricReceived, pricePerPiece, receivedAt, deadline, supplier, notes } = body;
  await db.update(orders).set({
    name,
    description: description ?? null,
    fabricReceived: fabricReceived ?? 0,
    pricePerPiece: pricePerPiece ?? null,
    receivedAt: receivedAt ?? null,
    deadline: deadline ?? null,
    supplier: supplier ?? null,
    notes: notes ?? null,
  }).where(eq(orders.id, parseInt(id)));

  // Удаление операций (каскадно удаляет связанные записи дневной выработки)
  if (body.deletedOperationIds?.length) {
    await db.delete(orderOperations).where(
      inArray(orderOperations.id, body.deletedOperationIds as number[])
    );
  }

  // Обновление существующих операций
  if (body.updatedOperations?.length) {
    for (const op of body.updatedOperations as { id: number; name: string; pricePerUnit: string }[]) {
      await db.update(orderOperations)
        .set({ name: op.name, pricePerUnit: op.pricePerUnit })
        .where(eq(orderOperations.id, op.id));
    }
  }

  // Если пришли новые операции — добавляем
  if (body.operations?.length) {
    await db.insert(orderOperations).values(
      body.operations.map((op: { name: string; pricePerUnit: string }) => ({
        orderId: parseInt(id),
        name: op.name,
        pricePerUnit: op.pricePerUnit,
      }))
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.update(orders)
    .set({ archived: 1 })
    .where(eq(orders.id, parseInt(id)));
  return NextResponse.json({ ok: true });
}