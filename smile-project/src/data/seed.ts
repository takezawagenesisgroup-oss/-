import type { EventPhase, EventPost, Member, Redemption } from '../types';
import { EXCHANGE_ITEMS, currentSeasonalEvent, eventActionsFor } from '../types';

export const ME: Member = { id: 'me', name: '自分', avatar: '🙂', role: 'staff' };

export const COLLEAGUES: Member[] = [
  { id: 'u1', name: '中村 彩花', avatar: '/photos/avatars/u1.jpg', role: 'manager' },
  { id: 'u2', name: '小林 大輝', avatar: '/photos/avatars/u2.jpg', role: 'manager' },
  { id: 'u3', name: '渡辺 陽菜', avatar: '/photos/avatars/u3.jpg', role: 'staff' },
  { id: 'u4', name: '加藤 美月', avatar: '/photos/avatars/u4.jpg', role: 'staff' },
  { id: 'u5', name: '木村 蓮', avatar: '/photos/avatars/u5.jpg', role: 'staff' },
];

const PHOTO_EMOJIS = ['😄', '😁', '😊', '🥰', '😆', '🙂'];

const PHASE_COMMENTS: Record<EventPhase, string[]> = {
  prep: [
    '当日の動線を確認しながら机の配置を決めました！',
    '飾り付け用の花を仕入れてきました🌸',
    '前日準備、みんなで手分けして進めました',
    '企画書をまとめて共有しました！',
    '準備が整って、あとは当日を待つのみです',
  ],
  day: [
    'お客様に元気よくご挨拶できました！',
    '困っているお客様にすぐ気づいて声をかけられました',
    '新人スタッフのフォローもばっちりです',
    '笑顔でお出迎え、いい表情撮れました📸',
    '機転を利かせて対応、喜んでもらえました！',
  ],
  post: [
    'ご協力いただいた皆さんにお礼を伝えて回りました',
    '今回の気づきをメモにまとめて共有しました！',
    '次回に向けた改善案を提案しました',
    'うまくいったポイントをナレッジとして残しました📚',
    'サポートしてくれたメンバーに感謝を伝えました💌',
  ],
};

function daysAgo(n: number, hour = 12): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, Math.floor(Math.random() * 59), 0, 0);
  return d.toISOString();
}

function fixedDate(year: number, month: number, day: number, hour = 12, minute = 0): string {
  return new Date(year, month - 1, day, hour, minute, 0).toISOString();
}

let idCounter = 1;
function nextId(): string {
  return `p${idCounter++}`;
}

function buildLikes(authorId: string, allMembers: Member[], managers: Member[], earned: boolean): string[] {
  const candidates = allMembers.filter((m) => m.id !== authorId);
  if (earned) {
    const managerCandidates = managers.filter((m) => m.id !== authorId);
    const manager = managerCandidates[Math.floor(Math.random() * managerCandidates.length)];
    const others = candidates.filter((m) => m.id !== manager.id).sort(() => Math.random() - 0.5);
    const extraCount = Math.min(others.length, 2 + Math.floor(Math.random() * 2));
    const chosen = [manager, ...others.slice(0, extraCount)];
    return chosen.sort(() => Math.random() - 0.5).map((m) => m.id);
  }
  const nonManagers = candidates.filter((m) => !managers.some((mgr) => mgr.id === m.id));
  const shuffled = [...nonManagers].sort(() => Math.random() - 0.5);
  const count = Math.floor(Math.random() * Math.min(3, shuffled.length + 1));
  return shuffled.slice(0, count).map((m) => m.id);
}

interface FeaturedPostSpec {
  authorId: string;
  phase: EventPhase;
  actionKey: string;
  photo: string;
  comment: string;
  date: string;
}

// 実際のイベント写真を使った投稿（花祭り・クリスマス等）を生成する共通ヘルパー
function buildFeaturedPosts(eventKey: string, specs: FeaturedPostSpec[], allMembers: Member[], managers: Member[]): EventPost[] {
  const byId = (id: string) => allMembers.find((m) => m.id === id)!;

  return specs.map(({ authorId, phase, actionKey, photo, comment, date }) => {
    const author = byId(authorId);
    const managerCandidates = managers.filter((m) => m.id !== authorId);
    const manager = managerCandidates[Math.floor(Math.random() * managerCandidates.length)];
    const others = allMembers.filter((m) => m.id !== authorId && m.id !== manager.id).sort(() => Math.random() - 0.5);
    const likes = [manager, ...others.slice(0, 2)].map((m) => m.id);
    return {
      id: nextId(),
      userId: author.id,
      userName: author.name,
      avatar: author.avatar,
      eventKey,
      phase,
      actionKey,
      photo,
      comment,
      createdAt: date,
      likes,
      pointsEarnedAt: date,
    };
  });
}

