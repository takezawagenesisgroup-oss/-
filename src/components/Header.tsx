import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export async function Header() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-neutral-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white">職</span>
          <span>
            職人マッチ<span className="text-amber-600">.</span>
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/craftsmen" className="text-neutral-600 hover:text-neutral-900">
            職人を探す
          </Link>

          {!session?.user && (
            <>
              <Link href="/login" className="text-neutral-600 hover:text-neutral-900">
                ログイン
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600"
              >
                無料登録
              </Link>
            </>
          )}

          {session?.user?.role === "CRAFTSMAN" && (
            <Link
              href="/dashboard/craftsman"
              className="rounded-lg bg-neutral-900 px-4 py-2 font-semibold text-white hover:bg-neutral-700"
            >
              職人ダッシュボード
            </Link>
          )}

          {session?.user?.role === "CUSTOMER" && (
            <Link
              href="/dashboard/customer"
              className="rounded-lg bg-neutral-900 px-4 py-2 font-semibold text-white hover:bg-neutral-700"
            >
              依頼履歴
            </Link>
          )}

          {session?.user && (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="text-neutral-500 hover:text-neutral-900"
              >
                ログアウト
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
