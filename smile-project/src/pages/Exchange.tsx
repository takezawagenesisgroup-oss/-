import { useState } from 'react';
import { useStore } from '../data/store';
import { EXCHANGE_ITEMS, type ExchangeItem } from '../types';

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
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-5 text-white shadow-sm">
        <p className="text-xs text-amber-50">保有Genesisコイン</p>
        <p className="text-3xl font-bold">
          🪙 {balance.toLocaleString()} <span className="text-base font-semibold">GC</span>
        </p>
      </div>

      {message && (
        <div className="mt-3 rounded-xl bg-slate-800 px-3 py-2 text-center text-xs font-semibold text-white">{message}</div>
      )}

      {TIER_ORDER.map((tier) => (
        <div key={tier} className="mt-5">
          <p className="mb-2 text-sm font-semibold text-slate-700">{TIER_LABELS[tier]}</p>
          <div className="flex flex-col gap-2">
            {EXCHANGE_ITEMS.filter((i) => i.tier === tier).map((item) => {
              const affordable = balance >= item.cost;
              return (
                <div key={item.key} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <span className="text-2xl">{item.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.description}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-bold text-blue-700">{item.cost.toLocaleString()} GC</span>
                    <button
                      onClick={() => handleRedeem(item)}
                      disabled={!affordable}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition active:scale-95 ${
                        affordable ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      交換する
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mb-3 mt-6 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-slate-400" />
        <p className="text-sm font-semibold text-slate-700">交換履歴</p>
      </div>
      {myHistory.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-400">まだ交換履歴はありません。</p>
      ) : (
        <div className="flex flex-col gap-2 pb-4">
          {myHistory.slice(0, 8).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span>
                {r.emoji} {r.label}
              </span>
              <span className="flex items-center gap-2 text-slate-400">
                -{r.cost} GC・{timeAgo(r.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
