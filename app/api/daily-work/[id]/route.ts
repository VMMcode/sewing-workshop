import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dailyWork } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(dailyWork).where(eq(dailyWork.id, parseInt(id)));
  return NextResponse.json({ ok: true });
}