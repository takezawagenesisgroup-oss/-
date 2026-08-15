import { useRef, useState } from 'react';
import { APPROVALS_REQUIRED, CHECKLIST_ITEMS } from '../types';
import { useStore } from '../data/store';
import type { Tab } from '../components/BottomNav';

const EMOJI_OPTIONS = ['😄', '😁', '😊', '🥰', '😆', '🙂'];

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const maxW = 640;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas unsupported'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function PostCreate({ onDone }: { onDone: (tab: Tab) => void }) {
  const { addPost } = useStore();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState<string>(EMOJI_OPTIONS[0]);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const score = CHECKLIST_ITEMS.reduce((sum, item) => (checked.has(item.key) ? sum + item.points : sum), 0);

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImage(file);
    setPhoto(dataUrl);
  }

  function handleSubmit() {
    if (checked.size === 0) return;
    addPost(Array.from(checked), comment.trim(), photo);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setChecked(new Set());
      setComment('');
      setPhoto(EMOJI_OPTIONS[0]);
      onDone('home');
    }, 1100);
  }

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-24 text-center">
        <div className="text-6xl">🎉</div>
        <p className="mt-4 text-lg font-bold text-slate-800">投稿しました！</p>
        <p className="mt-1 text-sm text-slate-500">仲間の承認を待ちましょう</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <p className="mb-3 text-sm font-semibold text-slate-700">📸 今日のスマイルを投稿</p>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-blue-50">
          {photo.startsWith('data:') ? (
            <img src={photo} alt="プレビュー" className="h-44 w-full object-cover" />
          ) : (
            <div className="flex h-44 w-full items-center justify-center text-7xl">{photo}</div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white active:scale-95"
          >
            📷 写真を選ぶ
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleFile} />
          <div className="flex gap-1">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setPhoto(e)}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-lg ${
                  photo === e ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-slate-100'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">自己採点（30秒でOK）</p>
          <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">{score}点</span>
        </div>
        <div className="flex flex-col gap-2">
          {CHECKLIST_ITEMS.map((item) => {
            const isChecked = checked.has(item.key);
            return (
              <button
                key={item.key}
                onClick={() => toggle(item.key)}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                  isChecked ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'
                }`}
              >
                <span className="text-xl">{item.emoji}</span>
                <span className="flex-1 text-sm text-slate-700">{item.label}</span>
                <span className="text-xs text-slate-400">+{item.points}</span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-xs ${
                    isChecked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-transparent'
                  }`}
                >
                  ✓
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-slate-700">ひとこと（任意）</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="今日の一言を書きましょう"
          rows={2}
          className="w-full resize-none rounded-xl border border-slate-200 p-2.5 text-sm text-slate-700 outline-none focus:border-blue-400"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={checked.size === 0}
        className="mt-4 w-full rounded-xl bg-blue-700 py-3 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        投稿する
      </button>
      <p className="mt-2 text-center text-xs text-slate-400">承認が{APPROVALS_REQUIRED}人集まるとドリンクチケットが発行されます 🎫</p>
    </div>
  );
}
