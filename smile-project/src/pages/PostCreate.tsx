import { useRef, useState } from 'react';
import type { EventPhase } from '../types';
import {
  EVENT_PHASES,
  PHASE_META,
  POINT_RULE,
  POST_THEMES,
  currentSeasonalEvent,
  entryWindowStatus,
  eventActionsFor,
  formatMonthDay,
} from '../types';
import { useStore } from '../data/store';
import type { Tab } from '../components/BottomNav';
import Avatar from '../components/Avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Camera } from 'lucide-react';

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
  const { addPost, currentUser, hasEntered, enterEvent, enteredMembers } = useStore();
  const event = currentSeasonalEvent(new Date());
  const windowStatus = entryWindowStatus(event, new Date());
  const entered = hasEntered(event.key, currentUser.id);
  const eligibleTargets = enteredMembers(event.key);
  const [phase, setPhase] = useState<EventPhase>('prep');
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState<string>(EMOJI_OPTIONS[0]);
  const [submitted, setSubmitted] = useState(false);
  const [targetUserId, setTargetUserId] = useState(currentUser.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const actions = eventActionsFor(phase);
  const target = eligibleTargets.find((m) => m.id === targetUserId) ?? currentUser;
  const isProxy = target.id !== currentUser.id;

  function changePhase(next: EventPhase) {
    setPhase(next);
    setActionKey(null);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImage(file);
    setPhoto(dataUrl);
  }

  function handleSubmit() {
    if (!actionKey) return;
    addPost(phase, actionKey, comment.trim(), photo, targetUserId);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setPhase('prep');
      setActionKey(null);
      setComment('');
      setPhoto(EMOJI_OPTIONS[0]);
      setTargetUserId(currentUser.id);
      onDone('home');
    }, 1100);
  }

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-24 text-center">
        <div className="text-6xl">🎉</div>
        <p className="font-display mt-4 text-lg font-bold text-foreground">報告しました！</p>
        <p className="mt-1 text-sm text-muted-foreground">
          店長・上長を含む{POINT_RULE.minLikes}人以上にいいねされるとポイント獲得！
        </p>
      </div>
    );
  }

  if (!entered) {
    return (
      <div className="mx-auto max-w-md px-4 py-4">
        <div className="rounded-2xl border border-border bg-secondary/40 p-5 text-center">
          <span className="text-4xl">{event.emoji}</span>
          <p className="font-display mt-2 text-lg font-bold text-foreground">{event.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{event.seasonLabel}</p>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            このイベントに参加するには、まずエントリーが必要です。
            <br />
            エントリーすると評価項目が確認でき、投稿に参加できます。
          </p>
          {windowStatus === 'open' ? (
            <>
              <p className="mt-2 text-xs text-muted-foreground">
                エントリー受付中：{formatMonthDay(event.entryStart)}〜{formatMonthDay(event.entryEnd)}
              </p>
              <Button onClick={() => enterEvent(event.key)} className="mt-4 w-full">
                参加エントリーする
              </Button>
            </>
          ) : (
            <>
              <p className="mt-2 text-xs text-muted-foreground">
                エントリー期間（{formatMonthDay(event.entryStart)}〜{formatMonthDay(event.entryEnd)}）は終了しました。
              </p>
              <button
                onClick={() => enterEvent(event.key)}
                className="mt-4 w-full rounded-xl border border-dashed border-border py-2 text-xs text-muted-foreground active:scale-95"
              >
                🔧 デモ用：期間外でもエントリーして投稿を試す
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <p className="mb-3 text-sm font-semibold text-foreground">📸 イベントの様子を報告</p>

      <div className="rounded-2xl border border-border bg-secondary/40 p-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{event.emoji}</span>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{event.seasonLabel}</p>
            <p className="text-sm font-bold text-foreground">{event.title}</p>
          </div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{event.description}</p>
      </div>

      <div className="mt-3 rounded-2xl border border-dashed border-border p-3">
        <p className="text-xs font-semibold text-foreground">📸 こんな瞬間を投稿しよう</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {POST_THEMES.map((theme) => (
            <span key={theme.label} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground">
              {theme.emoji} {theme.label}
            </span>
          ))}
        </div>
      </div>

      <Card className="mt-3 p-4">
        <p className="text-sm font-semibold text-foreground">誰の行動を報告しますか？</p>
        <p className="mt-0.5 text-xs text-muted-foreground">自分の行動でも、エントリー済みの仲間の行動を見て代わりに報告してもOKです。</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {eligibleTargets.map((m) => (
            <button
              key={m.id}
              onClick={() => setTargetUserId(m.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border py-1.5 pl-1.5 pr-3 text-xs font-semibold transition',
                targetUserId === m.id ? 'border-primary bg-secondary text-primary' : 'border-border text-muted-foreground',
              )}
            >
              <Avatar src={m.avatar} alt={m.name} className="h-5 w-5 rounded-full bg-secondary text-xs" />
              {m.id === currentUser.id ? '自分' : m.name}
            </button>
          ))}
        </div>
        {isProxy && (
          <p className="mt-2 text-xs text-primary">👀 第三者投稿：{target.name}さんの行動として報告します。</p>
        )}
      </Card>

      <Card className="mt-4 p-4">
        <div className="flex items-center justify-center overflow-hidden rounded-xl bg-muted">
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
      </Card>

      <Card className="mt-4 p-4">
        <p className="text-sm font-semibold text-foreground">どのタイミングの報告ですか？</p>
        <div className="grid grid-cols-3 gap-2">
          {EVENT_PHASES.map((p) => (
            <button
              key={p}
              onClick={() => changePhase(p)}
              className={cn(
                'rounded-xl border py-2 text-sm font-semibold transition',
                phase === p ? 'border-primary bg-secondary text-primary' : 'border-border text-muted-foreground',
              )}
            >
              {PHASE_META[p].emoji} {PHASE_META[p].shortLabel}
            </button>
          ))}
        </div>

        <p className="mt-1 text-sm font-semibold text-foreground">やったことを選んでください</p>
        <div className="flex flex-col gap-2">
          {actions.map((item) => {
            const isSelected = actionKey === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActionKey(item.key)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
                  isSelected ? 'border-primary bg-secondary' : 'border-border bg-card',
                )}
              >
                <span className="text-xl">{item.emoji}</span>
                <span className="flex-1 text-sm text-foreground">{item.label}</span>
                <span className="font-display text-xs font-bold text-coin">+{item.points}P</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <p className="text-sm font-semibold text-foreground">📝 一言コメント（任意）</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="例：飾り付けをみんなで手分けして進めました！"
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-card p-2.5 text-sm text-foreground outline-none focus:border-primary"
        />
      </Card>

      <Button onClick={handleSubmit} disabled={!actionKey} size="lg" className="mt-4 w-full">
        報告する
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        🏆 店長・上長を含む{POINT_RULE.minLikes}人以上のいいねで、選んだ項目のポイントを獲得できます
      </p>
    </div>
  );
}
