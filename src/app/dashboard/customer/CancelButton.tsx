"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/job-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CANCEL" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "キャンセルに失敗しました");
      setLoading(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleCancel}
        disabled={loading}
        className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 disabled:opacity-60"
      >
        {loading ? "処理中..." : "依頼をキャンセルする"}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
