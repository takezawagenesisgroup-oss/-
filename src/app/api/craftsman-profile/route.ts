import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  category: z.string().min(1),
  skills: z.string().min(1, "できることを入力してください"),
  specialty: z.string().min(1, "得意分野を入力してください"),
  age: z.coerce.number().int().min(16).max(100),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNSPECIFIED"]),
  area: z.string().min(1, "対応エリアを入力してください"),
  hourlyRate: z.coerce.number().int().min(0),
  yearsExperience: z.coerce.number().int().min(0).max(80),
  bio: z.string().optional().default(""),
  availableDays: z.array(z.string()).min(1, "稼働可能な曜日を選択してください"),
  isActive: z.boolean().optional().default(true),
});

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CRAFTSMAN") {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "入力内容を確認してください" },
      { status: 400 }
    );
  }

  const { availableDays, ...rest } = parsed.data;

  const profile = await prisma.craftsmanProfile.update({
    where: { userId: session.user.id },
    data: {
      ...rest,
      availableDays: availableDays.join(","),
    },
  });

  return NextResponse.json({ ok: true, profile });
}
