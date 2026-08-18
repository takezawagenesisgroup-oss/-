import { useStore } from '../data/store';
import Avatar from '../components/Avatar';
import { SEASONAL_EVENTS, currentSeasonalEvent } from '../types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Crown, Sparkles } from 'lucide-react';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Events() {
  const { currentUser, eventParticipants, hasJoinedEvent, eventLeader, joinEvent, volunteerAsLeader, weeklyLeaderboard } = useStore();
  const current = currentSeasonalEvent(new Date());
  const leader = eventLeader(current.key);
  const participants = eventParticipants(current.key).filter((p) => p.role === 'participant');
  const iJoined = hasJoinedEvent(current.key, currentUser.id);
  const iAmLeader = leader?.userId === currentUser.id;
  const entries = weeklyLeaderboard();

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-[#6c53f5] p-4 text-white shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">{current.seasonLabel}・進行中のイベント</p>
        <p className="font-display mt-0.5 text-lg font-bold">
          {current.emoji} {current.title}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-white/80">{current.description}</p>
        <Badge variant="secondary" className="mt-2 gap-1 bg-white/15 text-white">
          <Sparkles className="size-3" />
          勝手に身につくスキル：{current.skillTag}
        </Badge>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button onClick={() => joinEvent(current.key)} disabled={iJoined} variant={iJoined ? 'coin' : 'subtle'} className="w-full">
            {iJoined ? '✓ 参加登録済み' : `参加する（+${current.participateCoins} GC）`}
          </Button>
          <Button
            onClick={() => volunteerAsLeader(current.key)}
            disabled={Boolean(leader)}
            variant={iAmLeader ? 'coin' : 'subtle'}
            className={cn('w-full', leader && !iAmLeader && 'text-white/60')}
          >
            {iAmLeader ? (
              <>
                <Crown className="size-3.5" />
                あなたがリーダー
              </>
            ) : leader ? (
              `リーダー：${leader.userName}`
            ) : (
              `リーダーに挙手（+${current.leaderCoins} GC）`
            )}
          </Button>
        </div>

        {(participants.length > 0 || leader) && (
          <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2">
            <div className="flex -space-x-2">
              {leader && <Avatar src={leader.avatar} alt={leader.userName} className="h-6 w-6 rounded-full border-2 border-white bg-coin/40 text-xs" />}
              {participants.slice(0, 5).map((p) => (
                <Avatar key={p.id} src={p.avatar} alt={p.userName} className="h-6 w-6 rounded-full border-2 border-white bg-white/30 text-xs" />
              ))}
            </div>
            <span className="text-[11px] text-white/80">
              {leader ? `${leader.userName}（リーダー）ほか` : ''}
              {participants.length}人が参加中
            </span>
          </div>
        )}
      </div>

      <div className="mb-3 mt-4 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <p className="text-sm font-semibold text-foreground">年間ロードマップ（四季の成長プロジェクト）</p>
      </div>
      <div className="flex flex-col gap-2">
        {SEASONAL_EVENTS.map((ev) => {
          const isCurrent = ev.key === current.key;
          return (
            <Card key={ev.key} className={cn('gap-2 p-3', isCurrent && 'border-primary bg-secondary/50')}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{ev.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">{ev.seasonLabel}</p>
                  <p className="truncate text-sm font-semibold text-foreground">{ev.title}</p>
                </div>
                {isCurrent && <Badge>開催中</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{ev.description}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary">💡 {ev.skillTag}</Badge>
                <Badge variant="success">参加 +{ev.participateCoins} GC</Badge>
                <Badge variant="coin">リーダー +{ev.leaderCoins} GC</Badge>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mb-3 mt-5 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-primary" />
        <p className="text-sm font-semibold text-foreground">週間コインランキング</p>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">今週（月〜日）の獲得Genesisコイン順</p>
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
                  {isMe && <span className="ml-1 text-xs font-normal text-primary">（自分）</span>}
                </p>
                <p className="text-xs text-muted-foreground">投稿{entry.postCount}件</p>
              </div>
              <p className="font-display shrink-0 text-lg font-bold text-primary">{entry.coins} GC</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
