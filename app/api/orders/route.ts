import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderOperations } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  const result = await db.query.orders.findMany({
    where: eq(orders.archived, 0),
    orderBy: desc(orders.createdAt),
    with: {
      orderOperations: true,
    },
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { name, description, fabricReceived, fabricSewn, receivedAt, deadline, supplier, notes, operations } = await req.json();

  const [order] = await db.insert(orders).values({
    name,
    description: description ?? null,
    fabricReceived: fabricReceived ?? 0,
    fabricSewn: fabricSewn ?? 0,
    receivedAt: receivedAt ?? null,
    deadline: deadline ?? null,
    supplier: supplier ?? null,
    notes: notes ?? null,
  }).returning();

  if (operations?.length) {
    await db.insert(orderOperations).values(
      operations.map((op: { name: string; pricePerUnit: string }) => ({
        orderId: order.id,
        name: op.name,
        pricePerUnit: op.pricePerUnit,
      }))
    );
  }

  return NextResponse.json(order);
}