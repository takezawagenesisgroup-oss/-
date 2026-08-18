import { useStore } from '../data/store';
import Avatar from '../components/Avatar';
import { SEASONAL_EVENTS, currentSeasonalEvent } from '../types';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Events() {
  const { currentUser, eventParticipants, hasJoinedEvent, eventLeader, joinEvent, volunteerAsLeader, weeklyLeaderboard } = useStore();
  const current = currentSeasonalEvent(new Date());
  const leader = eventLeader(current.key);
  const participants = eventParticipants(current.key).filter((p) => p.role === 'participant');
  const iJoined = hasJoinedEvent(current.key, currentUser.id);
  const iAmLeader = leader?.userId === currentUser.id;
  const entries = weeklyLeaderboard();

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <div className="rounded-2xl bg-gradient-to-br from-blue-800 to-blue-600 p-4 text-white shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-100">{current.seasonLabel}・進行中のイベント</p>
        <p className="mt-0.5 text-lg font-bold">
          {current.emoji} {current.title}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-blue-50">{current.description}</p>
        <span className="mt-2 inline-block rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
          💡 勝手に身につくスキル：{current.skillTag}
        </span>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => joinEvent(current.key)}
            disabled={iJoined}
            className={`rounded-xl py-2 text-xs font-bold transition ${
              iJoined ? 'bg-white text-blue-700' : 'bg-white/15 text-white active:scale-95'
            }`}
          >
            {iJoined ? '✓ 参加登録済み' : `参加する（+${current.participateCoins} GC）`}
          </button>
          <button
            onClick={() => volunteerAsLeader(current.key)}
            disabled={Boolean(leader)}
            className={`rounded-xl py-2 text-xs font-bold transition ${
              iAmLeader ? 'bg-amber-400 text-blue-900' : leader ? 'bg-white/10 text-blue-100' : 'bg-white/15 text-white active:scale-95'
            }`}
          >
            {iAmLeader ? '✓ あなたがリーダー' : leader ? `リーダー：${leader.userName}` : `リーダーに挙手（+${current.leaderCoins} GC）`}
          </button>
        </div>

        {(participants.length > 0 || leader) && (
          <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2">
            <div className="flex -space-x-2">
              {leader && <Avatar src={leader.avatar} alt={leader.userName} className="h-6 w-6 rounded-full border-2 border-white bg-amber-200 text-xs" />}
              {participants.slice(0, 5).map((p) => (
                <Avatar key={p.id} src={p.avatar} alt={p.userName} className="h-6 w-6 rounded-full border-2 border-white bg-blue-200 text-xs" />
              ))}
            </div>
            <span className="text-[11px] text-blue-50">
              {leader ? `${leader.userName}（リーダー）ほか` : ''}
              {participants.length}人が参加中
            </span>
          </div>
        )}
      </div>

      <div className="mb-3 mt-4 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <p className="text-sm font-semibold text-slate-700">年間ロードマップ（四季の成長プロジェクト）</p>
      </div>
      <div className="flex flex-col gap-2">
        {SEASONAL_EVENTS.map((ev) => {
          const isCurrent = ev.key === current.key;
          return (
            <div
              key={ev.key}
              className={`rounded-2xl border p-3 shadow-sm ${isCurrent ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{ev.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-slate-400">{ev.seasonLabel}</p>
                  <p className="truncate text-sm font-semibold text-slate-800">{ev.title}</p>
                </div>
                {isCurrent && <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">開催中</span>}
              </div>
              <p className="mt-1.5 text-xs text-slate-500">{ev.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-500">💡 {ev.skillTag}</span>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">参加 +{ev.participateCoins} GC</span>
                <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">リーダー +{ev.leaderCoins} GC</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-3 mt-5 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-blue-500" />
        <p className="text-sm font-semibold text-slate-700">週間コインランキング</p>
      </div>
      <p className="mb-3 text-xs text-slate-400">今週（月〜日）の獲得Genesisコイン順</p>
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
                <p className="text-xs text-slate-400">投稿{entry.postCount}件</p>
              </div>
              <p className="shrink-0 text-lg font-bold text-blue-700">{entry.coins} GC</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
