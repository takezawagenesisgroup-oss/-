import type { EventPhase, EventPost, Member, Redemption } from '../types';
import { EXCHANGE_ITEMS, currentSeasonalEvent, eventActionsFor } from '../types';

export const ME: Member = { id: 'me', name: '自分', avatar: '🙂', role: 'staff' };

export const COLLEAGUES: Member[] = [
  { id: 'u1', name: '田中 美咲', avatar: '/photos/person1-avatar.jpg', photo: '/photos/person1.jpg', role: 'staff' },
  { id: 'u2', name: '佐藤 健一', avatar: '/photos/person2-avatar.jpg', photo: '/photos/person2.jpg', role: 'manager' },
  { id: 'u3', name: '鈴木 蓮', avatar: '/photos/person3-avatar.jpg', photo: '/photos/person3.jpg', role: 'staff' },
  { id: 'u4', name: '山本 陽菜', avatar: '/photos/person4-avatar.jpg', photo: '/photos/person4.jpg', role: 'staff' },
  { id: 'u5', name: '高橋 大和', avatar: '👨🏻‍🦰', role: 'manager' },
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

export function buildSeedEventPosts(): EventPost[] {
  const posts: EventPost[] = [];
  const allMembers = [ME, ...COLLEAGUES];
  const managers = COLLEAGUES.filter((m) => m.role === 'manager');
  const event = currentSeasonalEvent(new Date());
  const authors = [ME, ...COLLEAGUES];
  const phases: EventPhase[] = ['prep', 'day', 'post'];

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
