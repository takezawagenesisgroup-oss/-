import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STATUS_LABEL, STATUS_COLOR, COMMISSION_RATE } from "@/lib/constants";
import { JobRequestActions } from "./JobRequestActions";

export default async function CraftsmanDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CRAFTSMAN") redirect("/craftsmen");

  const profile = await prisma.craftsmanProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/craftsmen");

  const requests = await prisma.jobRequest.findMany({
    where: { craftsmanId: profile.id },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  const pending = requests.filter((r) => r.status === "PENDING");
  const completedCount = requests.filter((r) => r.status === "COMPLETED").length;
  const totalEarned = requests
    .filter((r) => r.status === "COMPLETED")
    .reduce((sum, r) => sum + Math.round(r.budget * (1 - r.commissionRate)), 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">職人ダッシュボード</h1>
        <Link
          href="/profile/edit"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
        >
          プロフィールを編集
        </Link>
      </div>

      {!profile.isActive && (
        <div className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          プロフィールが非公開になっています。お客様から依頼を受けるには
          <Link href="/profile/edit" className="mx-1 font-semibold underline">
            プロフィール編集
          </Link>
          から公開設定をONにしてください。
        </div>
      )}

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="text-xs text-neutral-500">回答待ちの依頼</div>
          <div className="mt-1 text-2xl font-bold">{pending.length}件</div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="text-xs text-neutral-500">完了した依頼</div>
          <div className="mt-1 text-2xl font-bold">{completedCount}件</div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="text-xs text-neutral-500">累計受取額（手数料{Math.round(COMMISSION_RATE * 100)}%控除後）</div>
          <div className="mt-1 text-2xl font-bold">¥{totalEarned.toLocaleString()}</div>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-bold">依頼一覧</h2>
      <div className="mt-3 space-y-3">
        {requests.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
            まだ依頼が届いていません。プロフィールを充実させて公開しましょう。
          </p>
        )}

        {requests.map((r) => (
          <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                </span>
                <h3 className="mt-2 text-lg font-bold">{r.title}</h3>
                <p className="text-sm text-neutral-500">依頼者: {r.customer.name}</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-neutral-500">提示金額</div>
                <div className="text-lg font-bold">¥{r.budget.toLocaleString()}</div>
                <div className="text-xs text-neutral-400">
                  受取目安 ¥{Math.round(r.budget * (1 - r.commissionRate)).toLocaleString()}
                </div>
              </div>
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-600">{r.description}</p>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-neutral-500">
              <span>希望日: {new Date(r.desiredDate).toLocaleDateString("ja-JP")}</span>
              <span>場所: {r.location}</span>
            </div>

            <div className="mt-4">
              <JobRequestActions id={r.id} status={r.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
