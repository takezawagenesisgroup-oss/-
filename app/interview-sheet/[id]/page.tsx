"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { PageShell } from "@/components/PageShell";
import { interviewSheetFields } from "@/lib/interviewSheetFields";

export default function InterviewSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const answers = Object.fromEntries(formData.entries());

    const res = await fetch("/api/interview-sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicantId: id, answers }),
    });

    if (!res.ok) {
      setFormError("送信に失敗しました。時間をおいて再度お試しください。");
      setSubmitting(false);
      return;
    }

    router.push(`/apply/${id}/waiting`);
  }

  return (
    <PageShell title="面談シート（事前入力）">
      <p className="mb-4 text-xs leading-5 text-zinc-500">
        ※ 現在は仮の項目です。実際の面談シートの項目に合わせて後日更新されます。
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {interviewSheetFields.map((field) => (
          <label key={field.name} className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">
              {field.label}
              {field.required ? <span className="ml-1 text-red-500">*</span> : null}
            </span>
            {field.type === "textarea" ? (
              <textarea
                name={field.name}
                required={field.required}
                rows={3}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            ) : field.type === "radio" ? (
              <div className="flex gap-4">
                {field.options?.map((opt) => (
                  <label key={opt} className="flex items-center gap-1 text-sm">
                    <input type="radio" name={field.name} value={opt} required={field.required} />
                    {opt}
                  </label>
                ))}
              </div>
            ) : (
              <input
                name={field.name}
                type={field.type}
                required={field.required}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            )}
          </label>
        ))}

        {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? "送信中..." : "この内容で送信する"}
        </button>
      </form>
    </PageShell>
  );
}
