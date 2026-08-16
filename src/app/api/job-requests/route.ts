import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COMMISSION_RATE } from "@/lib/constants";

const createSchema = z.object({
  craftsmanId: z.string().min(1),
  title: z.string().min(1, "件名を入力してください"),
  description: z.string().min(1, "作業内容を入力してください"),
  desiredDate: z.string().min(1, "希望日を入力してください"),
  location: z.string().min(1, "作業場所を入力してください"),
  budget: z.coerce.number().int().min(1000, "金額は1,000円以上で入力してください"),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "お客様アカウントでログインしてください" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "入力内容を確認してください" },
      { status: 400 }
    );
  }

  const craftsman = await prisma.craftsmanProfile.findUnique({
    where: { id: parsed.data.craftsmanId },
  });
  if (!craftsman || !craftsman.isActive) {
    return NextResponse.json({ error: "対象の職人が見つかりません" }, { status: 404 });
  }

  const jobRequest = await prisma.jobRequest.create({
    data: {
      customerId: session.user.id,
      craftsmanId: craftsman.id,
      title: parsed.data.title,
      description: parsed.data.description,
      desiredDate: new Date(parsed.data.desiredDate),
      location: parsed.data.location,
      budget: parsed.data.budget,
      commissionRate: COMMISSION_RATE,
    },
  });

  return NextResponse.json({ ok: true, jobRequest });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
  }

  if (session.user.role === "CUSTOMER") {
    const requests = await prisma.jobRequest.findMany({
      where: { customerId: session.user.id },
      include: { craftsman: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ requests });
  }

  const profile = await prisma.craftsmanProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    return NextResponse.json({ requests: [] });
  }

  const requests = await prisma.jobRequest.findMany({
    where: { craftsmanId: profile.id },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ requests });
}
