import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { interviewSheetFields } from "@/lib/interviewSheetFields";

export const dynamic = "force-dynamic";

export default async function ApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const applicant = await prisma.applicant.findUnique({
    where: { id },
    include: {
      appointment: { include: { slot: true } },
      interviewSheet: true,
      notifications: { orderBy: { sentAt: "desc" } },
    },
  });

  if (!applicant) notFound();

  const answers = applicant.interviewSheet
    ? (JSON.parse(applicant.interviewSheet.answers) as Record<string, string>)
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/admin/applicants" className="mb-6 inline-block text-sm text-emerald-700 underline">
        ← 応募者一覧に戻る
      </Link>

      <h1 className="mb-6 text-xl font-bold">{applicant.name} さんの詳細</h1>

      <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-800">基礎情報</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Row label="氏名（フリガナ）" value={`${applicant.name}${applicant.nameKana ? `（${applicant.nameKana}）` : ""}`} />
          <Row label="メール" value={applicant.email} />
          <Row label="電話番号" value={applicant.phone} />
          <Row label="生年月日" value={applicant.birthDate ? new Date(applicant.birthDate).toLocaleDateString("ja-JP") : "-"} />
          <Row label="住所" value={applicant.address || "-"} />
          <Row label="希望職種" value={applicant.desiredPosition || "-"} />
          <Row label="応募媒体" value={applicant.source || "-"} />
        </dl>
      </section>

      <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-800">面談日程</h2>
        {applicant.appointment ? (
          <p className="text-sm">
            {new Date(applicant.appointment.slot.startAt).toLocaleString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        ) : (
          <p className="text-sm text-zinc-500">未確定</p>
        )}
      </section>

      <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-800">面談シート</h2>
        {answers ? (
          <dl className="space-y-3 text-sm">
            {interviewSheetFields.map((field) => (
              <Row key={field.name} label={field.label} value={answers[field.name] || "-"} block />
            ))}
          </dl>
        ) : (
          <p className="text-sm text-zinc-500">未提出です。</p>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-800">通知履歴</h2>
        <ul className="space-y-1 text-xs text-zinc-500">
          {applicant.notifications.map((n) => (
            <li key={n.id}>
              {new Date(n.sentAt).toLocaleString("ja-JP")} - {n.type} -{" "}
              {n.success ? "送信済" : `未送信（${n.error}）`}
            </li>
          ))}
          {applicant.notifications.length === 0 ? <li>通知履歴はありません。</li> : null}
        </ul>
      </section>
    </div>
  );
}

function Row({ label, value, block }: { label: string; value: string; block?: boolean }) {
  return (
    <div className={block ? "" : "contents"}>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className={block ? "mb-2 whitespace-pre-wrap" : ""}>{value}</dd>
    </div>
  );
}
