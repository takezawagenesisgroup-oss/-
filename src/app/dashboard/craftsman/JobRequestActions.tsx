"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function JobRequestActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "ACCEPT" | "DECLINE" | "COMPLETE") {
    setLoading(action);
    setError(null);
    const res = await fetch(`/api/job-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "処理に失敗しました");
      setLoading(null);
      return;
    }
    router.refresh();
    setLoading(null);
  }

  if (status === "PENDING") {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={() => act("ACCEPT")}
          disabled={loading !== null}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {loading === "ACCEPT" ? "処理中..." : "この依頼を受ける"}
        </button>
        <button
          onClick={() => act("DECLINE")}
          disabled={loading !== null}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 disabled:opacity-60"
        >
          {loading === "DECLINE" ? "処理中..." : "辞退する"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    );
  }

  if (status === "ACCEPTED") {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={() => act("COMPLETE")}
          disabled={loading !== null}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading === "COMPLETE" ? "処理中..." : "作業完了にする"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    );
  }

  return null;
}
