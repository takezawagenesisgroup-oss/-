import { useStore } from '../data/store';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';
import { EXCHANGE_ITEMS, missionForDate } from '../types';

function StoryBubble({ emoji, avatar, label, sub }: { emoji?: string; avatar?: string; label: string; sub: string }) {
  return (
    <div className="flex w-16 shrink-0 flex-col items-center gap-1 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-story-1 via-story-2 to-story-3 p-[2.5px]">
        <span className="flex h-full w-full items-center justify-center rounded-full border-2 border-card bg-secondary text-2xl">
          {avatar ? <Avatar src={avatar} alt={label} className="h-full w-full rounded-full" /> : emoji}
        </span>
      </span>
      <p className="w-full truncate text-[10px] font-semibold text-foreground">{sub}</p>
    </div>
  );
}

export default function HomeFeed() {
  const { posts, currentUser, totalCoins, todaysBuddy } = useStore();
  const mission = missionForDate(new Date());
  const buddy = todaysBuddy(currentUser.id);
  const coins = totalCoins(currentUser.id);
  const affordableCount = EXCHANGE_ITEMS.filter((i) => i.cost <= coins).length;
  const myPostCount = posts.filter((p) => p.userId === currentUser.id).length;

  return (
    <div className="mx-auto max-w-md pb-4">
      <div className="flex gap-4 overflow-x-auto border-b border-border px-4 py-3">
        <StoryBubble emoji={mission.icon} label="ミッション" sub={mission.title} />
        <StoryBubble avatar={buddy.avatar} label={buddy.name} sub={buddy.name} />
      </div>

      <div className="flex items-center divide-x divide-border border-b border-border px-4 py-3 text-center">
        <div className="flex-1">
          <p className="font-display text-base font-bold text-coin">🪙 {coins}</p>
          <p className="text-[10px] text-muted-foreground">Genesisコイン</p>
        </div>
        <div className="flex-1">
          <p className="font-display text-base font-bold text-primary">{affordableCount}</p>
          <p className="text-[10px] text-muted-foreground">交換可能</p>
        </div>
        <div className="flex-1">
          <p className="font-display text-base font-bold text-foreground">{myPostCount}</p>
          <p className="text-[10px] text-muted-foreground">投稿数</p>
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
