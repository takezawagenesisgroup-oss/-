import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { EventEntry, EventPhase, EventPost, Member, Redemption } from '../types';
import { EXCHANGE_ITEMS, POINT_RULE, currentSeasonalEvent, findEventAction } from '../types';
import { buildSeedEntries, buildSeedEventPosts, buildSeedRedemptions, ME, COLLEAGUES } from './seed';

const POSTS_KEY = 'smile-project-event-posts-v1';
const REDEMPTIONS_KEY = 'smile-project-redemptions-v3';
const ENTRIES_KEY = 'smile-project-entries-v1';
const ROLE_KEY = 'smile-project-role-v1';

function loadFromStorage<T>(key: string, build: () => T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore malformed storage and reseed
  }
  const seeded = build();
  localStorage.setItem(key, JSON.stringify(seeded));
  return seeded;
}

function loadRole(): Member['role'] {
  try {
    const raw = localStorage.getItem(ROLE_KEY);
    if (raw === 'staff' || raw === 'manager') return raw;
  } catch {
    // ignore
  }
  return ME.role;
}

export interface LeaderboardEntry {
  member: Member;
  points: number;
  postCount: number;
}

interface StoreValue {
  posts: EventPost[];
  redemptions: Redemption[];
  entries: EventEntry[];
  currentUser: Member;
  colleagues: Member[];
  allMembers: Member[];
  addPost: (phase: EventPhase, actionKey: string, comment: string, photo: string, targetUserId?: string) => void;
  toggleLike: (postId: string) => void;
  isPostEarned: (post: EventPost) => boolean;
  managerLikeCount: (post: EventPost) => number;
  totalPoints: (userId: string) => number;
  monthlyPoints: (userId: string, year: number, month: number) => number;
  monthlyScores: (userId: string, year: number, month: number) => Map<number, number>;
  overallLeaderboard: () => LeaderboardEntry[];
  memberById: (id: string) => Member | undefined;
  toggleRole: () => void;
  redeem: (itemKey: string) => { ok: boolean; message: string };
  hasEntered: (eventKey: string, memberId: string) => boolean;
  enterEvent: (eventKey: string) => void;
  enteredMembers: (eventKey: string) => Member[];
  pendingRedemptions: () => Redemption[];
  markHandedOver: (redemptionId: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<EventPost[]>(() => loadFromStorage(POSTS_KEY, buildSeedEventPosts));
  const [redemptions, setRedemptions] = useState<Redemption[]>(() => loadFromStorage(REDEMPTIONS_KEY, buildSeedRedemptions));
  const [entries, setEntries] = useState<EventEntry[]>(() => loadFromStorage(ENTRIES_KEY, buildSeedEntries));
  const [role, setRole] = useState<Member['role']>(loadRole);
  const allMembers = useMemo(() => [{ ...ME, role }, ...COLLEAGUES], [role]);
  const currentUser = allMembers[0];

  useEffect(() => {
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  }, [posts]);
  useEffect(() => {
    localStorage.setItem(REDEMPTIONS_KEY, JSON.stringify(redemptions));
  }, [redemptions]);
  useEffect(() => {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  }, [entries]);
  useEffect(() => {
    localStorage.setItem(ROLE_KEY, role);
  }, [role]);

  const value = useMemo<StoreValue>(() => {
    function memberById(id: string) {
      return allMembers.find((m) => m.id === id);
    }

    function addPost(phase: EventPhase, actionKey: string, comment: string, photo: string, targetUserId?: string) {
      const subject = (targetUserId && memberById(targetUserId)) || currentUser;
      const isProxy = subject.id !== currentUser.id;
      const newPost: EventPost = {
        id: `p${Date.now()}`,
        userId: subject.id,
        userName: subject.name,
        avatar: subject.avatar,
        eventKey: currentSeasonalEvent(new Date()).key,
        phase,
        actionKey,
        photo,
        comment,
        createdAt: new Date().toISOString(),
        likes: [],
        reportedBy: isProxy ? currentUser.id : undefined,
      };
      setPosts((prev) => [newPost, ...prev]);
    }

    function managerLikeCount(post: EventPost): number {
      return post.likes.filter((id) => allMembers.find((m) => m.id === id)?.role === 'manager').length;
    }

    function isPostEarned(post: EventPost): boolean {
      if (post.pointsEarnedAt) return true;
      return post.likes.length >= POINT_RULE.minLikes && managerLikeCount(post) > 0;
    }

    function toggleLike(postId: string) {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          const already = post.likes.includes(currentUser.id);
          const likes = already ? post.likes.filter((id) => id !== currentUser.id) : [...post.likes, currentUser.id];
          let pointsEarnedAt = post.pointsEarnedAt;
          if (!pointsEarnedAt) {
            const managerLiked = likes.some((id) => allMembers.find((m) => m.id === id)?.role === 'manager');
            if (likes.length >= POINT_RULE.minLikes && managerLiked) {
              pointsEarnedAt = new Date().toISOString();
            }
          }
          return { ...post, likes, pointsEarnedAt };
        }),
      );
    }

