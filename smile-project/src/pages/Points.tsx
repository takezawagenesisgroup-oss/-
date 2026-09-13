import { useState } from 'react';
import { useStore } from '../data/store';
import Avatar from '../components/Avatar';
import type { Tab } from '../components/BottomNav';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Coins, RefreshCw } from 'lucide-react';
import { PHASE_META, POINT_LIMITS, findEventAction } from '../types';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const MEDALS = ['🥇', '🥈', '🥉'];

function stampStyle(score: number): string {
  if (score === 0) return '';
  if (score >= 500) return 'bg-primary text-primary-foreground';
  if (score >= 200) return 'bg-secondary text-primary';
  return 'bg-coin/20 text-coin';
}

interface ActivityEntry {
  id: string;
  label: string;
  points: number;
  createdAt: string;
}

export default function Points({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { currentUser, totalPoints, monthlyScores, overallLeaderboard, posts, redemptions, toggleRole } = useStore();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const scores = monthlyScores(currentUser.id, viewYear, viewMonth);
  const monthTotal = [...scores.values()].reduce((a, b) => a + b, 0);
  const daysWithPoints = scores.size;
  const entries = overallLeaderboard();

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
      .filter((p) => p.pointsEarnedAt)
      .map((p) => {
        const action = findEventAction(p.actionKey);
        return {
          id: `earn-${p.id}`,
          label: `${new Date(p.pointsEarnedAt!).getMonth() + 1}月${new Date(p.pointsEarnedAt!).getDate()}日：${PHASE_META[p.phase].label}「${action?.label ?? ''}」で獲得`,
          points: action?.points ?? 0,
          createdAt: p.pointsEarnedAt!,
        };
      }),
    ...redemptions
      .filter((r) => r.userId === currentUser.id)
      .map((r) => ({
        id: `redeem-${r.id}`,
        label: `${r.emoji} ${r.label}と交換`,
        points: -r.cost,
        createdAt: r.createdAt,
      })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <div className="rounded-2xl border border-border p-5">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-gradient-to-tr from-story-1 via-story-2 to-story-3 p-[2px]">
            <Avatar src={currentUser.avatar} alt={currentUser.name} className="h-14 w-14 rounded-full border-2 border-card bg-secondary text-3xl" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">
              {currentUser.name}
              <span className="ml-1.5 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-primary">
                {currentUser.role === 'manager' ? '店長・上長' : 'スタッフ'}
              </span>
            </p>
            <p className="font-display text-2xl font-bold text-foreground">✨ {totalPoints(currentUser.id)} P</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-muted py-2">
            <p className="font-display text-lg font-bold text-foreground">{myPosts.length}</p>
            <p className="text-xs text-muted-foreground">総投稿数</p>
          </div>
          <button onClick={() => onNavigate('exchange')} className="flex flex-col items-center justify-center gap-0.5 rounded-xl bg-coin py-2 text-coin-foreground active:scale-95">
            <Coins className="size-4" />
            <p className="text-xs font-semibold">ポイントを使う</p>
          </button>
        </div>
      </div>

      <button
        onClick={toggleRole}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs text-muted-foreground active:scale-95"
      >
        <RefreshCw className="size-3.5" />
        🔧 デモ用：表示モードを「{currentUser.role === 'manager' ? 'スタッフ' : '店長・上長'}」に切り替える
      </button>

      <Card className="mt-4 flex-row items-center justify-between p-3 text-center">
        <div className="flex-1">
          <p className="font-display text-sm font-bold text-foreground">{POINT_LIMITS.daily}P</p>
          <p className="text-xs text-muted-foreground">1日の目安</p>
        </div>
        <div className="flex-1 border-x border-border">
          <p className="font-display text-sm font-bold text-foreground">{POINT_LIMITS.monthly.toLocaleString()}P</p>
          <p className="text-xs text-muted-foreground">月間上限</p>
        </div>
        <div className="flex-1">
          <p className="font-display text-sm font-bold text-foreground">{POINT_LIMITS.annual.toLocaleString()}P</p>
          <p className="text-xs text-muted-foreground">年間目安</p>
        </div>
      </Card>

      <div className="mb-3 mt-5 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-coin" />
        <p className="text-sm font-semibold text-foreground">みんなのポイント</p>
      </div>
      <div className="flex flex-col gap-2">
        {entries.map((entry, idx) => {
          const isMe = entry.member.id === currentUser.id;
          return (
            <Card key={entry.member.id} className={cn('flex-row items-center gap-3 p-3', isMe && 'border-primary bg-secondary/50')}>
              <span className="w-6 shrink-0 text-center text-lg font-bold text-muted-foreground">{MEDALS[idx] ?? idx + 1}</span>
              <Avatar src={entry.member.avatar} alt={entry.member.name} className="h-10 w-10 rounded-full bg-secondary text-lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {entry.member.name}
                  {entry.member.role === 'manager' && <span className="ml-1 text-xs font-normal text-muted-foreground">（店長）</span>}
                  {isMe && <span className="ml-1 text-xs font-normal text-primary">（自分）</span>}
                </p>
                <p className="text-xs text-muted-foreground">承認{entry.postCount}件</p>
              </div>
              <p className="font-display shrink-0 text-lg font-bold text-coin">{entry.points}P</p>
            </Card>
          );
        })}
      </div>

      <Card className="mt-5 p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => changeMonth(-1)} className="rounded-full p-1 text-muted-foreground active:scale-95">
            <ChevronLeft className="size-4" />
          </button>
          <p className="text-sm font-semibold text-foreground">
            {viewYear}年{viewMonth + 1}月のポイント獲得
          </p>
          <button onClick={() => changeMonth(1)} className="rounded-full p-1 text-muted-foreground active:scale-95">
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
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
                    'flex aspect-square flex-col items-center justify-center rounded-lg text-xs',
                    score > 0 ? stampStyle(score) : 'bg-muted text-muted-foreground/50',
                    isToday && 'ring-2 ring-coin',
                  )}
                >
                  <span>{day}</span>
                  {score > 0 && <span className="text-[11px] font-bold">{score}</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
          <span>今月の承認日数：{daysWithPoints}日</span>
          <span className="font-semibold text-primary">今月の合計：✨ {monthTotal} P</span>
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <p className="text-sm font-semibold text-foreground">✨ 最近のポイント履歴</p>
        {activity.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">まだ実績はありません。イベント報告で承認を集めましょう！</p>
        ) : (
          <div className="flex flex-col gap-2">
            {activity.slice(0, 6).map((a) => (
              <div
                key={a.id}
                className={cn(
                  'flex items-center justify-between rounded-xl px-3 py-2 text-xs',
                  a.points >= 0 ? 'bg-coin/10 text-coin' : 'bg-muted text-muted-foreground',
                )}
              >
                <span className="truncate pr-2">{a.label}</span>
                <span className="shrink-0 font-bold">
                  {a.points >= 0 ? '+' : ''}
                  {a.points} P
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
