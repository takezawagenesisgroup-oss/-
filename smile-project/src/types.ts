export interface Member {
  id: string;
  name: string;
  avatar: string; // emoji, or an image path/data URI
  photo?: string; // this member's own smile photo, used on their posts
  role: 'staff' | 'manager'; // 店長・上長 (manager) — their "いいね" counts toward the point rule
}

export type EventPhase = 'prep' | 'day' | 'post';

export const PHASE_META: Record<EventPhase, { label: string; shortLabel: string; emoji: string }> = {
  prep: { label: '事前行動', shortLabel: '事前', emoji: '🛠️' },
  day: { label: '当日の報告', shortLabel: '当日', emoji: '🎉' },
  post: { label: '事後の行動', shortLabel: '事後', emoji: '🌱' },
};

export const EVENT_PHASES: EventPhase[] = ['prep', 'day', 'post'];

export interface EventActionItem {
  key: string;
  phase: EventPhase;
  label: string;
  points: number;
  emoji: string;
}

export const EVENT_ACTION_ITEMS: EventActionItem[] = [
  // 事前行動
  { key: 'coordination', phase: 'prep', label: '自分から全体調整を実施', points: 100, emoji: '🧩' },
  { key: 'proposal', phase: 'prep', label: '企画の提案', points: 100, emoji: '💡' },
  { key: 'prep-participation', phase: 'prep', label: '事前準備への参加', points: 200, emoji: '🙌' },
  { key: 'genki-participation', phase: 'prep', label: '笑顔で元気に参加', points: 100, emoji: '😊' },
  { key: 'member-support', phase: 'prep', label: 'メンバーへのサポート', points: 100, emoji: '🤝' },
  // 当日の報告
  { key: 'genki-greeting', phase: 'day', label: '誰よりも元気にご挨拶', points: 300, emoji: '👋' },
  { key: 'consideration', phase: 'day', label: '気配り・お声掛け', points: 500, emoji: '👀' },
  { key: 'eyecatch-smile', phase: 'day', label: '笑顔でアイキャッチ', points: 200, emoji: '😄' },
  { key: 'peer-follow', phase: 'day', label: '仲間へのフォロー', points: 200, emoji: '🫱' },
  { key: 'quick-witted', phase: 'day', label: '機転の利いたお声掛け', points: 500, emoji: '✨' },
  // 事後の行動
  { key: 'thanks-followup', phase: 'post', label: 'お礼・お声掛けのフォロー', points: 200, emoji: '🙏' },
  { key: 'reflection-share', phase: 'post', label: '振り返り・気づきの共有', points: 100, emoji: '📝' },
  { key: 'improvement-proposal', phase: 'post', label: '次回への改善提案', points: 300, emoji: '💭' },
  { key: 'knowledge-share', phase: 'post', label: 'ナレッジ・成功事例の共有', points: 200, emoji: '📚' },
  { key: 'team-appreciation', phase: 'post', label: 'メンバーへの感謝・称賛', points: 100, emoji: '💌' },
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

// ポイント獲得ルール：投稿に、店長・上長を含む3人以上の「いいね」がつくとポイント獲得
export const POINT_RULE = {
  minLikes: 3,
};

// 投稿のテーマ例：厳密な行動リストではなく、こんな瞬間を投稿しよう、というゆるやかな指針
export interface PostTheme {
  emoji: string;
  label: string;
}

export const POST_THEMES: PostTheme[] = [
  { emoji: '😄', label: '最高の笑顔' },
  { emoji: '🙌', label: 'お客様に喜んでいただいたこと' },
  { emoji: '🎉', label: '自分自身が楽しんだこと' },
];

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
  pointsEarnedAt?: string; // ISO — set once 店長・上長を含む3件以上のいいねの条件を満たした瞬間
  reportedBy?: string; // 本人以外が代理で投稿した場合、その投稿者のmember id
}

// イベントへの参加エントリー：エントリー期間中に本人が登録することで、
// そのイベントの評価項目確認・投稿フェーズに進める
export interface EventEntry {
  eventKey: string;
  memberId: string;
  enteredAt: string; // ISO
}

export interface MonthDay {
  month: number;
  day: number;
}

export interface SeasonalEvent {
  key: string;
  eventMonth: number; // 開催月
  eventDay: number; // 開催日
  seasonLabel: string; // e.g. '3月10日開催'
  emoji: string;
  title: string;
  description: string;
  skillTag: string; // 「勝手に身につくスキル」
  entryStart: MonthDay; // エントリー受付開始日
  entryEnd: MonthDay; // エントリー受付終了日
}

