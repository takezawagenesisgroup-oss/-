import { useState } from 'react';
import type { EventPost } from '../types';
import { findEventAction } from '../types';
import { useStore } from '../data/store';
import Avatar from './Avatar';
import { isImageSrc } from '../utils/media';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Heart, Award } from 'lucide-react';

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
  const { currentUser, toggleLike, grantPoints } = useStore();
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [grantComment, setGrantComment] = useState('');

  const isMine = post.userId === currentUser.id;
  const iLiked = post.likes.includes(currentUser.id);
  const action = findEventAction(post.actionKey);
  const canGrant = currentUser.role === 'manager' && !isMine && !post.grant;

  function handleGrant() {
    if (!grantComment.trim()) return;
    grantPoints(post.id, grantComment.trim());
    setShowGrantForm(false);
    setGrantComment('');
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
        {action && (
          <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-primary">
            {post.phase === 'prep' ? '事前編' : '当日編'}・{action.emoji} {action.label}
          </span>
        )}
      </div>

      <div className="relative flex items-center justify-center overflow-hidden bg-muted">
        {isImageSrc(post.photo) ? (
          <img src={post.photo} alt="イベント報告" className="aspect-[4/5] w-full object-cover" />
        ) : (
          <div className="flex aspect-[4/5] w-full items-center justify-center text-8xl">{post.photo}</div>
        )}
        {action && (
          <div className="absolute right-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-neutral-900 shadow-sm">
            +{action.points}P
          </div>
        )}
      </div>

      <div className="px-4 pt-2.5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => toggleLike(post.id)}
            className={cn('transition-transform active:scale-90', iLiked ? 'text-story-2' : 'text-foreground')}
          >
            <Heart className="size-6" strokeWidth={1.8} fill={iLiked ? 'currentColor' : 'none'} />
          </button>

          {post.grant ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-coin">
              <Award className="size-3.5" />+{post.grant.points}P承認済み
            </span>
          ) : canGrant && !showGrantForm ? (
            <Button onClick={() => setShowGrantForm(true)} size="sm" variant="coin">
              ポイントを送る
            </Button>
          ) : isMine && !post.grant ? (
            <span className="text-[11px] text-muted-foreground">ポイント承認待ち</span>
          ) : null}
        </div>

        {post.likes.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{post.likes.length}件のいいね</p>}

        {showGrantForm && (
          <div className="mt-2 flex flex-col gap-2 rounded-xl border border-border bg-secondary/40 p-2.5">
            <textarea
              value={grantComment}
              onChange={(e) => setGrantComment(e.target.value)}
              placeholder="承認コメントを入力（必須）：例）お客様対応が素晴らしかったです！"
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-card p-2 text-xs text-foreground outline-none focus:border-primary"
            />
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setShowGrantForm(false)} className="text-xs text-muted-foreground">
                キャンセル
              </button>
              <Button onClick={handleGrant} disabled={!grantComment.trim()} size="sm" variant="coin">
                +{action?.points}P を承認して送る
              </Button>
            </div>
          </div>
        )}

        {post.grant && (
          <div className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-coin/10 px-2.5 py-1.5 text-xs text-coin">
            <Avatar src={post.grant.managerAvatar} alt={post.grant.managerName} className="h-4 w-4 rounded-full text-[9px]" />
            <span>
              {post.grant.managerName}（店長）「{post.grant.comment}」
            </span>
          </div>
        )}

        {post.comment && (
          <p className="mt-1.5 text-sm leading-snug text-foreground">
            <span className="font-semibold">{post.userName}</span> {post.comment}
          </p>
        )}
      </div>
    </div>
  );
}
