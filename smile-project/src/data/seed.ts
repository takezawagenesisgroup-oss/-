import type { EventAction, Member, Redemption, SmilePost } from '../types';
import {
  CHECKLIST_ITEMS,
  APPROVALS_REQUIRED,
  MISSION_BONUS_POINTS,
  PROP_OPTIONS,
  STAMP_OPTIONS,
  missionForDate,
  SEASONAL_EVENTS,
  EXCHANGE_ITEMS,
} from '../types';

export const ME: Member = { id: 'me', name: '自分', avatar: '🙂' };

export const COLLEAGUES: Member[] = [
  { id: 'u1', name: '田中 美咲', avatar: '/photos/person1-avatar.jpg', photo: '/photos/person1.jpg' },
  { id: 'u2', name: '佐藤 健一', avatar: '/photos/person2-avatar.jpg', photo: '/photos/person2.jpg' },
  { id: 'u3', name: '鈴木 蓮', avatar: '/photos/person3-avatar.jpg', photo: '/photos/person3.jpg' },
  { id: 'u4', name: '山本 陽菜', avatar: '/photos/person4-avatar.jpg', photo: '/photos/person4.jpg' },
  { id: 'u5', name: '高橋 大和', avatar: '👨🏻‍🦰' },
];

const PHOTO_EMOJIS = ['😄', '😁', '😊', '🥰', '😆', '🙂'];

function scoreFor(checklist: string[]): number {
  return checklist.reduce((sum, key) => {
    const item = CHECKLIST_ITEMS.find((c) => c.key === key);
    return sum + (item ? item.points : 0);
  }, 0);
}

function randomChecklist(): string[] {
  const count = 3 + Math.floor(Math.random() * 3); // 3-5 items
  const shuffled = [...CHECKLIST_ITEMS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((c) => c.key);
}

function daysAgo(n: number, hour = 18): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, Math.floor(Math.random() * 59), 0, 0);
  return d.toISOString();
}

let idCounter = 1;
function nextId(): string {
  return `p${idCounter++}`;
}

function buildExtras(createdAt: string, userId: string): { extras: Partial<SmilePost>; bonus: number } {
  const extras: Partial<SmilePost> = {};
  let bonus = 0;
  if (Math.random() < 0.55) {
    extras.missionTitle = missionForDate(new Date(createdAt)).title;
    bonus = MISSION_BONUS_POINTS;
  }
  if (Math.random() < 0.3) {
    extras.prop = PROP_OPTIONS[Math.floor(Math.random() * PROP_OPTIONS.length)];
  }
  if (Math.random() < 0.25) {
    extras.stampKey = STAMP_OPTIONS[Math.floor(Math.random() * STAMP_OPTIONS.length)].key;
  }
  if (Math.random() < 0.35) {
    const pool = [ME, ...COLLEAGUES].filter((m) => m.id !== userId);
    const buddy = pool[Math.floor(Math.random() * pool.length)];
    extras.buddyIds = [buddy.id];
  }
  return { extras, bonus };
}

