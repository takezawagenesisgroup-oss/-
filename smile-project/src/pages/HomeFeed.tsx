import { useStore } from '../data/store';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';
import { missionForDate } from '../types';

export default function HomeFeed() {
  const { posts, currentUser, totalPoints, ticketCount, todaysBuddy } = useStore();
  const mission = missionForDate(new Date());
  const buddy = todaysBuddy(currentUser.id);

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-500 p-3.5 text-white shadow-sm">
        <span className="text-2xl">{mission.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-100">今日のミッション</p>
          <p className="truncate text-xs font-bold">{mission.title}</p>
        </div>
        <div className="h-6 w-px bg-white/25" />
        <Avatar src={buddy.avatar} alt={buddy.name} className="h-7 w-7 shrink-0 rounded-full bg-white/30 text-sm" />
        <div className="min-w-0">
          <p className="text-[10px] text-blue-100">本日のバディ</p>
          <p className="truncate text-xs font-bold">{buddy.name}</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-blue-700">{totalPoints(currentUser.id)}</p>
          <p className="text-[11px] text-slate-400">累計ポイント</p>
        </div>
        <div className="rounded-xl bg-white p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-amber-600">{ticketCount(currentUser.id)}</p>
          <p className="text-[11px] text-slate-400">獲得チケット</p>
        </div>
        <div className="rounded-xl bg-white p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-slate-700">{posts.filter((p) => p.userId === currentUser.id).length}</p>
          <p className="text-[11px] text-slate-400">投稿数</p>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <p className="text-sm font-semibold text-slate-700">みんなのスマイル</p>
      </div>

      <div className="flex flex-col gap-3 pb-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
