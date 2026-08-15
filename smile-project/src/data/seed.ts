import type { Member, SmilePost } from '../types';
import { CHECKLIST_ITEMS, APPROVALS_REQUIRED } from '../types';

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

export function buildSeedPosts(): SmilePost[] {
  const posts: SmilePost[] = [];

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
      posts.push({
        id: nextId(),
        userId: ME.id,
        userName: ME.name,
        avatar: ME.avatar,
        photo: PHOTO_EMOJIS[Math.floor(Math.random() * PHOTO_EMOJIS.length)],
        checklist,
        score: scoreFor(checklist),
        comment: '',
        createdAt,
        approvals,
        ticketIssued: approvals.length >= APPROVALS_REQUIRED,
      });
    }
  }

  // Colleagues' recent posts for the home feed
  const comments = [
    '今日もお疲れ様！',
    '朝から元気いっぱいでした🌞',
    '接客褒められました！',
    'チームで励まし合って頑張った一日',
    '笑顔を意識して過ごせました',
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
    posts.push({
      id: nextId(),
      userId: user.id,
      userName: user.name,
      avatar: user.avatar,
      photo: user.photo ?? PHOTO_EMOJIS[Math.floor(Math.random() * PHOTO_EMOJIS.length)],
      checklist,
      score: scoreFor(checklist),
      comment: comments[Math.floor(Math.random() * comments.length)],
      createdAt,
      approvals,
      ticketIssued: approvals.length >= APPROVALS_REQUIRED,
    });
  }

  return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
