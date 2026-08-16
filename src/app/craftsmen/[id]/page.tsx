import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { DAYS, GENDER_LABEL } from "@/lib/constants";

export default async function CraftsmanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const craftsman = await prisma.craftsmanProfile.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!craftsman) notFound();

  const days = craftsman.availableDays
    .split(",")
    .filter(Boolean)
    .map((d) => DAYS.find((x) => x.key === d)?.label);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/craftsmen" className="text-sm text-neutral-500 hover:text-neutral-800">
        ← 職人一覧に戻る
      </Link>

      <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              {craftsman.category}
            </span>
            <h1 className="mt-3 text-2xl font-bold">{craftsman.user.name}</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {craftsman.age}歳・{GENDER_LABEL[craftsman.gender]}・経験{craftsman.yearsExperience}年
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-neutral-500">目安単価</div>
            <div className="text-xl font-bold">¥{craftsman.hourlyRate.toLocaleString()} / 時</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold text-neutral-700">得意分野</h2>
            <p className="mt-1 text-sm text-neutral-600">{craftsman.specialty || "未設定"}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-700">対応エリア</h2>
            <p className="mt-1 text-sm text-neutral-600">{craftsman.area || "未設定"}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-700">できること</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {craftsman.skills
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((s) => (
                  <span key={s} className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700">
                    {s}
                  </span>
                ))}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-700">稼働可能な曜日</h2>
            <p className="mt-1 text-sm text-neutral-600">{days.join(" ") || "未設定"}</p>
          </div>
        </div>

        {craftsman.bio && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-neutral-700">自己紹介</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{craftsman.bio}</p>
          </div>
        )}

        <div className="mt-8 border-t border-neutral-200 pt-6">
          {!session?.user && (
            <Link
              href={`/login?callbackUrl=/craftsmen/${craftsman.id}/request`}
              className="block w-full rounded-lg bg-amber-500 py-3 text-center font-semibold text-white hover:bg-amber-600"
            >
              ログインして依頼する
            </Link>
          )}
          {session?.user?.role === "CUSTOMER" && (
            <Link
              href={`/craftsmen/${craftsman.id}/request`}
              className="block w-full rounded-lg bg-amber-500 py-3 text-center font-semibold text-white hover:bg-amber-600"
            >
              この職人に依頼する
            </Link>
          )}
          {session?.user?.role === "CRAFTSMAN" && (
            <p className="text-center text-sm text-neutral-400">
              職人アカウントでは依頼を送ることはできません。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
