import Link from 'next/link';
import { getSession } from '@/lib/auth';

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="py-6">
      <h1 className="text-3xl font-bold text-center mb-2">こんにちは、{session?.name} さん</h1>
      <p className="text-center text-lg text-gray-500 mb-8">
        使いたいメニューのボタンを押してください
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Link
          href="/search"
          className="big-btn bg-white border-brand-200 hover:border-brand-500"
        >
          <span className="text-6xl">🔍</span>
          <span>検索</span>
          <span className="text-base font-normal text-gray-500">
            必要な道具・車両を調べる
          </span>
        </Link>

        <Link
          href="/register"
          className="big-btn bg-brand-600 text-white"
        >
          <span className="text-6xl">📝</span>
          <span>登録</span>
          <span className="text-base font-normal text-brand-50">
            作業完了を写真・音声で記録
          </span>
        </Link>

        <Link
          href="/facilities"
          className="big-btn bg-white border-brand-200 hover:border-brand-500"
        >
          <span className="text-6xl">🏢</span>
          <span>施設一覧</span>
          <span className="text-base font-normal text-gray-500">
            施設ごとの過去の作業を見る
          </span>
        </Link>
      </div>

      <div className="mt-10 card p-5">
        <h2 className="text-xl font-bold mb-3">📦 保管ルールについて</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-lg">
          <div>
            <p className="font-bold mb-1">🔨 工具（カテゴリー別・3段収納）</p>
            <ul className="list-none space-y-1 text-base">
              <li>① 手前：よく使う手持ち工具</li>
              <li>② 中：よく使う備品・専用工具</li>
              <li>③ 奥：大型工具・大型品</li>
            </ul>
          </div>
          <div>
            <p className="font-bold mb-1">💡 その他備品（使用頻度別）</p>
            <ul className="list-none space-y-1 text-base">
              <li>① 手前：よく使う</li>
              <li>② 中：そこそこ使う</li>
              <li>③ 奥：めったに使わない</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
