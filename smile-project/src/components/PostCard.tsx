import type { SmilePost } from '../types';
import { APPROVALS_REQUIRED, APPROVAL_BONUS_COINS, CHECKLIST_ITEMS, STAMP_OPTIONS } from '../types';
import { useStore } from '../data/store';
import Avatar from './Avatar';
import { isImageSrc } from '../utils/media';
import { cn } from '@/lib/utils';
import { Heart, Target } from 'lucide-react';

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
    <div className="border-b border-border pb-3.5">
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        <span className="rounded-full bg-gradient-to-tr from-story-1 via-story-2 to-story-3 p-[2px]">
          <Avatar src={post.avatar} alt={post.userName} className="h-9 w-9 rounded-full border-2 border-card bg-secondary text-lg" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{post.userName}</p>
          <p className="text-[11px] text-muted-foreground">{timeAgo(post.createdAt)}</p>
        </div>
        <span className="font-display shrink-0 text-xs font-bold text-coin-foreground">🪙 {post.score}</span>
      </div>

      {post.missionTitle && (
        <div className="mx-4 mb-2 flex w-fit items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-primary">
          <Target className="size-3" />
          「{post.missionTitle}」達成
        </div>
      )}

      <div className="relative flex items-center justify-center overflow-hidden bg-muted">
        {isImageSrc(post.photo) ? (
          <img src={post.photo} alt="スマイル投稿" className="aspect-[4/5] w-full object-cover" />
        ) : (
          <div className="flex aspect-[4/5] w-full items-center justify-center text-8xl">{post.photo}</div>
        )}
        {post.prop && (
          <div className="absolute left-2.5 top-2.5 max-w-[75%] rounded-2xl rounded-tl-sm bg-white/95 px-2.5 py-1.5 text-[11px] font-bold text-foreground shadow-sm">
            {post.prop}
          </div>
        )}
        {stamp && (
          <div
            title={stamp.label}
            className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-lg shadow-sm"
          >
            {stamp.emoji}
          </div>
        )}
      </div>

      <div className="px-4 pt-2.5">
        <div className="flex items-center justify-between">
          {isMine ? (
            <button
              onClick={simulateColleagueApproval}
              disabled={post.approvalBonusAwarded}
              title="デモ用：タップすると同僚が承認した想定で進みます"
              className="flex items-center gap-1.5 text-muted-foreground disabled:opacity-40"
            >
              <Heart className="size-6" strokeWidth={1.8} />
            </button>
          ) : (
            <button
              onClick={() => toggleApproval(post.id, currentUser.id)}
              className={cn('transition-transform active:scale-90', myApproval ? 'text-story-2' : 'text-foreground')}
            >
              <Heart className="size-6" strokeWidth={1.8} fill={myApproval ? 'currentColor' : 'none'} />
            </button>
          )}
          {post.approvalBonusAwarded && (
            <span className="text-[11px] font-bold text-coin-foreground">🪙 +{APPROVAL_BONUS_COINS} GCボーナス獲得</span>
          )}
        </div>

        <div className="mt-1.5 flex items-center gap-1">
          <div className="flex -space-x-1.5">
            {post.approvals.map((a) => (
              <Avatar
                key={a.userId}
                src={a.avatar}
                alt={a.userName}
                className="h-4 w-4 rounded-full border border-card bg-secondary text-[9px]"
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {post.approvals.length === 0
              ? isMine
                ? `承認待ち・あと${remaining}人`
                : 'いいねしよう'
              : `${post.approvals.length}/${APPROVALS_REQUIRED}人が承認`}
          </p>
        </div>

        {post.comment && (
          <p className="mt-1 text-sm leading-snug text-foreground">
            <span className="font-semibold">{post.userName}</span> {post.comment}
          </p>
        )}

        <div className="mt-1.5 flex flex-wrap gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
          {post.checklist.map((key) => {
            const item = CHECKLIST_ITEMS.find((c) => c.key === key);
            if (!item) return null;
            return (
              <span key={key}>
                {item.emoji} {item.label}
              </span>
            );
          })}
        </div>

        {buddies.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">🤝 {buddies.map((b) => b.name).join('、')} さんと一緒に</p>
        )}
      </div>
    </div>
  );
}
