import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SmilePost } from '../types';
import { APPROVALS_REQUIRED, CHECKLIST_ITEMS } from '../types';
import { buildSeedPosts, ME, COLLEAGUES } from './seed';

const STORAGE_KEY = 'smile-project-posts-v1';

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

interface StoreValue {
  posts: SmilePost[];
  currentUser: typeof ME;
  colleagues: typeof COLLEAGUES;
  addPost: (checklist: string[], comment: string, photo: string) => void;
  toggleApproval: (postId: string, approverId: string) => void;
  totalPoints: (userId: string) => number;
  ticketCount: (userId: string) => number;
  monthlyScores: (userId: string, year: number, month: number) => Map<number, number>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<SmilePost[]>(() => loadPosts());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  }, [posts]);

  const value = useMemo<StoreValue>(() => {
    function addPost(checklist: string[], comment: string, photo: string) {
      const score = checklist.reduce((sum, key) => {
        const item = CHECKLIST_ITEMS.find((c) => c.key === key);
        return sum + (item ? item.points : 0);
      }, 0);
      const newPost: SmilePost = {
        id: `p${Date.now()}`,
        userId: ME.id,
        userName: ME.name,
        avatar: ME.avatar,
        photo,
        checklist,
        score,
        comment,
        createdAt: new Date().toISOString(),
        approvals: [],
        ticketIssued: false,
      };
      setPosts((prev) => [newPost, ...prev]);
    }

    function toggleApproval(postId: string, approverId: string) {
      const approver = [ME, ...COLLEAGUES].find((m) => m.id === approverId);
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

    return {
      posts,
      currentUser: ME,
      colleagues: COLLEAGUES,
      addPost,
      toggleApproval,
      totalPoints,
      ticketCount,
      monthlyScores,
    };
  }, [posts]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