    function totalPoints(userId: string) {
      const earned = posts
        .filter((p) => p.userId === userId && p.pointsEarnedAt)
        .reduce((sum, p) => sum + (findEventAction(p.actionKey)?.points ?? 0), 0);
      const spent = redemptions.filter((r) => r.userId === userId).reduce((sum, r) => sum + r.cost, 0);
      return earned - spent;
    }

    function monthlyPoints(userId: string, year: number, month: number) {
      return posts
        .filter((p) => p.userId === userId && p.pointsEarnedAt)
        .filter((p) => {
          const d = new Date(p.pointsEarnedAt!);
          return d.getFullYear() === year && d.getMonth() === month;
        })
        .reduce((sum, p) => sum + (findEventAction(p.actionKey)?.points ?? 0), 0);
    }

    function monthlyScores(userId: string, year: number, month: number) {
      const map = new Map<number, number>();
      posts
        .filter((p) => p.userId === userId && p.pointsEarnedAt)
        .forEach((p) => {
          const d = new Date(p.pointsEarnedAt!);
          if (d.getFullYear() === year && d.getMonth() === month) {
            const day = d.getDate();
            map.set(day, (map.get(day) ?? 0) + (findEventAction(p.actionKey)?.points ?? 0));
          }
        });
      return map;
    }

    function overallLeaderboard(): LeaderboardEntry[] {
      return allMembers
        .map((member) => {
          const memberPosts = posts.filter((p) => p.userId === member.id && p.pointsEarnedAt);
          const points = memberPosts.reduce((sum, p) => sum + (findEventAction(p.actionKey)?.points ?? 0), 0);
          return { member, points, postCount: memberPosts.length };
        })
        .sort((a, b) => b.points - a.points);
    }

    function toggleRole() {
      setRole((prev) => (prev === 'staff' ? 'manager' : 'staff'));
    }

    function redeem(itemKey: string): { ok: boolean; message: string } {
      const item = EXCHANGE_ITEMS.find((i) => i.key === itemKey);
      if (!item) return { ok: false, message: 'アイテムが見つかりません。' };
      if (totalPoints(currentUser.id) < item.cost) {
        return { ok: false, message: 'ポイントが足りません。' };
      }
      const managers = allMembers.filter((m) => m.role === 'manager' && m.id !== currentUser.id);
      const manager = managers[Math.floor(Math.random() * managers.length)] ?? allMembers.find((m) => m.role === 'manager');
      const redemption: Redemption = {
        id: `rd${Date.now()}`,
        userId: currentUser.id,
        itemKey: item.key,
        label: item.label,
        emoji: item.emoji,
        cost: item.cost,
        createdAt: new Date().toISOString(),
        status: 'pending',
        notifiedManagerId: manager?.id,
      };
      setRedemptions((prev) => [redemption, ...prev]);
      const managerName = manager?.name ?? '店長・上長';
      return {
        ok: true,
        message: `${item.emoji} 「${item.label}」を申請しました。${managerName}に通知されます。店舗窓口で手渡しにてお受け取りください。`,
      };
    }

    function hasEntered(eventKey: string, memberId: string): boolean {
      return entries.some((e) => e.eventKey === eventKey && e.memberId === memberId);
    }

    function enterEvent(eventKey: string) {
      if (hasEntered(eventKey, currentUser.id)) return;
      setEntries((prev) => [...prev, { eventKey, memberId: currentUser.id, enteredAt: new Date().toISOString() }]);
    }

    function enteredMembers(eventKey: string): Member[] {
      const ids = new Set(entries.filter((e) => e.eventKey === eventKey).map((e) => e.memberId));
      return allMembers.filter((m) => ids.has(m.id));
    }

    function pendingRedemptions(): Redemption[] {
      return redemptions.filter((r) => r.status === 'pending');
    }

    function markHandedOver(redemptionId: string) {
      setRedemptions((prev) =>
        prev.map((r) => (r.id === redemptionId ? { ...r, status: 'handed_over', handedOverAt: new Date().toISOString() } : r)),
      );
    }

    return {
      posts,
      redemptions,
      entries,
      currentUser,
      colleagues: COLLEAGUES,
      allMembers,
      addPost,
      toggleLike,
      isPostEarned,
      managerLikeCount,
      totalPoints,
      monthlyPoints,
      monthlyScores,
      overallLeaderboard,
      memberById,
      toggleRole,
      redeem,
      hasEntered,
      enterEvent,
      enteredMembers,
      pendingRedemptions,
      markHandedOver,
    };
  }, [posts, redemptions, entries, allMembers, currentUser]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
