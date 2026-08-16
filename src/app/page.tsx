import Link from "next/link";
import { COMMISSION_RATE } from "@/lib/constants";

const STEPS = [
  {
    title: "職人が登録",
    desc: "できること・得意分野・年齢・性別・稼働可能な日程をプロフィールに登録します。",
  },
  {
    title: "お客様が依頼",
    desc: "お客様がプロフィールを見て、内容と金額を提示して直接依頼を送ります。",
  },
  {
    title: "職人がマッチング判断",
    desc: "金額と内容を見て、職人が受けるかどうかを判断。受諾すればマッチング成立です。",
  },
];

export default function Home() {
  return (
    <div>
      <section className="bg-gradient-to-b from-amber-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <span className="rounded-full bg-amber-100 px-4 py-1 text-sm font-semibold text-amber-700">
            職人のための、仕事版マッチングサービス
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            腕のいい職人と、
            <br className="sm:hidden" />
            仕事を頼みたい人をつなぐ。
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-neutral-600">
            大工・電気工事・左官・塗装・水道設備など、個人の職人が単発の仕事を直接受注できるマッチングサービスです。
            会社を通さないから、お客様は適正価格で依頼でき、職人は副業・本業として収入を増やせます。
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="w-full rounded-lg bg-amber-500 px-6 py-3 text-center font-semibold text-white hover:bg-amber-600 sm:w-auto"
            >
              職人として登録する
            </Link>
            <Link
              href="/craftsmen"
              className="w-full rounded-lg border border-neutral-300 bg-white px-6 py-3 text-center font-semibold text-neutral-800 hover:bg-neutral-100 sm:w-auto"
            >
              職人を探して依頼する
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold">使い方はかんたん3ステップ</h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-xl border border-neutral-200 bg-white p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 font-bold text-white">
                {i + 1}
              </div>
              <h3 className="mt-4 font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-neutral-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-neutral-900 py-16 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold">職人の方へ</h2>
              <p className="mt-3 text-neutral-300">
                会社を通さず、単発の仕事を自分のペースで受注できます。所得が伸び悩む今、副業・独立の一歩として。
                プロフィールにはできること・得意分野・年齢・性別・稼働可能日を登録でき、条件に合った依頼だけを選んで受けられます。
              </p>
              <p className="mt-3 text-sm text-neutral-400">
                マッチング成立時のプラットフォーム手数料は依頼金額の{Math.round(COMMISSION_RATE * 100)}%です。
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-bold">お客様の方へ</h2>
              <p className="mt-3 text-neutral-300">
                会社に依頼すると高額になりがちな建築・住宅設備の作業も、個人の職人に直接依頼することで適正な価格に。
                職人の得意分野やエリア、稼働可能な日程を見て、安心して依頼できます。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold">今すぐはじめましょう</h2>
        <p className="mt-2 text-neutral-600">登録は無料です。</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="w-full rounded-lg bg-amber-500 px-6 py-3 text-center font-semibold text-white hover:bg-amber-600 sm:w-auto"
          >
            無料で登録する
          </Link>
        </div>
      </section>
    </div>
  );
}
