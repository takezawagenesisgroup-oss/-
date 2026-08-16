"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, DAYS } from "@/lib/constants";

type Initial = {
  category: string;
  skills: string;
  specialty: string;
  age: number;
  gender: string;
  area: string;
  hourlyRate: number;
  yearsExperience: number;
  bio: string;
  availableDays: string[];
  isActive: boolean;
};

export function ProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function toggleDay(day: string) {
    setForm((f) => ({
      ...f,
      availableDays: f.availableDays.includes(day)
        ? f.availableDays.filter((d) => d !== day)
        : [...f.availableDays, day],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const res = await fetch("/api/craftsman-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "保存に失敗しました");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-neutral-200 bg-white p-6">
      <label className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3">
        <span className="text-sm font-semibold text-amber-800">プロフィールを公開する</span>
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          className="h-5 w-5 accent-amber-500"
        />
      </label>

      <div>
        <label className="block text-sm font-medium text-neutral-700">主な分野</label>
        <select
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">できること（カンマ区切り）</label>
        <input
          value={form.skills}
          onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))}
          placeholder="例）水回りリフォーム, 外壁塗装, タイル張替え"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">得意分野・アピール</label>
        <textarea
          value={form.specialty}
          onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
          rows={3}
          placeholder="例）狭小住宅の水回りリフォームが得意です。丁寧な仕上がりに自信があります。"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">年齢</label>
          <input
            type="number"
            min={16}
            max={100}
            value={form.age}
            onChange={(e) => setForm((f) => ({ ...f, age: Number(e.target.value) }))}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">性別</label>
          <select
            value={form.gender}
            onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          >
            <option value="MALE">男性</option>
            <option value="FEMALE">女性</option>
            <option value="OTHER">その他</option>
            <option value="UNSPECIFIED">未回答</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">対応エリア</label>
          <input
            value={form.area}
            onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
            placeholder="例）東京都・神奈川県"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">経験年数</label>
          <input
            type="number"
            min={0}
            max={80}
            value={form.yearsExperience}
            onChange={(e) => setForm((f) => ({ ...f, yearsExperience: Number(e.target.value) }))}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">目安単価（時給・円）</label>
        <input
          type="number"
          min={0}
          value={form.hourlyRate}
          onChange={(e) => setForm((f) => ({ ...f, hourlyRate: Number(e.target.value) }))}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">稼働可能な曜日</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <button
              type="button"
              key={d.key}
              onClick={() => toggleDay(d.key)}
              className={`h-10 w-10 rounded-full border text-sm font-semibold transition ${
                form.availableDays.includes(d.key)
                  ? "border-amber-500 bg-amber-500 text-white"
                  : "border-neutral-300 text-neutral-500 hover:border-neutral-400"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">自己紹介</label>
        <textarea
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          rows={4}
          placeholder="経歴や実績、対応できる仕事の範囲などを自由に記入してください。"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">保存しました</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-amber-500 py-2.5 font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
      >
        {loading ? "保存中..." : "保存する"}
      </button>
    </form>
  );
}
