import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dailyWork, employees } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const conditions = [];
  if (orderId) conditions.push(eq(dailyWork.orderId, parseInt(orderId)));
  if (dateFrom) conditions.push(gte(dailyWork.date, dateFrom));
  if (dateTo) conditions.push(lte(dailyWork.date, dateTo));

  const result = await db.query.dailyWork.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    with: {
      operation: true,
    },
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { orderId, seamstressName, operationId, quantity, date, employeeId } = await req.json();

  // Связь с сотрудником: берём переданный employeeId, иначе ищем по имени
  let resolvedEmployeeId: number | null = employeeId ?? null;
  if (!resolvedEmployeeId && seamstressName) {
    const emp = await db.query.employees.findFirst({
      where: eq(employees.name, seamstressName),
    });
    resolvedEmployeeId = emp?.id ?? null;
  }

  const [record] = await db.insert(dailyWork).values({
    orderId,
    seamstressName,
    employeeId: resolvedEmployeeId,
    operationId,
    quantity,
    date,
  }).returning();

  return NextResponse.json(record);
}