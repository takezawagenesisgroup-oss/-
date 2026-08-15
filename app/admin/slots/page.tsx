"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Slot = {
  id: string;
  startAt: string;
  endAt: string;
  capacity: number;
  remaining: number;
  note: string | null;
};

export default function AdminSlotsPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/slots")
      .then((r) => r.json())
      .then((data) => {
        setSlots(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const startAt = formData.get("date") as string;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const capacity = Number(formData.get("capacity"));
    const note = formData.get("note") as string;

    const res = await fetch("/api/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startAt: new Date(`${startAt}T${startTime}`).toISOString(),
        endAt: new Date(`${startAt}T${endTime}`).toISOString(),
        capacity,
        note,
      }),
    });

    if (!res.ok) {
      setError("枠の登録に失敗しました。入力内容をご確認ください。");
      return;
    }
    (e.target as HTMLFormElement).reset();
    load();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/slots/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      alert(body.error || "削除に失敗しました");
      return;
    }
    load();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">面談枠の管理</h1>
        <Link href="/admin/applicants" className="text-sm text-emerald-700 underline">
          応募者一覧へ
        </Link>
      </div>

      <form
        onSubmit={handleAdd}
        className="mb-8 grid grid-cols-2 gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-5"
      >
        <label className="col-span-2 text-sm sm:col-span-1">
          日付
          <input name="date" type="date" required className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="text-sm">
          開始
          <input name="startTime" type="time" required defaultValue="10:00" className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="text-sm">
          終了
          <input name="endTime" type="time" required defaultValue="11:00" className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="text-sm">
          定員
          <input name="capacity" type="number" min={1} defaultValue={1} required className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="col-span-2 text-sm sm:col-span-1">
          メモ
          <input name="note" type="text" className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm" />
        </label>
        <div className="col-span-2 sm:col-span-5">
          <button type="submit" className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            枠を追加
          </button>
        </div>
      </form>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-zinc-500">読み込み中...</p>
      ) : (
        <ul className="space-y-2">
          {slots.map((slot) => (
            <li
              key={slot.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm"
            >
              <div>
                <div className="font-medium">
                  {new Date(slot.startAt).toLocaleString("ja-JP", {
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" 〜 "}
                  {new Date(slot.endAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="text-xs text-zinc-500">
                  定員 {slot.capacity} / 残り {slot.remaining}
                  {slot.note ? ` ・ ${slot.note}` : ""}
                </div>
              </div>
              <button
                onClick={() => handleDelete(slot.id)}
                className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                削除
              </button>
            </li>
          ))}
          {slots.length === 0 ? <p className="text-sm text-zinc-500">登録済みの枠はありません。</p> : null}
        </ul>
      )}
    </div>
  );
}
