"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { PageShell } from "@/components/PageShell";

type Slot = {
  id: string;
  startAt: string;
  endAt: string;
  remaining: number;
  note: string | null;
};

export default function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/slots")
      .then((r) => r.json())
      .then(setSlots);
  }, []);

  async function select(slotId: string) {
    setSelecting(slotId);
    setError(null);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicantId: id, slotId }),
    });
    if (!res.ok) {
      setError("この枠は満席になった可能性があります。別の枠をお選びください。");
      setSelecting(null);
      fetch("/api/slots").then((r) => r.json()).then(setSlots);
      return;
    }
    router.push(`/apply/${id}/waiting`);
  }

  return (
    <PageShell title="面談日程を選択してください" step={2} totalSteps={3}>
      {slots === null ? (
        <p className="text-sm text-zinc-500">読み込み中...</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-zinc-500">
          現在ご案内できる面談枠がございません。担当者より改めてご連絡いたします。
        </p>
      ) : (
        <ul className="space-y-2">
          {slots.map((slot) => (
            <li key={slot.id}>
              <button
                onClick={() => select(slot.id)}
                disabled={selecting !== null}
                className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-left text-sm transition hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-50"
              >
                <span>
                  {new Date(slot.startAt).toLocaleString("ja-JP", {
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  〜
                  {new Date(slot.endAt).toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-xs text-zinc-400">残り{slot.remaining}枠</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </PageShell>
  );
}