// 6月10日に開催された実際の「花祭り」イベントの写真を使った投稿
function buildFeaturedHanamatsuriPosts(allMembers: Member[], managers: Member[]): EventPost[] {
  return buildFeaturedPosts(
    'gardening',
    [
      {
        authorId: 'u1',
        phase: 'prep',
        actionKey: 'prep-participation',
        photo: '/photos/events/hanamatsuri-2.jpg',
        comment: '花祭りに向けて、マリーゴールドの仕入れと株分けをみんなで手分けして進めました🌼',
        date: fixedDate(2026, 6, 9, 10, 30),
      },
      {
        authorId: 'u3',
        phase: 'prep',
        actionKey: 'genki-participation',
        photo: '/photos/events/hanamatsuri-3.jpg',
        comment: '一鉢ずつ丁寧に。準備段階から気持ちを込めて取り組みました😊',
        date: fixedDate(2026, 6, 9, 15, 45),
      },
      {
        authorId: 'u4',
        phase: 'day',
        actionKey: 'eyecatch-smile',
        photo: '/photos/events/hanamatsuri-1.jpg',
        comment: '花祭り当日、店内が花でいっぱいになりました🌸みんなの笑顔が一番の飾り付けです！',
        date: fixedDate(2026, 6, 10, 18, 0),
      },
    ],
    allMembers,
    managers,
  );
}

// 12月に開催された実際の「クリスマスケーキ試食会」の写真を使った投稿
function buildFeaturedChristmasPosts(allMembers: Member[], managers: Member[]): EventPost[] {
  return buildFeaturedPosts(
    'santa-innovation',
    [
      {
        authorId: 'u5',
        phase: 'prep',
        actionKey: 'prep-participation',
        photo: '/photos/events/christmas-1.jpg',
        comment: 'クリスマスケーキ試食会の準備をしました🎅お客様に楽しんでいただけますように',
        date: fixedDate(2025, 12, 23, 13, 0),
      },
      {
        authorId: 'u3',
        phase: 'day',
        actionKey: 'eyecatch-smile',
        photo: '/photos/events/christmas-2.jpg',
        comment: 'クリスマスケーキ試食会、当日は仮装で盛り上げました🎄',
        date: fixedDate(2025, 12, 24, 13, 15),
      },
      {
        authorId: 'u4',
        phase: 'day',
        actionKey: 'genki-greeting',
        photo: '/photos/events/christmas-3.jpg',
        comment: 'サンタ姿で元気よくお声掛け！お客様にも喜んでいただけました🎁',
        date: fixedDate(2025, 12, 24, 15, 30),
      },
    ],
    allMembers,
    managers,
  );
}

export function buildSeedEventPosts(): EventPost[] {
  const posts: EventPost[] = [];
  const allMembers = [ME, ...COLLEAGUES];
  const managers = COLLEAGUES.filter((m) => m.role === 'manager');
  const event = currentSeasonalEvent(new Date());
  const authors = [ME, ...COLLEAGUES];
  const phases: EventPhase[] = ['prep', 'day', 'post'];

  posts.push(...buildFeaturedHanamatsuriPosts(allMembers, managers));
  posts.push(...buildFeaturedChristmasPosts(allMembers, managers));

  authors.forEach((author, idx) => {
    phases.forEach((phase, phaseIdx) => {
      const actions = eventActionsFor(phase);
      const action = actions[(idx + phaseIdx) % actions.length];
      const comments = PHASE_COMMENTS[phase];
      const createdAt = daysAgo(8 - phaseIdx * 3 + idx);
      const earned = Math.random() < 0.55;
      const likes = buildLikes(author.id, allMembers, managers, earned);
      posts.push({
        id: nextId(),
        userId: author.id,
        userName: author.name,
        avatar: author.avatar,
        eventKey: event.key,
        phase,
        actionKey: action.key,
        photo: author.photo ?? PHOTO_EMOJIS[Math.floor(Math.random() * PHOTO_EMOJIS.length)],
        comment: comments[(idx + phaseIdx) % comments.length],
        createdAt,
        likes,
        pointsEarnedAt: earned ? daysAgo(Math.max(0, 8 - phaseIdx * 3 + idx - 1)) : undefined,
      });
    });
  });

  return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function buildSeedRedemptions(): Redemption[] {
  const redemptions: Redemption[] = [];
  let rIdCounter = 1;
  const pool = COLLEAGUES;
  const count = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    const user = pool[Math.floor(Math.random() * pool.length)];
    const item = EXCHANGE_ITEMS[Math.floor(Math.random() * EXCHANGE_ITEMS.length)];
    redemptions.push({
      id: `rd${rIdCounter++}`,
      userId: user.id,
      itemKey: item.key,
      label: item.label,
      emoji: item.emoji,
      cost: item.cost,
      createdAt: daysAgo(Math.floor(Math.random() * 20)),
    });
  }
  return redemptions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
