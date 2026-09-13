import type { EventPost } from '../types';
import { PHASE_META, POINT_RULE, findEventAction } from '../types';
import { useStore } from '../data/store';
import Avatar from './Avatar';
import { isImageSrc } from '../utils/media';
import { cn } from '@/lib/utils';
import { Heart, Sparkles } from 'lucide-react';

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

export default function PostCard({ post }: { post: EventPost }) {
  const { currentUser, memberById, toggleLike, isPostEarned, managerLikeCount } = useStore();

  const iLiked = post.likes.includes(currentUser.id);
  const action = findEventAction(post.actionKey);
  const phaseMeta = PHASE_META[post.phase];
  const earned = isPostEarned(post);
  const mgrLikes = managerLikeCount(post);
  const remaining = Math.max(0, POINT_RULE.minLikes - post.likes.length);

  const likers = post.likes
    .map((id) => memberById(id))
    .filter((m): m is NonNullable<typeof m> => !!m);

  let progressMessage: string | null = null;
  if (!earned) {
    if (mgrLikes === 0) {
      progressMessage =
        post.likes.length >= POINT_RULE.minLikes
          ? '店長・上長のいいねでポイント獲得！'
          : `店長・上長を含む${POINT_RULE.minLikes}人のいいねでポイント獲得（あと${remaining}件）`;
    } else {
      progressMessage = `あと${remaining}件のいいねでポイント獲得！`;
    }
  }

  return (
    <div className="border-b border-border pb-4">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="rounded-full bg-gradient-to-tr from-story-1 via-story-2 to-story-3 p-[2px]">
          <Avatar src={post.avatar} alt={post.userName} className="h-10 w-10 rounded-full border-2 border-card bg-secondary text-lg" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-foreground">{post.userName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {timeAgo(post.createdAt)} ・ {phaseMeta.emoji} {phaseMeta.label} ・ {action?.label}
          </p>
        </div>
      </div>

      <div className="relative flex items-center justify-center overflow-hidden bg-muted">
        {isImageSrc(post.photo) ? (
          <img src={post.photo} alt="イベント報告" className="aspect-[4/5] w-full object-cover" />
        ) : (
          <div className="flex aspect-[4/5] w-full items-center justify-center text-8xl">{post.photo}</div>
        )}
        {action && (
          <div
            className={cn(
              'absolute right-3 top-3 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold shadow-sm',
              earned ? 'bg-coin text-coin-foreground' : 'bg-black/60 text-white',
            )}
          >
            {earned && <Sparkles className="size-3" />}+{action.points}P
          </div>
        )}
      </div>

      <div className="px-4 pt-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => toggleLike(post.id)}
            className={cn('transition-transform active:scale-90', iLiked ? 'text-story-2' : 'text-foreground')}
          >
            <Heart className="size-6" strokeWidth={1.8} fill={iLiked ? 'currentColor' : 'none'} />
          </button>

          {earned && (
            <span className="flex items-center gap-1 text-xs font-bold text-coin">
              <Sparkles className="size-3.5" />+{action?.points ?? 0}P 獲得！
            </span>
          )}
        </div>

        {likers.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {likers.slice(0, 6).map((m) => (
                <Avatar
                  key={m.id}
                  src={m.avatar}
                  alt={m.name}
                  className={cn(
                    'h-5 w-5 rounded-full border-2 border-card text-[10px]',
                    m.role === 'manager' ? 'ring-1 ring-coin' : '',
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-foreground/80">
              <span className="font-semibold">{post.likes.length}件</span>のいいね
              {mgrLikes > 0 && <span className="text-muted-foreground">（店長・上長を含む）</span>}
            </p>
          </div>
        )}

        {progressMessage && <p className="mt-1 text-xs text-muted-foreground">{progressMessage}</p>}

        {post.comment && (
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            <span className="font-semibold">{post.userName}</span> {post.comment}
          </p>
        )}
      </div>
    </div>
  );
}
