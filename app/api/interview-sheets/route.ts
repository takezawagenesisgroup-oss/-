import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { interviewSheetSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = interviewSheetSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { applicantId, answers } = parsed.data;

  const sheet = await prisma.interviewSheet.upsert({
    where: { applicantId },
    create: { applicantId, answers: JSON.stringify(answers) },
    update: { answers: JSON.stringify(answers), submittedAt: new Date() },
  });

  await prisma.applicant.update({
    where: { id: applicantId },
    data: { status: "SHEET_SUBMITTED" },
  });

  return NextResponse.json(sheet, { status: 201 });
}
