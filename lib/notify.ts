import { prisma } from "@/lib/prisma";
import { pushLineMessage } from "@/lib/line";
import type { NotificationType } from "@/app/generated/prisma/enums";

export async function notifyApplicant(
  applicantId: string,
  type: NotificationType,
  message: string
) {
  const applicant = await prisma.applicant.findUnique({ where: { id: applicantId } });
  if (!applicant) return;

  let success = true;
  let error: string | undefined;

  if (applicant.lineUserId) {
    const result = await pushLineMessage(applicant.lineUserId, message);
    success = result.success;
    error = result.error;
  } else {
    // LINE未連携の場合は通知ログのみ残し、Web上のステータス表示に頼る
    success = false;
    error = "LINE未連携のため送信スキップ";
  }

  await prisma.notification.create({
    data: { applicantId, type, message, success, error },
  });
}
