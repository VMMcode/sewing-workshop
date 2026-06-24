import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

export async function GET() {
  const result = await db.query.employees.findMany({
    where: eq(employees.archived, 0),
    orderBy: asc(employees.name),
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { name, hiredAt, terminatedAt, skills } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Имя обязательно" }, { status: 400 });
  }

  const [employee] = await db.insert(employees).values({
    name: name.trim(),
    hiredAt: hiredAt || null,
    terminatedAt: terminatedAt || null,
    skills: Array.isArray(skills) && skills.length ? skills : null,
  }).returning();

  return NextResponse.json(employee);
}
