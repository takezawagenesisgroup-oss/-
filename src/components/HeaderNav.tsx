'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function HeaderNav({
  name,
  role,
}: {
  name: string;
  role: 'admin' | 'staff';
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const isHome = pathname === '/';

  return (
    <header className="bg-brand-700 text-white">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <span aria-hidden>🧰</span>
          <span>設備・備品管理</span>
        </Link>
        <div className="flex items-center gap-3">
          {!isHome && (
            <Link
              href="/"
              className="tag-pill bg-white/15 hover:bg-white/25"
              title="ホームへ戻る"
            >
              🏠 ホーム
            </Link>
          )}
          <span className="text-lg hidden sm:inline">{name} さん</span>
          {role === 'admin' && (
            <Link href="/admin/items" className="tag-pill bg-white/15 hover:bg-white/25">
              ⚙️ 管理
            </Link>
          )}
          <button onClick={logout} className="tag-pill bg-white/15 hover:bg-white/25">
            🚪 ログアウト
          </button>
        </div>
      </div>
    </header>
  );
}
