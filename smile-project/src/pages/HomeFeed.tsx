import { useStore } from '../data/store';
import PostCard from '../components/PostCard';
import { currentSeasonalEvent } from '../types';
import { Camera } from 'lucide-react';

export default function HomeFeed({ onCreateReport }: { onCreateReport: () => void }) {
  const { posts, currentUser, totalPoints } = useStore();
  const event = currentSeasonalEvent(new Date());
  const points = totalPoints(currentUser.id);

  return (
    <div className="mx-auto max-w-md pb-4">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-lg">{event.emoji}</span>
        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{event.seasonLabel}</span>・{event.title}
        </p>
        <p className="shrink-0 font-display text-sm font-bold text-coin">✨{points}P</p>
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
