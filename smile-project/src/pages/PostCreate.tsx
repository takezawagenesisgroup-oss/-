import { useRef, useState } from 'react';
import type { EventPhase } from '../types';
import { currentSeasonalEvent, eventActionsFor } from '../types';
import { useStore } from '../data/store';
import type { Tab } from '../components/BottomNav';
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
  const { addPost } = useStore();
  const event = currentSeasonalEvent(new Date());
  const [phase, setPhase] = useState<EventPhase>('prep');
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState<string>(EMOJI_OPTIONS[0]);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const actions = eventActionsFor(phase);

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
    addPost(phase, actionKey, comment.trim(), photo);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setPhase('prep');
      setActionKey(null);
      setComment('');
      setPhoto(EMOJI_OPTIONS[0]);
      onDone('home');
    }, 1100);
  }

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-24 text-center">
        <div className="text-6xl">🎉</div>
        <p className="font-display mt-4 text-lg font-bold text-foreground">報告しました！</p>
        <p className="mt-1 text-sm text-muted-foreground">店長・上長の承認でポイントが付与されます</p>
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
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{event.seasonLabel}・開催中</p>
            <p className="text-sm font-bold text-foreground">{event.title}</p>
          </div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{event.description}</p>
      </div>

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
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => changePhase('prep')}
            className={cn(
              'rounded-xl border py-2 text-sm font-semibold transition',
              phase === 'prep' ? 'border-primary bg-secondary text-primary' : 'border-border text-muted-foreground',
            )}
          >
            事前編（準備）
          </button>
          <button
            onClick={() => changePhase('day')}
            className={cn(
              'rounded-xl border py-2 text-sm font-semibold transition',
              phase === 'day' ? 'border-primary bg-secondary text-primary' : 'border-border text-muted-foreground',
            )}
          >
            当日編
          </button>
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
      <p className="mt-2 text-center text-xs text-muted-foreground">店長・上長が承認すると、選んだ項目のポイントが付与されます</p>
    </div>
  );
}
