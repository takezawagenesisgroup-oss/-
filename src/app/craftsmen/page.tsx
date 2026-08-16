import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CATEGORIES, DAYS, GENDER_LABEL } from "@/lib/constants";

export default async function CraftsmenListPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; area?: string; gender?: string }>;
}) {
  const params = await searchParams;

  const craftsmen = await prisma.craftsmanProfile.findMany({
    where: {
      isActive: true,
      ...(params.category ? { category: params.category } : {}),
      ...(params.area ? { area: { contains: params.area } } : {}),
      ...(params.gender ? { gender: params.gender as never } : {}),
    },
    include: { user: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold">職人を探す</h1>
      <p className="mt-1 text-sm text-neutral-500">
        分野やエリアで絞り込んで、お仕事を依頼したい職人を見つけましょう。
      </p>

      <form className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <div>
          <label className="block text-xs font-medium text-neutral-500">分野</label>
          <select
            name="category"
            defaultValue={params.category ?? ""}
            className="mt-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">すべて</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">エリア</label>
          <input
            name="area"
            defaultValue={params.area ?? ""}
            placeholder="例）東京都"
            className="mt-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">性別</label>
          <select
            name="gender"
            defaultValue={params.gender ?? ""}
            className="mt-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">すべて</option>
            <option value="MALE">男性</option>
            <option value="FEMALE">女性</option>
            <option value="OTHER">その他</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
        >
          検索
        </button>
      </form>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {craftsmen.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
            条件に合う職人が見つかりませんでした。
          </p>
        )}

        {craftsmen.map((c) => (
          <Link
            key={c.id}
            href={`/craftsmen/${c.id}`}
            className="rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-amber-400 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                {c.category}
              </span>
              <span className="text-xs text-neutral-400">経験{c.yearsExperience}年</span>
            </div>
            <h2 className="mt-3 text-lg font-bold">{c.user.name}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{c.specialty || "得意分野未設定"}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
              <span>{c.area || "エリア未設定"}</span>
              <span>{c.age}歳・{GENDER_LABEL[c.gender]}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-900">
                目安 ¥{c.hourlyRate.toLocaleString()} / 時
              </span>
              <span className="text-xs text-neutral-400">
                {c.availableDays
                  .split(",")
                  .filter(Boolean)
                  .map((d) => DAYS.find((x) => x.key === d)?.label)
                  .join(" ")}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
