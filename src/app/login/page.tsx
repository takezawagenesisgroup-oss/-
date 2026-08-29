'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push(params.get('next') || '/');
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'ログインに失敗しました');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-50 px-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🧰</div>
          <h1 className="text-2xl font-bold">設備・備品管理ツール</h1>
          <p className="text-lg text-gray-500 mt-1">サービスメンテナンス部</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-lg font-bold mb-1">ユーザー名</label>
            <input
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-xl"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-lg font-bold mb-1">パスワード</label>
            <input
              type="password"
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-xl"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-red-600 font-bold text-lg">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="big-btn bg-brand-600 text-white w-full text-2xl"
          >
            {loading ? '確認中…' : 'ログイン'}
          </button>
        </form>
        <p className="text-sm text-gray-400 mt-6 text-center">
          初期管理者: admin / admin1234
        </p>
      </div>
    </div>
  );
}
