import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderOperations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, parseInt(id)),
    with: { orderOperations: true },
  });
  return NextResponse.json(order);
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
  const { name, description, fabricReceived, receivedAt, deadline, supplier, notes } = body;
  await db.update(orders).set({
    name,
    description: description ?? null,
    fabricReceived: fabricReceived ?? 0,
    receivedAt: receivedAt ?? null,
    deadline: deadline ?? null,
    supplier: supplier ?? null,
    notes: notes ?? null,
  }).where(eq(orders.id, parseInt(id)));

  // Если пришли операции — добавляем новые
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