import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { EventPhase, EventPost, Member, Redemption } from '../types';
import { EXCHANGE_ITEMS, currentSeasonalEvent, findEventAction } from '../types';
import { buildSeedEventPosts, buildSeedRedemptions, ME, COLLEAGUES } from './seed';

const POSTS_KEY = 'smile-project-event-posts-v1';
const REDEMPTIONS_KEY = 'smile-project-redemptions-v2';
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
  currentUser: Member;
  colleagues: Member[];
  allMembers: Member[];
  addPost: (phase: EventPhase, actionKey: string, comment: string, photo: string) => void;
  toggleLike: (postId: string) => void;
  grantPoints: (postId: string, comment: string) => boolean;
  totalPoints: (userId: string) => number;
  monthlyPoints: (userId: string, year: number, month: number) => number;
  monthlyScores: (userId: string, year: number, month: number) => Map<number, number>;
  monthlyLeaderboard: () => LeaderboardEntry[];
  memberById: (id: string) => Member | undefined;
  toggleRole: () => void;
  redeem: (itemKey: string) => boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<EventPost[]>(() => loadFromStorage(POSTS_KEY, buildSeedEventPosts));
  const [redemptions, setRedemptions] = useState<Redemption[]>(() => loadFromStorage(REDEMPTIONS_KEY, buildSeedRedemptions));
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
    localStorage.setItem(ROLE_KEY, role);
  }, [role]);

  const value = useMemo<StoreValue>(() => {
    function memberById(id: string) {
      return allMembers.find((m) => m.id === id);
    }

    function addPost(phase: EventPhase, actionKey: string, comment: string, photo: string) {
      const newPost: EventPost = {
        id: `p${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        avatar: currentUser.avatar,
        eventKey: currentSeasonalEvent(new Date()).key,
        phase,
        actionKey,
        photo,
        comment,
        createdAt: new Date().toISOString(),
        likes: [],
      };
      setPosts((prev) => [newPost, ...prev]);
    }

    function toggleLike(postId: string) {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          const already = post.likes.includes(currentUser.id);
          const likes = already ? post.likes.filter((id) => id !== currentUser.id) : [...post.likes, currentUser.id];
          return { ...post, likes };
        }),
      );
    }

    function grantPoints(postId: string, comment: string): boolean {
      if (currentUser.role !== 'manager') return false;
      const post = posts.find((p) => p.id === postId);
      if (!post || post.grant || post.userId === currentUser.id) return false;
      const action = findEventAction(post.actionKey);
      if (!action) return false;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                grant: {
                  managerId: currentUser.id,
                  managerName: currentUser.name,
                  managerAvatar: currentUser.avatar,
                  comment,
                  points: action.points,
                  grantedAt: new Date().toISOString(),
                },
              }
            : p,
        ),
      );
      return true;
    }

    function totalPoints(userId: string) {
      const earned = posts.filter((p) => p.userId === userId && p.grant).reduce((sum, p) => sum + (p.grant?.points ?? 0), 0);
      const spent = redemptions.filter((r) => r.userId === userId).reduce((sum, r) => sum + r.cost, 0);
      return earned - spent;
    }

    function monthlyPoints(userId: string, year: number, month: number) {
      return posts
        .filter((p) => p.userId === userId && p.grant)
        .filter((p) => {
          const d = new Date(p.grant!.grantedAt);
          return d.getFullYear() === year && d.getMonth() === month;
        })
        .reduce((sum, p) => sum + (p.grant?.points ?? 0), 0);
    }

    function monthlyScores(userId: string, year: number, month: number) {
      const map = new Map<number, number>();
      posts
        .filter((p) => p.userId === userId && p.grant)
        .forEach((p) => {
          const d = new Date(p.grant!.grantedAt);
          if (d.getFullYear() === year && d.getMonth() === month) {
            const day = d.getDate();
            map.set(day, (map.get(day) ?? 0) + (p.grant?.points ?? 0));
          }
        });
      return map;
    }

    function monthlyLeaderboard(): LeaderboardEntry[] {
      const now = new Date();
      return allMembers
        .map((member) => {
          const memberPosts = posts.filter((p) => {
            if (p.userId !== member.id || !p.grant) return false;
            const d = new Date(p.grant.grantedAt);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
          });
          const points = memberPosts.reduce((sum, p) => sum + (p.grant?.points ?? 0), 0);
          return { member, points, postCount: memberPosts.length };
        })
        .sort((a, b) => b.points - a.points);
    }

    function toggleRole() {
      setRole((prev) => (prev === 'staff' ? 'manager' : 'staff'));
    }

    function redeem(itemKey: string): boolean {
      const item = EXCHANGE_ITEMS.find((i) => i.key === itemKey);
      if (!item) return false;
      if (totalPoints(currentUser.id) < item.cost) return false;
      const redemption: Redemption = {
        id: `rd${Date.now()}`,
        userId: currentUser.id,
        itemKey: item.key,
        label: item.label,
        emoji: item.emoji,
        cost: item.cost,
        createdAt: new Date().toISOString(),
      };
      setRedemptions((prev) => [redemption, ...prev]);
      return true;
    }

    return {
      posts,
      redemptions,
      currentUser,
      colleagues: COLLEAGUES,
      allMembers,
      addPost,
      toggleLike,
      grantPoints,
      totalPoints,
      monthlyPoints,
      monthlyScores,
      monthlyLeaderboard,
      memberById,
      toggleRole,
      redeem,
    };
  }, [posts, redemptions, allMembers, currentUser]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
