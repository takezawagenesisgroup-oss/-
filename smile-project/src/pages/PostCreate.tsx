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
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Camera, Check } from 'lucide-react';

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
        <p className="font-display mt-4 text-lg font-bold text-foreground">投稿しました！</p>
        <p className="mt-1 text-sm text-muted-foreground">仲間の承認を待ちましょう</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <p className="mb-3 text-sm font-semibold text-foreground">📸 今日のスマイルを投稿</p>

      <div className="rounded-2xl bg-gradient-to-br from-primary to-[#6c53f5] p-4 text-white shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{mission.icon}</span>
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">今日のミッション</p>
            <p className="text-sm font-bold">{mission.title}</p>
          </div>
          <Badge variant="coin">+{MISSION_BONUS_POINTS} GC</Badge>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-white/80">{mission.prompt}</p>
        <Button
          onClick={() => setMissionDone((v) => !v)}
          variant={missionDone ? 'coin' : 'subtle'}
          className="mt-3 w-full rounded-xl"
        >
          {missionDone ? '✓ ミッション達成としてボーナス獲得' : 'このミッションに挑戦した！'}
        </Button>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
          <Avatar src={buddy.avatar} alt={buddy.name} className="h-7 w-7 rounded-full bg-white/30 text-sm" />
          <p className="flex-1 text-xs text-white/80">
            本日のスマイルバディは <span className="font-bold text-white">{buddy.name}</span> さん
          </p>
        </div>
      </div>

      <Card className="mt-4 p-4">
        <div className="flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-coin/15 to-secondary">
          {photo.startsWith('data:') ? (
            <img src={photo} alt="プレビュー" className="h-44 w-full object-cover" />
          ) : (
            <div className="flex h-44 w-full items-center justify-center text-7xl">{photo}</div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => fileInputRef.current?.click()} size="sm">
            <Camera className="size-3.5" />
            写真を選ぶ
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleFile} />
          <div className="flex gap-1">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setPhoto(e)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-lg',
                  photo === e ? 'bg-secondary ring-2 ring-primary/60' : 'bg-muted',
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">スマイルプロップス（任意）</p>
          <div className="flex flex-wrap gap-1.5">
            {PROP_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => setProp((cur) => (cur === p ? null : p))}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition',
                  prop === p ? 'border-primary bg-secondary text-primary' : 'border-border text-muted-foreground',
                )}
              >
                💬 {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">限定フレーム・スタンプ（任意）</p>
          <div className="flex flex-wrap gap-1.5">
            {STAMP_OPTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setStampKey((cur) => (cur === s.key ? null : s.key))}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition',
                  stampKey === s.key ? 'border-primary bg-secondary text-primary' : 'border-border text-muted-foreground',
                )}
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">一緒に写っている仲間をタグ付け（任意）</p>
          <div className="flex flex-wrap gap-1.5">
            {colleagues.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleBuddy(c.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs transition',
                  buddyIds.has(c.id) ? 'border-primary bg-secondary text-primary' : 'border-border text-muted-foreground',
                )}
              >
                <Avatar src={c.avatar} alt={c.name} className="h-5 w-5 rounded-full bg-muted text-[11px]" />
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">自己採点（30秒でOK）</p>
          <Badge variant="coin" className="font-display">
            🪙 {score} GC
          </Badge>
        </div>
        <div className="flex flex-col gap-2">
          {CHECKLIST_ITEMS.map((item) => {
            const isChecked = checked.has(item.key);
            return (
              <button
                key={item.key}
                onClick={() => toggle(item.key)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
                  isChecked ? 'border-primary bg-secondary' : 'border-border bg-card',
                )}
              >
                <span className="text-xl">{item.emoji}</span>
                <span className="flex-1 text-sm text-foreground">{item.label}</span>
                <span className="text-xs text-muted-foreground">+{item.points} GC</span>
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full border-2 text-xs',
                    isChecked ? 'border-primary bg-primary text-white' : 'border-border text-transparent',
                  )}
                >
                  <Check className="size-3" />
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">📝 今日の笑顔ストーリー</p>
          <p className="mt-0.5 text-xs text-muted-foreground">なぜその笑顔になったのか、一言エピソードを添えましょう（任意）</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STORY_TEMPLATES.map((t) => (
            <button
              key={t}
              onClick={() => insertTemplate(t)}
              className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground active:scale-95"
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
          className="w-full resize-none rounded-xl border border-border bg-card p-2.5 text-sm text-foreground outline-none focus:border-primary"
        />
      </Card>

      <Button onClick={handleSubmit} disabled={checked.size === 0} size="lg" className="mt-4 w-full">
        投稿する
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        承認が{APPROVALS_REQUIRED}人集まるとGenesisコイン+{APPROVAL_BONUS_COINS}を獲得できます 🪙
      </p>
    </div>
  );
}
