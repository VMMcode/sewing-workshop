import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, hiredAt, terminatedAt, skills } = await req.json();

  await db.update(employees).set({
    name: name?.trim(),
    hiredAt: hiredAt || null,
    terminatedAt: terminatedAt || null,
    skills: Array.isArray(skills) && skills.length ? skills : null,
  }).where(eq(employees.id, parseInt(id)));

  return NextResponse.json({ ok: true });
}

// Мягкое удаление: запись не стирается, ставится флаг archived
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.update(employees)
    .set({ archived: 1 })
    .where(eq(employees.id, parseInt(id)));
  return NextResponse.json({ ok: true });
}
