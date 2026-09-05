export interface Member {
  id: string;
  name: string;
  avatar: string; // emoji, or an image path/data URI
  photo?: string; // this member's own smile photo, used on their posts
  role: 'staff' | 'manager'; // 店長・上長 (manager) can grant points on reports
}

export type EventPhase = 'prep' | 'day';

export interface EventActionItem {
  key: string;
  phase: EventPhase;
  label: string;
  points: number;
  emoji: string;
}

export const EVENT_ACTION_ITEMS: EventActionItem[] = [
  // 事前編
  { key: 'coordination', phase: 'prep', label: '自分から全体調整を実施', points: 100, emoji: '🧩' },
  { key: 'proposal', phase: 'prep', label: '企画の提案', points: 100, emoji: '💡' },
  { key: 'prep-participation', phase: 'prep', label: '事前準備への参加', points: 200, emoji: '🙌' },
  { key: 'genki-participation', phase: 'prep', label: '笑顔で元気に参加', points: 100, emoji: '😊' },
  { key: 'member-support', phase: 'prep', label: 'メンバーへのサポート', points: 100, emoji: '🤝' },
  // 当日編
  { key: 'genki-greeting', phase: 'day', label: '誰よりも元気にご挨拶', points: 300, emoji: '👋' },
  { key: 'consideration', phase: 'day', label: '気配り・お声掛け', points: 500, emoji: '👀' },
  { key: 'eyecatch-smile', phase: 'day', label: '笑顔でアイキャッチ', points: 200, emoji: '😄' },
  { key: 'peer-follow', phase: 'day', label: '仲間へのフォロー', points: 200, emoji: '🫱' },
  { key: 'quick-witted', phase: 'day', label: '機転の利いたお声掛け', points: 500, emoji: '✨' },
];

export function eventActionsFor(phase: EventPhase): EventActionItem[] {
  return EVENT_ACTION_ITEMS.filter((a) => a.phase === phase);
}

export function findEventAction(key: string): EventActionItem | undefined {
  return EVENT_ACTION_ITEMS.find((a) => a.key === key);
}

export const POINT_LIMITS = {
  daily: 60,
  monthly: 1200,
  annual: 14400,
};

export interface PointGrant {
  managerId: string;
  managerName: string;
  managerAvatar: string;
  comment: string;
  points: number;
  grantedAt: string; // ISO
}

export interface EventPost {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  eventKey: string;
  phase: EventPhase;
  actionKey: string;
  photo: string; // emoji/photo placeholder id
  comment: string;
  createdAt: string; // ISO
  likes: string[]; // member ids who liked
  grant?: PointGrant; // set once a manager approves and sends points
}

export interface SeasonalEvent {
  key: string;
  month: number; // 3, 6, 9, or 12 — kickoff month of the quarter
  seasonLabel: string; // e.g. '3月【春】'
  emoji: string;
  title: string;
  description: string;
  skillTag: string; // 「勝手に身につくスキル」
}

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    key: 'sakura-kickoff',
    month: 3,
    seasonLabel: '3月【春】',
    emoji: '🌸',
    title: 'さくらキックオフ',
    description: '新年度を祝う！最高の花見＆歓迎フェスをプロデュース。',
    skillTag: '段取り力・PM・気配り',
  },
  {
    key: 'gardening',
    month: 6,
    seasonLabel: '6月【夏】',
    emoji: '🌻',
    title: 'ガーデニング＆空間演出',
    description: 'オフィスや店舗を花と緑で彩る空間コンテスト。',
    skillTag: 'デザイン思考・環境改善（5S）',
  },
  {
    key: 'harvest-marche',
    month: 9,
    seasonLabel: '9月【秋】',
    emoji: '🌾',
    title: '成果＆ナレッジマルシェ',
    description: '上半期の成果や学びを「収穫物」に見立てて屋台で発表。',
    skillTag: 'プレゼン力・横の連携',
  },
  {
    key: 'santa-innovation',
    month: 12,
    seasonLabel: '12月【冬】',
    emoji: '🎄',
    title: 'サンタ・イノベーション',
    description: '感謝のギフト＋「会社を良くするカイゼン提案」大会。',
    skillTag: '課題解決・提案力',
  },
];

export function currentSeasonalEvent(date: Date): SeasonalEvent {
  const month = date.getMonth() + 1; // 1-12
  // pick the event whose kickoff month is closest at or before `month`, wrapping around the year
  let best = SEASONAL_EVENTS[0];
  let bestDiff = -Infinity;
  for (const ev of SEASONAL_EVENTS) {
    let diff = month - ev.month;
    if (diff < 0) diff += 12;
    if (diff <= 2 && (bestDiff === -Infinity || diff < bestDiff)) {
      best = ev;
      bestDiff = diff;
    }
  }
  return best;
}

export interface ExchangeItem {
  key: string;
  label: string;
  emoji: string;
  cost: number;
  kind: 'quo' | 'jtb';
}

export const EXCHANGE_ITEMS: ExchangeItem[] = [
  { key: 'quo-1000', label: 'QUOカード 1,000円分', emoji: '🎫', cost: 1000, kind: 'quo' },
  { key: 'quo-3000', label: 'QUOカード 3,000円分', emoji: '🎫', cost: 3000, kind: 'quo' },
  { key: 'quo-5000', label: 'QUOカード 5,000円分', emoji: '🎫', cost: 5000, kind: 'quo' },
  { key: 'jtb-1000', label: 'JTB旅行券 1,000円分', emoji: '✈️', cost: 1000, kind: 'jtb' },
  { key: 'jtb-3000', label: 'JTB旅行券 3,000円分', emoji: '✈️', cost: 3000, kind: 'jtb' },
  { key: 'jtb-5000', label: 'JTB旅行券 5,000円分', emoji: '✈️', cost: 5000, kind: 'jtb' },
];

export interface Redemption {
  id: string;
  userId: string;
  itemKey: string;
  label: string;
  emoji: string;
  cost: number;
  createdAt: string; // ISO
}
