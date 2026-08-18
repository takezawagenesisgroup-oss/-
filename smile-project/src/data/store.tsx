import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { EventAction, Member, Redemption, SmilePost } from '../types';
import { APPROVALS_REQUIRED, APPROVAL_BONUS_COINS, CHECKLIST_ITEMS, EXCHANGE_ITEMS, SEASONAL_EVENTS } from '../types';
import { buildSeedPosts, buildSeedEventActions, buildSeedRedemptions, ME, COLLEAGUES } from './seed';

const POSTS_KEY = 'smile-project-posts-v3';
const EVENTS_KEY = 'smile-project-events-v1';
const REDEMPTIONS_KEY = 'smile-project-redemptions-v1';

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
  coins: number;
  postCount: number;
  approvalBonusCount: number;
}

interface StoreValue {
  posts: SmilePost[];
  eventActions: EventAction[];
  redemptions: Redemption[];
  currentUser: typeof ME;
  colleagues: typeof COLLEAGUES;
  allMembers: Member[];
  addPost: (checklist: string[], comment: string, photo: string, extras?: NewPostExtras) => void;
  toggleApproval: (postId: string, approverId: string) => void;
  totalCoins: (userId: string) => number;
  approvalBonusCount: (userId: string) => number;
  monthlyScores: (userId: string, year: number, month: number) => Map<number, number>;
  todaysBuddy: (userId: string) => Member;
  weeklyLeaderboard: () => LeaderboardEntry[];
  memberById: (id: string) => Member | undefined;
  eventParticipants: (eventKey: string) => EventAction[];
  hasJoinedEvent: (eventKey: string, userId: string) => boolean;
  eventLeader: (eventKey: string) => EventAction | undefined;
  joinEvent: (eventKey: string) => void;
  volunteerAsLeader: (eventKey: string) => void;
  redeem: (itemKey: string) => boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<SmilePost[]>(() => loadFromStorage(POSTS_KEY, buildSeedPosts));
  const [eventActions, setEventActions] = useState<EventAction[]>(() => loadFromStorage(EVENTS_KEY, buildSeedEventActions));
  const [redemptions, setRedemptions] = useState<Redemption[]>(() => loadFromStorage(REDEMPTIONS_KEY, buildSeedRedemptions));
  const allMembers = useMemo(() => [ME, ...COLLEAGUES], []);

  useEffect(() => {
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  }, [posts]);
  useEffect(() => {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(eventActions));
  }, [eventActions]);
  useEffect(() => {
    localStorage.setItem(REDEMPTIONS_KEY, JSON.stringify(redemptions));
  }, [redemptions]);

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
        approvalBonusAwarded: false,
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
            approvalBonusAwarded: post.approvalBonusAwarded || approvals.length >= APPROVALS_REQUIRED,
          };
        }),
      );
    }

    function totalCoins(userId: string) {
      const fromPosts = posts
        .filter((p) => p.userId === userId)
        .reduce((sum, p) => sum + p.score + (p.approvalBonusAwarded ? APPROVAL_BONUS_COINS : 0), 0);
      const fromEvents = eventActions.filter((e) => e.userId === userId).reduce((sum, e) => sum + e.coins, 0);
      const spent = redemptions.filter((r) => r.userId === userId).reduce((sum, r) => sum + r.cost, 0);
      return fromPosts + fromEvents - spent;
    }

    function approvalBonusCount(userId: string) {
      return posts.filter((p) => p.userId === userId && p.approvalBonusAwarded).length;
    }

    function monthlyScores(userId: string, year: number, month: number) {
      const map = new Map<number, number>();
      posts
        .filter((p) => p.userId === userId)
        .forEach((p) => {
          const d = new Date(p.createdAt);
          if (d.getFullYear() === year && d.getMonth() === month) {
            const day = d.getDate();
            const coins = p.score + (p.approvalBonusAwarded ? APPROVAL_BONUS_COINS : 0);
            map.set(day, (map.get(day) ?? 0) + coins);
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
          const coins = memberPosts.reduce((sum, p) => sum + p.score + (p.approvalBonusAwarded ? APPROVAL_BONUS_COINS : 0), 0);
          return {
            member,
            coins,
            postCount: memberPosts.length,
            approvalBonusCount: memberPosts.filter((p) => p.approvalBonusAwarded).length,
          };
        })
        .sort((a, b) => b.coins - a.coins);
    }

    function eventParticipants(eventKey: string) {
      return eventActions.filter((e) => e.eventKey === eventKey);
    }

    function hasJoinedEvent(eventKey: string, userId: string) {
      return eventActions.some((e) => e.eventKey === eventKey && e.userId === userId);
    }

    function eventLeader(eventKey: string) {
      return eventActions.find((e) => e.eventKey === eventKey && e.role === 'leader');
    }

    function joinEvent(eventKey: string) {
      if (hasJoinedEvent(eventKey, ME.id)) return;
      const event = SEASONAL_EVENTS.find((e) => e.key === eventKey);
      if (!event) return;
      const action: EventAction = {
        id: `ev${Date.now()}`,
        userId: ME.id,
        userName: ME.name,
        avatar: ME.avatar,
        eventKey,
        role: 'participant',
        coins: event.participateCoins,
        createdAt: new Date().toISOString(),
      };
      setEventActions((prev) => [...prev, action]);
    }

    function volunteerAsLeader(eventKey: string) {
      if (eventLeader(eventKey)) return;
      const event = SEASONAL_EVENTS.find((e) => e.key === eventKey);
      if (!event) return;
      setEventActions((prev) => {
        const withoutMyParticipation = prev.filter((e) => !(e.eventKey === eventKey && e.userId === ME.id));
        const action: EventAction = {
          id: `ev${Date.now()}`,
          userId: ME.id,
          userName: ME.name,
          avatar: ME.avatar,
          eventKey,
          role: 'leader',
          coins: event.leaderCoins,
          createdAt: new Date().toISOString(),
        };
        return [...withoutMyParticipation, action];
      });
    }

    function redeem(itemKey: string): boolean {
      const item = EXCHANGE_ITEMS.find((i) => i.key === itemKey);
      if (!item) return false;
      if (totalCoins(ME.id) < item.cost) return false;
      const redemption: Redemption = {
        id: `rd${Date.now()}`,
        userId: ME.id,
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
      eventActions,
      redemptions,
      currentUser: ME,
      colleagues: COLLEAGUES,
      allMembers,
      addPost,
      toggleApproval,
      totalCoins,
      approvalBonusCount,
      monthlyScores,
      todaysBuddy,
      weeklyLeaderboard,
      memberById,
      eventParticipants,
      hasJoinedEvent,
      eventLeader,
      joinEvent,
      volunteerAsLeader,
      redeem,
    };
  }, [posts, eventActions, redemptions, allMembers]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
