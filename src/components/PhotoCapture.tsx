'use client';

import { useRef, useState } from 'react';

export default function PhotoCapture({
  photos,
  onChange,
}: {
  photos: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const newFiles = [...photos, ...Array.from(fileList)];
    onChange(newFiles);
    setPreviews(newFiles.map((f) => URL.createObjectURL(f)));
  }

  function removeAt(idx: number) {
    const newFiles = photos.filter((_, i) => i !== idx);
    onChange(newFiles);
    setPreviews(newFiles.map((f) => URL.createObjectURL(f)));
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="big-btn bg-white border-brand-300 text-brand-800 w-full"
      >
        <span className="text-5xl">📷</span>
        <span>写真をとる／えらぶ</span>
      </button>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
          {previews.map((src, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`写真${i + 1}`} className="rounded-xl border-2 border-gray-200 aspect-square object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-8 h-8 text-lg font-bold"
                aria-label="削除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
