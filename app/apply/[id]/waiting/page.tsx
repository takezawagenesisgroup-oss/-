import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { lineAddFriendUrl } from "@/lib/line";
import { PageShell } from "@/components/PageShell";

export const dynamic = "force-dynamic";

export default async function WaitingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const applicant = await prisma.applicant.findUnique({
    where: { id },
    include: { appointment: { include: { slot: true } }, interviewSheet: true },
  });

  if (!applicant) notFound();

  const dateLabel = applicant.appointment
    ? new Date(applicant.appointment.slot.startAt).toLocaleString("ja-JP", {
        month: "long",
        day: "numeric",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <PageShell title="面談日程が確定しました" step={3} totalSteps={3}>
      <div className="space-y-6">
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {dateLabel ? (
            <>
              面談日時: <span className="font-semibold">{dateLabel}</span>
            </>
          ) : (
            "日程調整中です"
          )}
        </div>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-800">
            ① LINEで通知を受け取る（任意・推奨）
          </h2>
          <p className="mb-2 text-xs leading-5 text-zinc-500">
            公式LINEを友だち追加後、下の連携コードをトーク画面にそのまま送信してください。日程のリマインドなどをお送りします。
          </p>
          <a
            href={lineAddFriendUrl()}
            target="_blank"
            rel="noreferrer"
            className="mb-2 inline-flex items-center justify-center rounded-full bg-[#06C755] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            公式LINEを友だち追加する
          </a>
          <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-center font-mono text-sm tracking-wider">
            {applicant.lineLinkCode}
          </div>
          {applicant.lineUserId ? (
            <p className="mt-1 text-xs text-emerald-700">連携済みです</p>
          ) : null}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-800">
            ② 面談シートを事前に入力する
          </h2>
          <p className="mb-3 text-xs leading-5 text-zinc-500">
            当日ご記入いただいていた面談シートを、事前にこちらから入力いただけます。完了しておくと当日はすぐに面談を開始できます。
          </p>
          {applicant.interviewSheet ? (
            <p className="text-sm text-emerald-700">✓ 入力済みです。ありがとうございました。</p>
          ) : (
            <Link
              href={`/interview-sheet/${applicant.id}`}
              className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              面談シートを入力する
            </Link>
          )}
        </section>
      </div>
    </PageShell>
  );
}
