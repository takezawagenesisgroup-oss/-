import { useRef, useState } from 'react';
import {
  APPROVALS_REQUIRED,
  APPROVAL_BONUS_COINS,
  CHECKLIST_ITEMS,
  MISSION_BONUS_POINTS,
  PROP_OPTIONS,
  STAMP_OPTIONS,
  STORY_TEMPLATES,
  missionForDate,
} from '../types';
import { useStore } from '../data/store';
import type { Tab } from '../components/BottomNav';
import Avatar from '../components/Avatar';

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
  const { addPost, colleagues, todaysBuddy, currentUser } = useStore();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState<string>(EMOJI_OPTIONS[0]);
  const [missionDone, setMissionDone] = useState(false);
  const [prop, setProp] = useState<string | null>(null);
  const [stampKey, setStampKey] = useState<string | null>(null);
  const [buddyIds, setBuddyIds] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mission = missionForDate(new Date());
  const buddy = todaysBuddy(currentUser.id);

  const checklistScore = CHECKLIST_ITEMS.reduce((sum, item) => (checked.has(item.key) ? sum + item.points : sum), 0);
  const score = checklistScore + (missionDone ? MISSION_BONUS_POINTS : 0);

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleBuddy(id: string) {
    setBuddyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function insertTemplate(template: string) {
    setComment((prev) => (prev ? prev : template));
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImage(file);
    setPhoto(dataUrl);
  }

  function handleSubmit() {
    if (checked.size === 0) return;
    addPost(Array.from(checked), comment.trim(), photo, {
      missionTitle: missionDone ? mission.title : undefined,
      prop: prop ?? undefined,
      stampKey: stampKey ?? undefined,
      buddyIds: buddyIds.size > 0 ? Array.from(buddyIds) : undefined,
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setChecked(new Set());
      setComment('');
      setPhoto(EMOJI_OPTIONS[0]);
      setMissionDone(false);
      setProp(null);
      setStampKey(null);
      setBuddyIds(new Set());
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

      <div className="rounded-2xl bg-gradient-to-br from-blue-700 to-blue-500 p-4 text-white shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{mission.icon}</span>
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-100">今日のミッション</p>
            <p className="text-sm font-bold">{mission.title}</p>
          </div>
          <span className="rounded-full bg-white/20 px-2 py-1 text-[11px] font-bold">+{MISSION_BONUS_POINTS} GC</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-blue-50">{mission.prompt}</p>
        <button
          onClick={() => setMissionDone((v) => !v)}
          className={`mt-3 w-full rounded-xl py-2 text-xs font-bold transition ${
            missionDone ? 'bg-white text-blue-700' : 'bg-white/15 text-white'
          }`}
        >
          {missionDone ? '✓ ミッション達成としてボーナス獲得' : 'このミッションに挑戦した！'}
        </button>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
          <Avatar src={buddy.avatar} alt={buddy.name} className="h-7 w-7 rounded-full bg-white/30 text-sm" />
          <p className="flex-1 text-xs text-blue-50">
            本日のスマイルバディは <span className="font-bold text-white">{buddy.name}</span> さん
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
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

        <p className="mb-1.5 mt-4 text-xs font-semibold text-slate-500">スマイルプロップス（任意）</p>
        <div className="flex flex-wrap gap-1.5">
          {PROP_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => setProp((cur) => (cur === p ? null : p))}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                prop === p ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'
              }`}
            >
              💬 {p}
            </button>
          ))}
        </div>

        <p className="mb-1.5 mt-3 text-xs font-semibold text-slate-500">限定フレーム・スタンプ（任意）</p>
        <div className="flex flex-wrap gap-1.5">
          {STAMP_OPTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setStampKey((cur) => (cur === s.key ? null : s.key))}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                stampKey === s.key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'
              }`}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>

        <p className="mb-1.5 mt-3 text-xs font-semibold text-slate-500">一緒に写っている仲間をタグ付け（任意）</p>
        <div className="flex flex-wrap gap-1.5">
          {colleagues.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleBuddy(c.id)}
              className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs transition ${
                buddyIds.has(c.id) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'
              }`}
            >
              <Avatar src={c.avatar} alt={c.name} className="h-5 w-5 rounded-full bg-slate-100 text-[11px]" />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">自己採点（30秒でOK）</p>
          <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">🪙 {score} GC</span>
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
                <span className="text-xs text-slate-400">+{item.points} GC</span>
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
        <p className="mb-1 text-sm font-semibold text-slate-700">📝 今日の笑顔ストーリー</p>
        <p className="mb-2 text-xs text-slate-400">なぜその笑顔になったのか、一言エピソードを添えましょう（任意）</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {STORY_TEMPLATES.map((t) => (
            <button
              key={t}
              onClick={() => insertTemplate(t)}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500 active:scale-95"
            >
              + {t.length > 14 ? `${t.slice(0, 14)}…` : t}
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="例：お客様に「ありがとう」と言われて嬉しかった瞬間！"
          rows={3}
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
      <p className="mt-2 text-center text-xs text-slate-400">承認が{APPROVALS_REQUIRED}人集まるとGenesisコイン+{APPROVAL_BONUS_COINS}を獲得できます 🪙</p>
    </div>
  );
}