export function buildSeedPosts(): SmilePost[] {
  const posts: SmilePost[] = [];

  const selfComments = [
    '',
    '',
    'お客様に「いつもありがとう」と言われて嬉しかった瞬間！',
    '鈴木さんがナイスフォローしてくれて助かった時の笑顔！',
    '自分なりに頑張れた一日でした！',
  ];

  // "me" posts scattered over the current month for the stamp calendar
  const today = new Date();
  const daysIntoMonth = today.getDate();
  for (let d = 0; d < daysIntoMonth; d++) {
    if (Math.random() < 0.72) {
      const checklist = randomChecklist();
      const createdAt = daysAgo(d);
      const approvals = [];
      const approverPool = [...COLLEAGUES].sort(() => Math.random() - 0.5);
      const approveCount = Math.random() < 0.75 ? 2 + Math.floor(Math.random() * 2) : Math.floor(Math.random() * 2);
      for (let i = 0; i < approveCount; i++) {
        const a = approverPool[i];
        approvals.push({
          userId: a.id,
          userName: a.name,
          avatar: a.avatar,
          approvedAt: createdAt,
        });
      }
      const { extras, bonus } = buildExtras(createdAt, ME.id);
      posts.push({
        id: nextId(),
        userId: ME.id,
        userName: ME.name,
        avatar: ME.avatar,
        photo: PHOTO_EMOJIS[Math.floor(Math.random() * PHOTO_EMOJIS.length)],
        checklist,
        score: scoreFor(checklist) + bonus,
        comment: selfComments[Math.floor(Math.random() * selfComments.length)],
        createdAt,
        approvals,
        approvalBonusAwarded: approvals.length >= APPROVALS_REQUIRED,
        ...extras,
      });
    }
  }

  // Colleagues' recent posts for the home feed
  const comments = [
    '今日もお疲れ様！',
    '朝から元気いっぱいでした🌞',
    'お客様に「また来るね」と言われて嬉しかった瞬間！',
    '田中さんがナイスフォローしてくれて助かった時の笑顔！',
    '笑顔を意識して過ごせました',
    'ピークタイムを乗り切ったあとの一枚です！',
  ];
  for (let i = 0; i < 10; i++) {
    const user = COLLEAGUES[Math.floor(Math.random() * COLLEAGUES.length)];
    const checklist = randomChecklist();
    const createdAt = daysAgo(Math.floor(Math.random() * 4));
    const approvals = [];
    const approverPool = [ME, ...COLLEAGUES.filter((c) => c.id !== user.id)].sort(() => Math.random() - 0.5);
    const approveCount = Math.floor(Math.random() * 3);
    for (let j = 0; j < approveCount; j++) {
      const a = approverPool[j];
      approvals.push({ userId: a.id, userName: a.name, avatar: a.avatar, approvedAt: createdAt });
    }
    const { extras, bonus } = buildExtras(createdAt, user.id);
    posts.push({
      id: nextId(),
      userId: user.id,
      userName: user.name,
      avatar: user.avatar,
      photo: user.photo ?? PHOTO_EMOJIS[Math.floor(Math.random() * PHOTO_EMOJIS.length)],
      checklist,
      score: scoreFor(checklist) + bonus,
      comment: comments[Math.floor(Math.random() * comments.length)],
      createdAt,
      approvals,
      approvalBonusAwarded: approvals.length >= APPROVALS_REQUIRED,
      ...extras,
    });
  }

  return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function buildSeedEventActions(): EventAction[] {
  const actions: EventAction[] = [];
  // Take the two most recently kicked-off events as "already underway" so the Events page has activity.
  const now = new Date();
  const pastEvents = SEASONAL_EVENTS.filter((ev) => ev.month <= now.getMonth() + 1).slice(-2);
  const events = pastEvents.length > 0 ? pastEvents : [SEASONAL_EVENTS[0]];

  let idCounter = 1;
  events.forEach((ev) => {
    const shuffled = [...COLLEAGUES].sort(() => Math.random() - 0.5);
    const leader = shuffled[0];
    const createdAt = daysAgo(10 + Math.floor(Math.random() * 20));
    actions.push({
      id: `ev${idCounter++}`,
      userId: leader.id,
      userName: leader.name,
      avatar: leader.avatar,
      eventKey: ev.key,
      role: 'leader',
      coins: ev.leaderCoins,
      createdAt,
    });
    shuffled.slice(1, 1 + 2 + Math.floor(Math.random() * 2)).forEach((member) => {
      actions.push({
        id: `ev${idCounter++}`,
        userId: member.id,
        userName: member.name,
        avatar: member.avatar,
        eventKey: ev.key,
        role: 'participant',
        coins: ev.participateCoins,
        createdAt: daysAgo(8 + Math.floor(Math.random() * 20)),
      });
    });
  });

  return actions;
}

export function buildSeedRedemptions(): Redemption[] {
  const redemptions: Redemption[] = [];
  let idCounter = 1;
  const pool = COLLEAGUES;
  const count = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const user = pool[Math.floor(Math.random() * pool.length)];
    const item = EXCHANGE_ITEMS[Math.floor(Math.random() * 3)]; // keep seeded redemptions to the cheaper tiers
    redemptions.push({
      id: `rd${idCounter++}`,
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
