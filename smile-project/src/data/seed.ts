import type { EventPost, Member, Redemption } from '../types';
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

const PREP_COMMENTS = [
  '当日の動線を確認しながら机の配置を決めました！',
  '飾り付け用の花を仕入れてきました🌸',
  '前日準備、みんなで手分けして進めました',
  '企画書をまとめて共有しました！',
  '準備が整って、あとは当日を待つのみです',
];

const DAY_COMMENTS = [
  'お客様に元気よくご挨拶できました！',
  '困っているお客様にすぐ気づいて声をかけられました',
  '新人スタッフのフォローもばっちりです',
  '笑顔でお出迎え、いい表情撮れました📸',
  '機転を利かせて対応、喜んでもらえました！',
];

const APPROVAL_COMMENTS = [
  'さすがの動きでした！助かりました',
  'いつも気が利いていて素晴らしいです',
  'お客様からの評判も良かったです、ありがとう！',
  'チーム全体の雰囲気が良くなりました',
  '模範的な対応でした！',
];

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

function randomLikes(authorId: string, pool: Member[]): string[] {
  const candidates = pool.filter((m) => m.id !== authorId);
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const count = Math.floor(Math.random() * (shuffled.length + 1));
  return shuffled.slice(0, count).map((m) => m.id);
}

export function buildSeedEventPosts(): EventPost[] {
  const posts: EventPost[] = [];
  const allMembers = [ME, ...COLLEAGUES];
  const managers = COLLEAGUES.filter((m) => m.role === 'manager');
  const event = currentSeasonalEvent(new Date());

  const authors = [ME, ...COLLEAGUES];
  const prepActions = eventActionsFor('prep');
  const dayActions = eventActionsFor('day');

  authors.forEach((author, idx) => {
    // one prep-phase report per person
    const prepAction = prepActions[idx % prepActions.length];
    const prepCreatedAt = daysAgo(6 + idx);
    const prepGranted = Math.random() < 0.6;
    const prepManager = managers.find((m) => m.id !== author.id) ?? managers[0];
    posts.push({
      id: nextId(),
      userId: author.id,
      userName: author.name,
      avatar: author.avatar,
      eventKey: event.key,
      phase: 'prep',
      actionKey: prepAction.key,
      photo: author.photo ?? PHOTO_EMOJIS[Math.floor(Math.random() * PHOTO_EMOJIS.length)],
      comment: PREP_COMMENTS[idx % PREP_COMMENTS.length],
      createdAt: prepCreatedAt,
      likes: randomLikes(author.id, allMembers),
      grant: prepGranted
        ? {
            managerId: prepManager.id,
            managerName: prepManager.name,
            managerAvatar: prepManager.avatar,
            comment: APPROVAL_COMMENTS[idx % APPROVAL_COMMENTS.length],
            points: prepAction.points,
            grantedAt: daysAgo(5 + idx),
          }
        : undefined,
    });

    // one day-phase report per person
    const dayAction = dayActions[(idx + 2) % dayActions.length];
    const dayCreatedAt = daysAgo(Math.max(0, 2 - idx));
    const dayGranted = Math.random() < 0.5;
    const dayManager = managers.find((m) => m.id !== author.id) ?? managers[0];
    posts.push({
      id: nextId(),
      userId: author.id,
      userName: author.name,
      avatar: author.avatar,
      eventKey: event.key,
      phase: 'day',
      actionKey: dayAction.key,
      photo: author.photo ?? PHOTO_EMOJIS[Math.floor(Math.random() * PHOTO_EMOJIS.length)],
      comment: DAY_COMMENTS[(idx + 1) % DAY_COMMENTS.length],
      createdAt: dayCreatedAt,
      likes: randomLikes(author.id, allMembers),
      grant: dayGranted
        ? {
            managerId: dayManager.id,
            managerName: dayManager.name,
            managerAvatar: dayManager.avatar,
            comment: APPROVAL_COMMENTS[(idx + 2) % APPROVAL_COMMENTS.length],
            points: dayAction.points,
            grantedAt: daysAgo(Math.max(0, 1 - idx)),
          }
        : undefined,
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
