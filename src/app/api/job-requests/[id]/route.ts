import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  action: z.enum(["ACCEPT", "DECLINE", "CANCEL", "COMPLETE"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const jobRequest = await prisma.jobRequest.findUnique({
    where: { id },
    include: { craftsman: true },
  });
  if (!jobRequest) {
    return NextResponse.json({ error: "依頼が見つかりません" }, { status: 404 });
  }

  const { action } = parsed.data;
  const isCraftsman =
    session.user.role === "CRAFTSMAN" && jobRequest.craftsman.userId === session.user.id;
  const isCustomer = session.user.role === "CUSTOMER" && jobRequest.customerId === session.user.id;

  if (action === "ACCEPT" || action === "DECLINE") {
    if (!isCraftsman) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }
    if (jobRequest.status !== "PENDING") {
      return NextResponse.json({ error: "この依頼は既に処理されています" }, { status: 409 });
    }
  } else if (action === "CANCEL") {
    if (!isCustomer) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }
    if (jobRequest.status !== "PENDING") {
      return NextResponse.json({ error: "この依頼は既に処理されています" }, { status: 409 });
    }
  } else if (action === "COMPLETE") {
    if (!isCraftsman) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }
    if (jobRequest.status !== "ACCEPTED") {
      return NextResponse.json({ error: "受諾済みの依頼のみ完了にできます" }, { status: 409 });
    }
  }

  const statusMap = {
    ACCEPT: "ACCEPTED",
    DECLINE: "DECLINED",
    CANCEL: "CANCELLED",
    COMPLETE: "COMPLETED",
  } as const;

  const updated = await prisma.jobRequest.update({
    where: { id },
    data: { status: statusMap[action] },
  });

  return NextResponse.json({ ok: true, jobRequest: updated });
}
