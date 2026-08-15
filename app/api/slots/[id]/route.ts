import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existingBookings = await prisma.appointment.count({
    where: { slotId: id, cancelledAt: null },
  });
  if (existingBookings > 0) {
    return NextResponse.json(
      { error: "予約が入っている枠は削除できません" },
      { status: 409 }
    );
  }
  await prisma.availabilitySlot.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
