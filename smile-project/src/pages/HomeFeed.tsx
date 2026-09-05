import { useStore } from '../data/store';
import PostCard from '../components/PostCard';
import { currentSeasonalEvent } from '../types';

export default function HomeFeed() {
  const { posts, currentUser, totalPoints } = useStore();
  const event = currentSeasonalEvent(new Date());
  const points = totalPoints(currentUser.id);
  const myPostCount = posts.filter((p) => p.userId === currentUser.id).length;
  const pendingCount = posts.filter((p) => p.userId === currentUser.id && !p.grant).length;

  return (
    <div className="mx-auto max-w-md pb-4">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span className="text-2xl">{event.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">{event.seasonLabel}・開催中</p>
          <p className="truncate text-sm font-bold text-foreground">{event.title}</p>
        </div>
      </div>

      <div className="flex items-center divide-x divide-border border-b border-border px-4 py-3 text-center">
        <div className="flex-1">
          <p className="font-display text-base font-bold text-coin">✨ {points}P</p>
          <p className="text-[10px] text-muted-foreground">保有ポイント</p>
        </div>
        <div className="flex-1">
          <p className="font-display text-base font-bold text-primary">{myPostCount}</p>
          <p className="text-[10px] text-muted-foreground">投稿数</p>
        </div>
        <div className="flex-1">
          <p className="font-display text-base font-bold text-foreground">{pendingCount}</p>
          <p className="text-[10px] text-muted-foreground">承認待ち</p>
        </div>
      </div>

      <div className="flex flex-col">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
