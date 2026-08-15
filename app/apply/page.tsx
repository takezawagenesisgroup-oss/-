"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";

export default function ApplyPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const res = await fetch("/api/applicants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json();
      if (body.error?.fieldErrors) {
        setErrors(body.error.fieldErrors);
      } else {
        setFormError("送信に失敗しました。時間をおいて再度お試しください。");
      }
      setSubmitting(false);
      return;
    }

    const data = await res.json();
    router.push(`/apply/${data.id}/schedule`);
  }

  return (
    <PageShell title="基礎情報のご入力" step={1} totalSteps={3}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="お名前" name="name" required errors={errors.name} />
        <Field label="フリガナ" name="nameKana" errors={errors.nameKana} />
        <Field label="メールアドレス" name="email" type="email" required errors={errors.email} />
        <Field label="電話番号" name="phone" required placeholder="090-1234-5678" errors={errors.phone} />
        <Field label="生年月日" name="birthDate" type="date" errors={errors.birthDate} />
        <Field label="現住所" name="address" errors={errors.address} />
        <Field label="希望職種" name="desiredPosition" errors={errors.desiredPosition} />
        <Field label="応募媒体（わかれば）" name="source" errors={errors.source} />

        {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? "送信中..." : "次へ（面談日程を選ぶ）"}
        </button>
      </form>
    </PageShell>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  errors,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  errors?: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-zinc-700">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
      />
      {errors?.length ? <p className="mt-1 text-xs text-red-600">{errors[0]}</p> : null}
    </label>
  );
}
