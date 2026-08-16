import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/constants";
import { CancelButton } from "./CancelButton";

export default async function CustomerDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CUSTOMER") redirect("/dashboard/craftsman");

  const requests = await prisma.jobRequest.findMany({
    where: { customerId: session.user.id },
    include: { craftsman: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">依頼履歴</h1>
        <Link
          href="/craftsmen"
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
        >
          新しく依頼する
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {requests.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
            まだ依頼はありません。職人一覧から依頼してみましょう。
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
                <Link
                  href={`/craftsmen/${r.craftsman.id}`}
                  className="text-sm text-amber-600 hover:underline"
                >
                  {r.craftsman.user.name}（{r.craftsman.category}）
                </Link>
              </div>
              <div className="text-right">
                <div className="text-xs text-neutral-500">提示金額</div>
                <div className="text-lg font-bold">¥{r.budget.toLocaleString()}</div>
              </div>
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-600">{r.description}</p>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-neutral-500">
              <span>希望日: {new Date(r.desiredDate).toLocaleDateString("ja-JP")}</span>
              <span>場所: {r.location}</span>
            </div>

            {r.status === "PENDING" && (
              <div className="mt-4">
                <CancelButton id={r.id} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
