"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COMMISSION_RATE } from "@/lib/constants";

export function RequestForm({
  craftsmanId,
  hourlyRate,
}: {
  craftsmanId: string;
  hourlyRate: number;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [desiredDate, setDesiredDate] = useState("");
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState(hourlyRate > 0 ? hourlyRate * 4 : 10000);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const commission = Math.round(budget * COMMISSION_RATE);
  const craftsmanPayout = budget - commission;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/job-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ craftsmanId, title, description, desiredDate, location, budget }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "依頼の送信に失敗しました");
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="font-semibold text-green-800">依頼を送信しました！</p>
        <p className="mt-1 text-sm text-green-700">
          職人からの回答をお待ちください。回答があると依頼履歴でステータスが更新されます。
        </p>
        <button
          onClick={() => router.push("/dashboard/customer")}
          className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          依頼履歴を見る
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700">件名</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例）キッチンの蛇口交換"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">作業内容の詳細</label>
        <textarea
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="現在の状況、希望する仕上がりなどをできるだけ詳しく記入してください。"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">希望日</label>
          <input
            required
            type="date"
            value={desiredDate}
            onChange={(e) => setDesiredDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">作業場所（住所）</label>
          <input
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="例）東京都渋谷区..."
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">提示金額（円）</label>
        <input
          required
          type="number"
          min={1000}
          step={500}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>

      <div className="rounded-lg bg-neutral-50 p-4 text-sm">
        <div className="flex justify-between text-neutral-600">
          <span>お客様のお支払い金額</span>
          <span className="font-semibold text-neutral-900">¥{budget.toLocaleString()}</span>
        </div>
        <div className="mt-1 flex justify-between text-neutral-500">
          <span>プラットフォーム手数料（{Math.round(COMMISSION_RATE * 100)}%）</span>
          <span>-¥{commission.toLocaleString()}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-neutral-200 pt-1 font-semibold text-neutral-900">
          <span>職人の受取金額（目安）</span>
          <span>¥{craftsmanPayout.toLocaleString()}</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-amber-500 py-2.5 font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
      >
        {loading ? "送信中..." : "この内容で依頼を送信する"}
      </button>
    </form>
  );
}
