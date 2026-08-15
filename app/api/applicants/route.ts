import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { basicInfoSchema } from "@/lib/validation";
import { notifyApplicant } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = basicInfoSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const applicant = await prisma.applicant.create({
    data: {
      name: data.name,
      nameKana: data.nameKana || null,
      email: data.email,
      phone: data.phone,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      address: data.address || null,
      desiredPosition: data.desiredPosition || null,
      source: data.source || null,
    },
  });

  await notifyApplicant(
    applicant.id,
    "APPLICATION_RECEIVED",
    `${applicant.name}様\nご応募ありがとうございます。続けて面談日程の選択にお進みください。`
  );

  return NextResponse.json({ id: applicant.id, lineLinkCode: applicant.lineLinkCode }, { status: 201 });
}

export async function GET() {
  const applicants = await prisma.applicant.findMany({
    orderBy: { createdAt: "desc" },
    include: { appointment: { include: { slot: true } }, interviewSheet: true },
  });
  return NextResponse.json(applicants);
}
