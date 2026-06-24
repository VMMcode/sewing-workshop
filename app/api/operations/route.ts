import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orderOperations } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

// Список уникальных названий операций (для подсказок в навыках сотрудников)
export async function GET() {
  const rows = await db
    .selectDistinct({ name: orderOperations.name })
    .from(orderOperations)
    .orderBy(asc(orderOperations.name));
  return NextResponse.json(rows.map((r) => r.name));
}
