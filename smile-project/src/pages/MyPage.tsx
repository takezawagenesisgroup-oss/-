import { useState } from 'react';
import { useStore } from '../data/store';
import Avatar from '../components/Avatar';
import { APPROVAL_BONUS_COINS, SEASONAL_EVENTS } from '../types';
import type { Tab } from '../components/BottomNav';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Coins } from 'lucide-react';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function stampStyle(score: number): string {
  if (score === 0) return '';
  if (score >= 100) return 'bg-primary text-white';
  if (score >= 60) return 'bg-secondary text-primary';
  return 'bg-coin/20 text-coin-foreground';
}

interface ActivityEntry {
  id: string;
  label: string;
  coins: number;
  createdAt: string;
}

export default function MyPage({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { currentUser, totalCoins, monthlyScores, posts, eventActions } = useStore();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const scores = monthlyScores(currentUser.id, viewYear, viewMonth);
  const monthTotal = [...scores.values()].reduce((a, b) => a + b, 0);
  const daysPosted = scores.size;

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  function changeMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  const myPosts = posts.filter((p) => p.userId === currentUser.id);
  const activity: ActivityEntry[] = [
    ...myPosts
      .filter((p) => p.approvalBonusAwarded)
      .map((p) => ({
        id: `bonus-${p.id}`,
        label: `${new Date(p.createdAt).getMonth() + 1}月${new Date(p.createdAt).getDate()}日のスマイル承認ボーナス`,
        coins: APPROVAL_BONUS_COINS,
        createdAt: p.createdAt,
      })),
    ...eventActions
      .filter((e) => e.userId === currentUser.id)
      .map((e) => {
        const ev = SEASONAL_EVENTS.find((s) => s.key === e.eventKey);
        return {
          id: e.id,
          label: `${ev?.emoji ?? '🎉'} ${ev?.title ?? e.eventKey}${e.role === 'leader' ? '（リーダー）' : '（参加）'}`,
          coins: e.coins,
          createdAt: e.createdAt,
        };
      }),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-[#6c53f5] p-5 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar src={currentUser.avatar} alt={currentUser.name} className="h-14 w-14 rounded-full bg-white/20 text-3xl" />
          <div>
            <p className="text-sm text-white/70">{currentUser.name}</p>
            <p className="font-display text-2xl font-bold">🪙 {totalCoins(currentUser.id)} GC</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-white/10 py-2">
            <p className="font-display text-lg font-bold">{myPosts.length}</p>
            <p className="text-[11px] text-white/70">総投稿数</p>
          </div>
          <button onClick={() => onNavigate('exchange')} className="flex flex-col items-center justify-center gap-0.5 rounded-xl bg-coin py-2 text-coin-foreground active:scale-95">
            <Coins className="size-4" />
            <p className="text-[11px] font-semibold">コインを使う</p>
          </button>
        </div>
      </div>

      <Card className="mt-4 p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => changeMonth(-1)} className="rounded-full p-1 text-muted-foreground active:scale-95">
            <ChevronLeft className="size-4" />
          </button>
          <p className="text-sm font-semibold text-foreground">
            {viewYear}年{viewMonth + 1}月のスタンプ
          </p>
          <button onClick={() => changeMonth(1)} className="rounded-full p-1 text-muted-foreground active:scale-95">
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (day === null) return <div key={idx} />;
              const score = scores.get(day) ?? 0;
              const isToday = isCurrentMonth && day === now.getDate();
              return (
                <div
                  key={idx}
                  className={cn(
                    'flex aspect-square flex-col items-center justify-center rounded-lg text-[11px]',
                    score > 0 ? stampStyle(score) : 'bg-muted text-muted-foreground/50',
                    isToday && 'ring-2 ring-coin',
                  )}
                >
                  <span>{day}</span>
                  {score > 0 && <span className="text-[10px] font-bold">{score}</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
          <span>今月の投稿日数：{daysPosted}日</span>
          <span className="font-semibold text-primary">今月の合計：🪙 {monthTotal} GC</span>
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <p className="text-sm font-semibold text-foreground">🪙 最近のコイン獲得</p>
        {activity.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">まだ実績はありません。投稿やイベント参加でコインを貯めましょう！</p>
        ) : (
          <div className="flex flex-col gap-2">
            {activity.slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl bg-coin/10 px-3 py-2 text-xs text-coin-foreground">
                <span>{a.label}</span>
                <span className="font-bold">+{a.coins} GC</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
