import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slotSchema } from "@/lib/validation";

export async function GET() {
  const slots = await prisma.availabilitySlot.findMany({
    where: { startAt: { gte: new Date() } },
    orderBy: { startAt: "asc" },
    include: { appointments: { where: { cancelledAt: null } } },
  });

  const withRemaining = slots.map((slot) => ({
    id: slot.id,
    startAt: slot.startAt,
    endAt: slot.endAt,
    capacity: slot.capacity,
    note: slot.note,
    remaining: slot.capacity - slot.appointments.length,
  }));

  return NextResponse.json(withRemaining.filter((s) => s.remaining > 0));
}

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = slotSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const slot = await prisma.availabilitySlot.create({
    data: {
      startAt: new Date(data.startAt),
      endAt: new Date(data.endAt),
      capacity: data.capacity,
      note: data.note || null,
    },
  });

  return NextResponse.json(slot, { status: 201 });
}
