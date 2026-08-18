import type { SmilePost } from '../types';
import { APPROVALS_REQUIRED, APPROVAL_BONUS_COINS, CHECKLIST_ITEMS, STAMP_OPTIONS } from '../types';
import { useStore } from '../data/store';
import Avatar from './Avatar';
import { isImageSrc } from '../utils/media';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThumbsUp, Check, Target } from 'lucide-react';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function PostCard({ post }: { post: SmilePost }) {
  const { currentUser, toggleApproval, colleagues, memberById } = useStore();
  const isMine = post.userId === currentUser.id;
  const myApproval = post.approvals.some((a) => a.userId === currentUser.id);
  const remaining = Math.max(0, APPROVALS_REQUIRED - post.approvals.length);
  const stamp = post.stampKey ? STAMP_OPTIONS.find((s) => s.key === post.stampKey) : undefined;
  const buddies = (post.buddyIds ?? []).map((id) => memberById(id)).filter((m): m is NonNullable<typeof m> => Boolean(m));

  function simulateColleagueApproval() {
    const notYet = colleagues.filter((c) => !post.approvals.some((a) => a.userId === c.id));
    if (notYet.length === 0) return;
    const picked = notYet[Math.floor(Math.random() * notYet.length)];
    toggleApproval(post.id, picked.id);
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Avatar src={post.avatar} alt={post.userName} className="h-10 w-10 rounded-full bg-secondary text-xl" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{post.userName}</p>
          <p className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</p>
        </div>
        <Badge variant="coin" className="font-display">
          🪙 {post.score} GC
        </Badge>
      </div>

      {post.missionTitle && (
        <Badge variant="secondary" className="w-fit gap-1">
          <Target className="size-3" />本日のミッション「{post.missionTitle}」達成
        </Badge>
      )}

      <div className="relative flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-coin/15 to-secondary">
        {isImageSrc(post.photo) ? (
          <img src={post.photo} alt="スマイル投稿" className="h-48 w-full object-cover" />
        ) : (
          <div className="flex h-48 w-full items-center justify-center text-7xl">{post.photo}</div>
        )}
        {post.prop && (
          <div className="absolute left-2 top-2 max-w-[75%] rounded-2xl rounded-tl-sm bg-white/90 px-2.5 py-1.5 text-[11px] font-bold text-foreground shadow">
            {post.prop}
          </div>
        )}
        {stamp && (
          <div
            title={stamp.label}
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg shadow"
          >
            {stamp.emoji}
          </div>
        )}
      </div>

      {post.comment && (
        <div className="flex gap-2 rounded-xl bg-coin/10 px-3 py-2.5">
          <span className="text-coin-foreground/60">❝</span>
          <p className="text-sm leading-snug text-foreground">{post.comment}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {post.checklist.map((key) => {
          const item = CHECKLIST_ITEMS.find((c) => c.key === key);
          if (!item) return null;
          return (
            <Badge key={key} variant="secondary">
              {item.emoji} {item.label}
            </Badge>
          );
        })}
      </div>

      {buddies.length > 0 && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          🤝 {buddies.map((b) => b.name).join('、')} さんと一緒に
        </p>
      )}

      <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-2">
            {post.approvals.length === 0 && <span className="text-xs text-muted-foreground">まだ承認なし</span>}
            {post.approvals.map((a) => (
              <Avatar
                key={a.userId}
                src={a.avatar}
                alt={a.userName}
                className="h-6 w-6 rounded-full border-2 border-card bg-secondary text-xs"
              />
            ))}
          </div>
          {post.approvals.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {post.approvals.length}/{APPROVALS_REQUIRED}人承認
            </span>
          )}
        </div>

        {post.approvalBonusAwarded ? (
          <Badge variant="coin" className="gap-1">
            🪙 ボーナス+{APPROVAL_BONUS_COINS} GC獲得
          </Badge>
        ) : isMine ? (
          <Button
            onClick={simulateColleagueApproval}
            size="sm"
            variant="secondary"
            title="デモ用：タップすると同僚が承認した想定で進みます"
          >
            承認待ち・あと{remaining}人（デモで進める）
          </Button>
        ) : (
          <Button onClick={() => toggleApproval(post.id, currentUser.id)} size="sm" variant={myApproval ? 'default' : 'default'}>
            {myApproval ? (
              <>
                <Check className="size-3.5" />
                承認済み（タップで取消）
              </>
            ) : (
              <>
                <ThumbsUp className="size-3.5" />
                承認する
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}
