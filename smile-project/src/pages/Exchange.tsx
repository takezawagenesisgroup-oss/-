import { useState } from 'react';
import { useStore } from '../data/store';
import { EXCHANGE_ITEMS, type ExchangeItem } from '../types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TIER_LABELS: Record<ExchangeItem['tier'], string> = {
  daily: '🥤 日常のご褒美',
  gift: '🎁 ギフト',
  resort: '🏨 リゾート＆グルメ',
  reward: '🏆 特別報酬',
};

const TIER_ORDER: ExchangeItem['tier'][] = ['daily', 'gift', 'resort', 'reward'];

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days < 1) return '今日';
  if (days < 7) return `${days}日前`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function Exchange() {
  const { currentUser, totalCoins, redeem, redemptions } = useStore();
  const [message, setMessage] = useState<string | null>(null);
  const balance = totalCoins(currentUser.id);
  const myHistory = redemptions.filter((r) => r.userId === currentUser.id);

  function handleRedeem(item: ExchangeItem) {
    const ok = redeem(item.key);
    setMessage(ok ? `${item.emoji} 「${item.label}」と交換しました！` : 'コインが足りません。');
    setTimeout(() => setMessage(null), 2200);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <div className="rounded-2xl border border-border bg-coin/10 p-5">
        <p className="text-xs text-coin-foreground/70">保有Genesisコイン</p>
        <p className="font-display text-3xl font-bold text-coin-foreground">
          🪙 {balance.toLocaleString()} <span className="text-base font-semibold">GC</span>
        </p>
      </div>

      {message && <div className="mt-3 rounded-xl bg-foreground px-3 py-2 text-center text-xs font-semibold text-white">{message}</div>}

      {TIER_ORDER.map((tier) => (
        <div key={tier} className="mt-5">
          <p className="mb-2 text-sm font-semibold text-foreground">{TIER_LABELS[tier]}</p>
          <div className="flex flex-col gap-2">
            {EXCHANGE_ITEMS.filter((i) => i.tier === tier).map((item) => {
              const affordable = balance >= item.cost;
              return (
                <Card key={item.key} className="flex-row items-center gap-3 p-3">
                  <span className="text-2xl">{item.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-display text-sm font-bold text-primary">{item.cost.toLocaleString()} GC</span>
                    <Button onClick={() => handleRedeem(item)} disabled={!affordable} size="sm" variant={affordable ? 'default' : 'secondary'}>
                      交換する
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mb-3 mt-6 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">交換履歴</p>
      </div>
      {myHistory.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">まだ交換履歴はありません。</p>
      ) : (
        <div className="flex flex-col gap-2 pb-4">
          {myHistory.slice(0, 8).map((r) => (
            <div key={r.id} className={cn('flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-xs text-foreground/80')}>
              <span>
                {r.emoji} {r.label}
              </span>
              <span className="flex items-center gap-2 text-muted-foreground">
                -{r.cost} GC・{timeAgo(r.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
