import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const applicant = await prisma.applicant.findUnique({
    where: { id },
    include: { appointment: { include: { slot: true } }, interviewSheet: true },
  });
  if (!applicant) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(applicant);
}
