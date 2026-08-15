import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Member, SmilePost } from '../types';
import { APPROVALS_REQUIRED, CHECKLIST_ITEMS } from '../types';
import { buildSeedPosts, ME, COLLEAGUES } from './seed';

const STORAGE_KEY = 'smile-project-posts-v2';

function loadPosts(): SmilePost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SmilePost[];
  } catch {
    // ignore malformed storage and reseed
  }
  const seeded = buildSeedPosts();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

export interface NewPostExtras {
  missionTitle?: string;
  prop?: string;
  stampKey?: string;
  buddyIds?: string[];
}

export interface LeaderboardEntry {
  member: Member;
  points: number;
  postCount: number;
  tickets: number;
}

interface StoreValue {
  posts: SmilePost[];
  currentUser: typeof ME;
  colleagues: typeof COLLEAGUES;
  allMembers: Member[];
  addPost: (checklist: string[], comment: string, photo: string, extras?: NewPostExtras) => void;
  toggleApproval: (postId: string, approverId: string) => void;
  totalPoints: (userId: string) => number;
  ticketCount: (userId: string) => number;
  monthlyScores: (userId: string, year: number, month: number) => Map<number, number>;
  todaysBuddy: (userId: string) => Member;
  weeklyLeaderboard: () => LeaderboardEntry[];
  memberById: (id: string) => Member | undefined;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<SmilePost[]>(() => loadPosts());
  const allMembers = useMemo(() => [ME, ...COLLEAGUES], []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  }, [posts]);

  const value = useMemo<StoreValue>(() => {
    function memberById(id: string) {
      return allMembers.find((m) => m.id === id);
    }

    function addPost(checklist: string[], comment: string, photo: string, extras?: NewPostExtras) {
      const baseScore = checklist.reduce((sum, key) => {
        const item = CHECKLIST_ITEMS.find((c) => c.key === key);
        return sum + (item ? item.points : 0);
      }, 0);
      const missionBonus = extras?.missionTitle ? 15 : 0;
      const newPost: SmilePost = {
        id: `p${Date.now()}`,
        userId: ME.id,
        userName: ME.name,
        avatar: ME.avatar,
        photo,
        checklist,
        score: baseScore + missionBonus,
        comment,
        createdAt: new Date().toISOString(),
        approvals: [],
        ticketIssued: false,
        ...extras,
      };
      setPosts((prev) => [newPost, ...prev]);
    }

    function toggleApproval(postId: string, approverId: string) {
      const approver = allMembers.find((m) => m.id === approverId);
      if (!approver) return;
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          const already = post.approvals.some((a) => a.userId === approverId);
          const approvals = already
            ? post.approvals.filter((a) => a.userId !== approverId)
            : [...post.approvals, { userId: approver.id, userName: approver.name, avatar: approver.avatar, approvedAt: new Date().toISOString() }];
          return {
            ...post,
            approvals,
            ticketIssued: approvals.length >= APPROVALS_REQUIRED,
          };
        }),
      );
    }

    function totalPoints(userId: string) {
      return posts.filter((p) => p.userId === userId).reduce((sum, p) => sum + p.score, 0);
    }

    function ticketCount(userId: string) {
      return posts.filter((p) => p.userId === userId && p.ticketIssued).length;
    }

    function monthlyScores(userId: string, year: number, month: number) {
      const map = new Map<number, number>();
      posts
        .filter((p) => p.userId === userId)
        .forEach((p) => {
          const d = new Date(p.createdAt);
          if (d.getFullYear() === year && d.getMonth() === month) {
            const day = d.getDate();
            map.set(day, (map.get(day) ?? 0) + p.score);
          }
        });
      return map;
    }

    function todaysBuddy(userId: string): Member {
      const dateKey = new Date().toISOString().slice(0, 10);
      const pool = allMembers.filter((m) => m.id !== userId);
      const idx = hashString(dateKey + userId) % pool.length;
      return pool[idx];
    }

    function weeklyLeaderboard(): LeaderboardEntry[] {
      const monday = startOfWeek(new Date());
      const nextMonday = new Date(monday);
      nextMonday.setDate(monday.getDate() + 7);
      return allMembers
        .map((member) => {
          const memberPosts = posts.filter((p) => {
            if (p.userId !== member.id) return false;
            const created = new Date(p.createdAt);
            return created >= monday && created < nextMonday;
          });
          return {
            member,
            points: memberPosts.reduce((sum, p) => sum + p.score, 0),
            postCount: memberPosts.length,
            tickets: memberPosts.filter((p) => p.ticketIssued).length,
          };
        })
        .sort((a, b) => b.points - a.points);
    }

    return {
      posts,
      currentUser: ME,
      colleagues: COLLEAGUES,
      allMembers,
      addPost,
      toggleApproval,
      totalPoints,
      ticketCount,
      monthlyScores,
      todaysBuddy,
      weeklyLeaderboard,
      memberById,
    };
  }, [posts, allMembers]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
