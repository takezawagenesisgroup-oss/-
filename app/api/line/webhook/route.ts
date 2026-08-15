import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyLineSignature, replyLineMessage, isLineConfigured } from "@/lib/line";

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
};

const WELCOME_MESSAGE =
  "友だち追加ありがとうございます。\nWebフォームで発行された連携コードをこのトーク画面に送信すると、面談日程などの通知を受け取れるようになります。";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (isLineConfigured) {
    const signature = req.headers.get("x-line-signature");
    if (!verifyLineSignature(rawBody, signature)) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  const body = JSON.parse(rawBody) as { events: LineEvent[] };

  for (const event of body.events ?? []) {
    const userId = event.source?.userId;
    if (!userId) continue;

    if (event.type === "follow" && event.replyToken) {
      await replyLineMessage(event.replyToken, WELCOME_MESSAGE);
      continue;
    }

    if (event.type === "message" && event.message?.type === "text" && event.message.text && event.replyToken) {
      const code = event.message.text.trim();
      const applicant = await prisma.applicant.findUnique({ where: { lineLinkCode: code } });

      if (!applicant) {
        await replyLineMessage(
          event.replyToken,
          "連携コードが確認できませんでした。Webフォームに表示されたコードを再度お送りください。"
        );
        continue;
      }

      await prisma.applicant.update({
        where: { id: applicant.id },
        data: { lineUserId: userId },
      });

      await replyLineMessage(
        event.replyToken,
        `${applicant.name}様\n連携が完了しました。今後の面談に関する通知はこのトークにお送りします。`
      );
    }
  }

  return NextResponse.json({ ok: true });
}