// 4シーズンのイベント：それぞれ専用のエントリー期間を設け、その期間にエントリーした人だけが
// 「評価項目の確認 → 投稿（本人 or 第三者）」のフェーズに進める、参加制の座組み。
export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    key: 'sakura-matsuri',
    eventMonth: 3,
    eventDay: 10,
    seasonLabel: '3月10日開催',
    emoji: '🌸',
    title: '桜祭り',
    description: '新年度を祝う！最高の花見＆歓迎フェスをプロデュース。',
    skillTag: '段取り力・PM・気配り',
    entryStart: { month: 1, day: 1 },
    entryEnd: { month: 1, day: 31 },
  },
  {
    key: 'gardening',
    eventMonth: 6,
    eventDay: 10,
    seasonLabel: '6月10日開催',
    emoji: '🌻',
    title: '花祭り',
    description: '店舗を花と緑で彩る恒例のガーデニングイベント。',
    skillTag: 'デザイン思考・環境改善（5S）',
    entryStart: { month: 3, day: 1 },
    entryEnd: { month: 3, day: 31 },
  },
  {
    key: 'genesis-halloween',
    eventMonth: 10,
    eventDay: 10,
    seasonLabel: '10月10日開催',
    emoji: '🎃',
    title: 'ジェネシスハロウィン',
    description: '仮装と装飾でお客様をおもてなしするハロウィンイベント。',
    skillTag: '企画力・チームワーク',
    entryStart: { month: 8, day: 1 },
    entryEnd: { month: 8, day: 31 },
  },
  {
    key: 'genesis-xmas',
    eventMonth: 12,
    eventDay: 10,
    seasonLabel: '12月10日開催',
    emoji: '🎄',
    title: 'ジェネシスHappy Xmas',
    description: '感謝のギフト＋「会社を良くするカイゼン提案」大会。',
    skillTag: '課題解決・提案力',
    entryStart: { month: 10, day: 1 },
    entryEnd: { month: 10, day: 31 },
  },
];

// 月日を年内で比較可能な単純な通し番号に変換（日は1-31に収まるため月*31+日で単調増加）
function monthDayNum(md: MonthDay): number {
  return md.month * 31 + md.day;
}

function dateNum(date: Date): number {
  return monthDayNum({ month: date.getMonth() + 1, day: date.getDate() });
}

// 現在の「開催サイクル」：各イベントのエントリー開始日から、次のイベントのエントリー開始日の前日まで。
// エントリー期間が終わった後も、当日・事後の投稿はこのサイクルの中で行う。
export function currentSeasonalEvent(date: Date): SeasonalEvent {
  const d = dateNum(date);
  const sorted = [...SEASONAL_EVENTS].sort((a, b) => monthDayNum(a.entryStart) - monthDayNum(b.entryStart));
  let current = sorted[0];
  for (const ev of sorted) {
    if (monthDayNum(ev.entryStart) <= d) current = ev;
  }
  return current;
}

export type EntryWindowStatus = 'open' | 'closed' | 'upcoming';

// 指定イベントのエントリー受付が「受付中／終了／これから」のどれかを判定
export function entryWindowStatus(event: SeasonalEvent, date: Date): EntryWindowStatus {
  const d = dateNum(date);
  const start = monthDayNum(event.entryStart);
  const end = monthDayNum(event.entryEnd);
  if (d < start) return 'upcoming';
  if (d > end) return 'closed';
  return 'open';
}

export function formatMonthDay(md: MonthDay): string {
  return `${md.month}月${md.day}日`;
}

// 次にエントリー受付が始まるイベント（今のサイクルの次のイベント）
export function nextSeasonalEvent(event: SeasonalEvent): SeasonalEvent {
  const idx = SEASONAL_EVENTS.findIndex((e) => e.key === event.key);
  return SEASONAL_EVENTS[(idx + 1) % SEASONAL_EVENTS.length];
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

export type RedemptionStatus = 'pending' | 'handed_over';

export interface Redemption {
  id: string;
  userId: string;
  itemKey: string;
  label: string;
  emoji: string;
  cost: number;
  createdAt: string; // ISO
  status: RedemptionStatus; // pending＝店長・上長に通知済み、手渡し待ち／handed_over＝手渡し完了
  notifiedManagerId?: string; // プッシュ通知を受け取った店長・上長のmember id
  handedOverAt?: string; // ISO — 手渡し完了時刻
}
