import type { SmilePost } from '../types';
import { APPROVALS_REQUIRED, CHECKLIST_ITEMS, STAMP_OPTIONS } from '../types';
import { useStore } from '../data/store';
import Avatar from './Avatar';
import { isImageSrc } from '../utils/media';

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

export default function PostCard({ post }: { post: SmilePost }) {
  const { currentUser, toggleApproval, colleagues, memberById } = useStore();
  const isMine = post.userId === currentUser.id;
  const myApproval = post.approvals.some((a) => a.userId === currentUser.id);
  const remaining = Math.max(0, APPROVALS_REQUIRED - post.approvals.length);
  const stamp = post.stampKey ? STAMP_OPTIONS.find((s) => s.key === post.stampKey) : undefined;
  const buddies = (post.buddyIds ?? []).map((id) => memberById(id)).filter((m): m is NonNullable<typeof m> => Boolean(m));

  function simulateColleagueApproval() {
    const notYet = colleagues.filter((c) => !post.approvals.some((a) => a.userId === c.id));
    if (notYet.length === 0) return;
    const picked = notYet[Math.floor(Math.random() * notYet.length)];
    toggleApproval(post.id, picked.id);
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar src={post.avatar} alt={post.userName} className="h-10 w-10 rounded-full bg-blue-50 text-xl" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">{post.userName}</p>
          <p className="text-xs text-slate-400">{timeAgo(post.createdAt)}</p>
        </div>
        <div className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">{post.score}点</div>
      </div>

      {post.missionTitle && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
          🎯 本日のミッション「{post.missionTitle}」達成
        </div>
      )}

      <div className="relative mt-3 flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-blue-50">
        {isImageSrc(post.photo) ? (
          <img src={post.photo} alt="スマイル投稿" className="h-48 w-full object-cover" />
        ) : (
          <div className="flex h-48 w-full items-center justify-center text-7xl">{post.photo}</div>
        )}
        {post.prop && (
          <div className="absolute left-2 top-2 max-w-[75%] rounded-2xl rounded-tl-sm bg-white/90 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 shadow">
            {post.prop}
          </div>
        )}
        {stamp && (
          <div
            title={stamp.label}
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg shadow"
          >
            {stamp.emoji}
          </div>
        )}
      </div>

      {post.comment && (
        <div className="mt-3 flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5">
          <span className="text-amber-400">❝</span>
          <p className="text-sm leading-snug text-slate-700">{post.comment}</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {post.checklist.map((key) => {
          const item = CHECKLIST_ITEMS.find((c) => c.key === key);
          if (!item) return null;
          return (
            <span key={key} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
              {item.emoji} {item.label}
            </span>
          );
        })}
      </div>

      {buddies.length > 0 && (
        <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
          🤝 {buddies.map((b) => b.name).join('、')} さんと一緒に
        </p>
      )}

      <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-2">
            {post.approvals.length === 0 && <span className="text-xs text-slate-400">まだ承認なし</span>}
            {post.approvals.map((a) => (
              <Avatar
                key={a.userId}
                src={a.avatar}
                alt={a.userName}
                className="h-6 w-6 rounded-full border-2 border-white bg-blue-100 text-xs"
              />
            ))}
          </div>
          {post.approvals.length > 0 && (
            <span className="text-xs text-slate-500">
              {post.approvals.length}/{APPROVALS_REQUIRED}人承認
            </span>
          )}
        </div>

        {post.ticketIssued ? (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700">
            🎫 チケット発行済み
          </span>
        ) : isMine ? (
          <button
            onClick={simulateColleagueApproval}
            className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 active:scale-95"
            title="デモ用：タップすると同僚が承認した想定で進みます"
          >
            承認待ち・あと{remaining}人（デモで進める）
          </button>
        ) : (
          <button
            onClick={() => toggleApproval(post.id, currentUser.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
              myApproval ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
            }`}
          >
            {myApproval ? '✓ 承認済み（タップで取消）' : '👍 承認する'}
          </button>
        )}
      </div>
    </article>
  );
}
