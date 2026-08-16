"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

type Role = "CUSTOMER" | "CRAFTSMAN";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("CUSTOMER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました");
        setLoading(false);
        return;
      }

      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        setError("登録は完了しましたが、ログインに失敗しました。ログイン画面からお試しください。");
        setLoading(false);
        return;
      }

      router.push(role === "CRAFTSMAN" ? "/profile/edit" : "/craftsmen");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold">新規登録</h1>
      <p className="mt-1 text-sm text-neutral-500">
        登録は無料です。職人として登録すると、お客様から直接仕事の依頼が届くようになります。
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setRole("CUSTOMER")}
          className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
            role === "CUSTOMER"
              ? "border-amber-500 bg-amber-50 text-amber-700"
              : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
          }`}
        >
          お客様として登録
          <div className="mt-1 text-xs font-normal">仕事を依頼したい</div>
        </button>
        <button
          type="button"
          onClick={() => setRole("CRAFTSMAN")}
          className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
            role === "CRAFTSMAN"
              ? "border-amber-500 bg-amber-50 text-amber-700"
              : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
          }`}
        >
          職人として登録
          <div className="mt-1 text-xs font-normal">仕事を受けたい</div>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">お名前</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
            placeholder="山田 太郎"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">メールアドレス</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">パスワード</label>
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
            placeholder="8文字以上"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-amber-500 py-2.5 font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
        >
          {loading ? "登録中..." : "登録する"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        すでにアカウントをお持ちの方は{" "}
        <Link href="/login" className="font-semibold text-amber-600 hover:underline">
          ログイン
        </Link>
      </p>
    </div>
  );
}
