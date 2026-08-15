import { useStore } from '../data/store';
import Avatar from '../components/Avatar';

const MEDALS = ['🥇', '🥈', '🥉'];

const MONTHLY_EVENT = {
  title: 'サマー・スマイル月間',
  description: 'この夏いちばんの笑顔を集めよう！月間の投稿数がチーム目標に届くと、全員に特典ドリンクチケットをプレゼント。',
  goal: 150,
};

export default function Ranking() {
  const { weeklyLeaderboard, currentUser, posts } = useStore();
  const entries = weeklyLeaderboard();

  const now = new Date();
  const monthlyPostCount = posts.filter((p) => {
    const d = new Date(p.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const progressPct = Math.min(100, Math.round((monthlyPostCount / MONTHLY_EVENT.goal) * 100));

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-4 text-white shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-50">今月のイベント</p>
        <p className="mt-0.5 text-lg font-bold">🎐 {MONTHLY_EVENT.title}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-amber-50">{MONTHLY_EVENT.description}</p>
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-amber-50">
            <span>
              チーム投稿数 {monthlyPostCount} / {MONTHLY_EVENT.goal}
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-blue-500" />
        <p className="text-sm font-semibold text-slate-700">週間スマイルランキング</p>
      </div>
      <p className="mb-3 text-xs text-slate-400">今週（月〜日）の獲得ポイント順</p>

      <div className="flex flex-col gap-2">
        {entries.map((entry, idx) => {
          const isMe = entry.member.id === currentUser.id;
          return (
            <div
              key={entry.member.id}
              className={`flex items-center gap-3 rounded-2xl border p-3 shadow-sm ${
                isMe ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'
              }`}
            >
              <span className="w-6 shrink-0 text-center text-lg font-bold text-slate-400">{MEDALS[idx] ?? idx + 1}</span>
              <Avatar src={entry.member.avatar} alt={entry.member.name} className="h-10 w-10 rounded-full bg-blue-50 text-lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {entry.member.name}
                  {isMe && <span className="ml-1 text-xs font-normal text-blue-600">（自分）</span>}
                </p>
                <p className="text-xs text-slate-400">
                  投稿{entry.postCount}件・チケット{entry.tickets}枚
                </p>
              </div>
              <p className="shrink-0 text-lg font-bold text-blue-700">{entry.points}pt</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
