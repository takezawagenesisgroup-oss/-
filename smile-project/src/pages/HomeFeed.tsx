import { useStore } from '../data/store';
import PostCard from '../components/PostCard';
import { currentSeasonalEvent } from '../types';
import { Camera } from 'lucide-react';

export default function HomeFeed({ onCreateReport }: { onCreateReport: () => void }) {
  const { posts, currentUser, totalPoints } = useStore();
  const event = currentSeasonalEvent(new Date());
  const points = totalPoints(currentUser.id);
  const myPostCount = posts.filter((p) => p.userId === currentUser.id).length;
  const pendingCount = posts.filter((p) => p.userId === currentUser.id && !p.pointsEarnedAt).length;

  return (
    <div className="mx-auto max-w-md pb-4">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span className="text-2xl">{event.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{event.seasonLabel}・開催中</p>
          <p className="truncate text-sm font-bold text-foreground">{event.title}</p>
        </div>
      </div>

      <div className="flex items-center divide-x divide-border border-b border-border px-4 py-3 text-center">
        <div className="flex-1">
          <p className="font-display text-base font-bold text-coin">✨ {points}P</p>
          <p className="text-xs text-muted-foreground">保有ポイント</p>
        </div>
        <div className="flex-1">
          <p className="font-display text-base font-bold text-primary">{myPostCount}</p>
          <p className="text-xs text-muted-foreground">投稿数</p>
        </div>
        <div className="flex-1">
          <p className="font-display text-base font-bold text-foreground">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">いいね待ち</p>
        </div>
      </div>

      <div className="flex flex-col">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      <button
        onClick={onCreateReport}
        aria-label="報告する"
        className="fixed bottom-20 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-90"
      >
        <Camera className="size-6" />
      </button>
    </div>
  );
}
