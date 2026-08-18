import { useStore } from '../data/store';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';
import { EXCHANGE_ITEMS, missionForDate } from '../types';
import { Card } from '@/components/ui/card';

export default function HomeFeed() {
  const { posts, currentUser, totalCoins, todaysBuddy } = useStore();
  const mission = missionForDate(new Date());
  const buddy = todaysBuddy(currentUser.id);
  const coins = totalCoins(currentUser.id);
  const affordableCount = EXCHANGE_ITEMS.filter((i) => i.cost <= coins).length;

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary to-[#6c53f5] p-3.5 text-white shadow-sm">
        <span className="text-2xl">{mission.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">今日のミッション</p>
          <p className="truncate text-xs font-bold">{mission.title}</p>
        </div>
        <div className="h-6 w-px bg-white/25" />
        <Avatar src={buddy.avatar} alt={buddy.name} className="h-7 w-7 shrink-0 rounded-full bg-white/30 text-sm" />
        <div className="min-w-0">
          <p className="text-[10px] text-white/70">本日のバディ</p>
          <p className="truncate text-xs font-bold">{buddy.name}</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <Card className="items-center gap-0.5 p-3 text-center">
          <p className="font-display text-lg font-bold text-coin-foreground">🪙 {coins}</p>
          <p className="text-[11px] text-muted-foreground">Genesisコイン</p>
        </Card>
        <Card className="items-center gap-0.5 p-3 text-center">
          <p className="font-display text-lg font-bold text-primary">{affordableCount}</p>
          <p className="text-[11px] text-muted-foreground">交換可能アイテム</p>
        </Card>
        <Card className="items-center gap-0.5 p-3 text-center">
          <p className="font-display text-lg font-bold text-foreground">{posts.filter((p) => p.userId === currentUser.id).length}</p>
          <p className="text-[11px] text-muted-foreground">投稿数</p>
        </Card>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <p className="text-sm font-semibold text-foreground">みんなのスマイル</p>
      </div>

      <div className="flex flex-col gap-3 pb-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
