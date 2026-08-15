import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="mb-2 text-sm font-medium text-emerald-700">ご応募ありがとうございます</p>
        <h1 className="mb-4 text-2xl font-bold text-zinc-900">
          面談日程のご予約はこちらから
        </h1>
        <p className="mb-8 text-sm leading-6 text-zinc-600">
          基礎情報のご入力（1分程度）とあわせて、面談日程をその場でご予約いただけます。
          面談当日にご記入いただいていた書類も、事前にこちらで完了できます。
        </p>
        <Link
          href="/apply"
          className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700"
        >
          応募情報を入力する
        </Link>
        <p className="mt-6 text-xs text-zinc-400">
          管理画面は <Link href="/admin/applicants" className="underline">こちら</Link>
        </p>
      </div>
    </div>
  );
}
