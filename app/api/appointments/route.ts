import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { appointmentSchema } from "@/lib/validation";
import { notifyApplicant } from "@/lib/notify";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = appointmentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { applicantId, slotId } = parsed.data;

  try {
    const appointment = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.appointment.findUnique({ where: { applicantId } });
      if (existing && !existing.cancelledAt) {
        throw new Error("ALREADY_BOOKED");
      }

      const slot = await tx.availabilitySlot.findUnique({
        where: { id: slotId },
        include: { appointments: { where: { cancelledAt: null } } },
      });
      if (!slot) throw new Error("SLOT_NOT_FOUND");
      if (slot.appointments.length >= slot.capacity) throw new Error("SLOT_FULL");

      const created = existing
        ? await tx.appointment.update({
            where: { applicantId },
            data: { slotId, cancelledAt: null },
            include: { slot: true },
          })
        : await tx.appointment.create({
            data: { applicantId, slotId },
            include: { slot: true },
          });

      await tx.applicant.update({
        where: { id: applicantId },
        data: { status: "SLOT_SELECTED" },
      });

      return created;
    });

    const dateLabel = format(appointment.slot.startAt, "yyyy/MM/dd HH:mm");
    await notifyApplicant(
      applicantId,
      "SCHEDULE_CONFIRMED",
      `面談日程が確定しました。\n日時: ${dateLabel}\n当日までに面談シートのご入力をお願いいたします。`
    );

    return NextResponse.json(appointment, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";
    const statusMap: Record<string, number> = {
      ALREADY_BOOKED: 409,
      SLOT_NOT_FOUND: 404,
      SLOT_FULL: 409,
    };
    return NextResponse.json(
      { error: message },
      { status: statusMap[message] || 500 }
    );
  }
}
