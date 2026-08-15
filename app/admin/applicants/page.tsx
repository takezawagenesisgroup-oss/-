import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  BASIC_INFO_SUBMITTED: "基礎情報のみ",
  SLOT_SELECTED: "日程確定",
  SHEET_SUBMITTED: "面談シート提出済",
  INTERVIEW_DONE: "面談完了",
  CANCELLED: "キャンセル",
};

const statusColor: Record<string, string> = {
  BASIC_INFO_SUBMITTED: "bg-zinc-100 text-zinc-600",
  SLOT_SELECTED: "bg-blue-100 text-blue-700",
  SHEET_SUBMITTED: "bg-emerald-100 text-emerald-700",
  INTERVIEW_DONE: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function AdminApplicantsPage() {
  const applicants = await prisma.applicant.findMany({
    orderBy: { createdAt: "desc" },
    include: { appointment: { include: { slot: true } }, interviewSheet: true },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">応募者一覧</h1>
        <Link href="/admin/slots" className="text-sm text-emerald-700 underline">
          面談枠の管理へ
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
              <th className="px-4 py-3">氏名</th>
              <th className="px-4 py-3">連絡先</th>
              <th className="px-4 py-3">希望職種</th>
              <th className="px-4 py-3">面談日時</th>
              <th className="px-4 py-3">LINE連携</th>
              <th className="px-4 py-3">ステータス</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {applicants.map((a) => (
              <tr key={a.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-3 font-medium">{a.name}</td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {a.email}
                  <br />
                  {a.phone}
                </td>
                <td className="px-4 py-3">{a.desiredPosition || "-"}</td>
                <td className="px-4 py-3">
                  {a.appointment
                    ? new Date(a.appointment.slot.startAt).toLocaleString("ja-JP", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "未確定"}
                </td>
                <td className="px-4 py-3">{a.lineUserId ? "✓ 連携済" : "-"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs ${statusColor[a.status]}`}>
                    {statusLabel[a.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/applicants/${a.id}`} className="text-emerald-700 underline">
                    詳細
                  </Link>
                </td>
              </tr>
            ))}
            {applicants.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                  応募者はまだいません。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
