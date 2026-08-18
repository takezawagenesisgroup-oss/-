export interface ChecklistItem {
  key: string;
  label: string;
  emoji: string;
  points: number;
}

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  { key: 'smile', label: 'スマイル', emoji: '😊', points: 20 },
  { key: 'greeting', label: '挨拶', emoji: '👋', points: 20 },
  { key: 'energy', label: 'エネルギー', emoji: '⚡', points: 20 },
  { key: 'service', label: '接客品質', emoji: '🎯', points: 20 },
  { key: 'teamwork', label: 'チームワーク', emoji: '🤝', points: 20 },
];

export const APPROVALS_REQUIRED = 2;

export interface Approval {
  userId: string;
  userName: string;
  avatar: string;
  approvedAt: string; // ISO
}

export interface SmilePost {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  photo: string; // emoji/photo placeholder id
  checklist: string[]; // keys of CHECKLIST_ITEMS checked
  score: number; // Genesisコイン獲得額（チェック項目の合計）
  comment: string;
  createdAt: string; // ISO
  approvals: Approval[];
  approvalBonusAwarded: boolean; // 承認2人達成でGenesisコインのボーナスを獲得済みか
  missionTitle?: string; // daily mission this post completed
  prop?: string; // speech-bubble prop caption overlaid on the photo
  stampKey?: string; // key into STAMP_OPTIONS, seasonal sticker overlaid on the photo
  buddyIds?: string[]; // colleague ids tagged as photographed together
}

export const COIN_UNIT = 'GC';
export const APPROVAL_BONUS_COINS = 50;

export interface DailyMission {
  weekday: number; // 0 = Sunday ... 6 = Saturday
  icon: string;
  title: string;
  prompt: string;
}

export const MISSION_BONUS_POINTS = 15;

export const DAILY_MISSIONS: DailyMission[] = [
  { weekday: 0, icon: '🙏', title: 'サンクス・スマイル', prompt: '今日出会えたことに感謝。誰かに「ありがとう」を伝えた瞬間の一枚を' },
  { weekday: 1, icon: '👀', title: 'アイコンタクト・スマイル', prompt: 'お客様と目が合った瞬間の笑顔を意識！ペアでお互いの目力スマイルをパシャリ' },
  { weekday: 2, icon: '🎤', title: 'ファーストボイス・スマイル', prompt: '今日一番元気な「いらっしゃいませ！」を出したスタッフのドヤ顔スマイル' },
  { weekday: 3, icon: '🤝', title: 'シンクロ・スマイル', prompt: '2人以上で息を合わせたお辞儀やポーズでの笑顔' },
  { weekday: 4, icon: '🔄', title: 'ビフォーアフター・スマイル', prompt: '開店前の真剣な準備顔 ➡ オープン直後の満面スマイル' },
  { weekday: 5, icon: '🙌', title: 'ピークタイム乗り切りスマイル', prompt: '忙しいピークを終えた後の「やりきった！」ハイタッチ笑顔' },
  { weekday: 6, icon: '🎉', title: '週末プレミアム・スマイル', prompt: '週末を盛り上げるとびきりの一枚。仲間と一緒に決めポーズ！' },
];

export function missionForDate(date: Date): DailyMission {
  return DAILY_MISSIONS[date.getDay()];
}

export const PROP_OPTIONS: string[] = ['今日も元気に営業中！', 'おすすめはコレ！', '笑顔120%！', 'ただいま出勤中🎌'];

export interface StampOption {
  key: string;
  label: string;
  emoji: string;
}

export const STAMP_OPTIONS: StampOption[] = [
  { key: 'sparkle', label: 'キラキラ', emoji: '✨' },
  { key: 'best', label: '今週のベストスマイル', emoji: '🏆' },
  { key: 'summer', label: '夏祭り', emoji: '🎐' },
  { key: 'halloween', label: 'ハロウィン', emoji: '🎃' },
  { key: 'winter', label: '冬', emoji: '🎄' },
];

export const STORY_TEMPLATES: string[] = [
  '今日お客様に「〇〇」と言われて嬉しかった瞬間！',
  '〇〇さんがナイスフォローしてくれて助かった時の笑顔！',
  '自分なりに頑張れた〇〇の瞬間！',
];

export interface Member {
  id: string;
  name: string;
  avatar: string; // emoji, or an image path/data URI
  photo?: string; // this member's own smile photo, used on their posts
}

export interface SeasonalEvent {
  key: string;
  month: number; // 3, 6, 9, or 12 — kickoff month of the quarter
  seasonLabel: string; // e.g. '3月【春】'
  emoji: string;
  title: string;
  description: string;
  skillTag: string; // 「勝手に身につくスキル」
  participateCoins: number;
  leaderCoins: number;
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
    participateCoins: 200,
    leaderCoins: 800,
  },
  {
    key: 'gardening',
    month: 6,
    seasonLabel: '6月【夏】',
    emoji: '🌻',
    title: 'ガーデニング＆空間演出',
    description: 'オフィスや店舗を花と緑で彩る空間コンテスト。',
    skillTag: 'デザイン思考・環境改善（5S）',
    participateCoins: 200,
    leaderCoins: 800,
  },
  {
    key: 'harvest-marche',
    month: 9,
    seasonLabel: '9月【秋】',
    emoji: '🌾',
    title: '成果＆ナレッジマルシェ',
    description: '上半期の成果や学びを「収穫物」に見立てて屋台で発表。',
    skillTag: 'プレゼン力・横の連携',
    participateCoins: 200,
    leaderCoins: 800,
  },
  {
    key: 'santa-innovation',
    month: 12,
    seasonLabel: '12月【冬】',
    emoji: '🎄',
    title: 'サンタ・イノベーション',
    description: '感謝のギフト＋「会社を良くするカイゼン提案」大会。',
    skillTag: '課題解決・提案力',
    participateCoins: 200,
    leaderCoins: 800,
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
  tier: 'daily' | 'gift' | 'resort' | 'reward';
  description: string;
}

export interface EventAction {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  eventKey: string;
  role: 'participant' | 'leader';
  coins: number;
  createdAt: string; // ISO
}

export interface Redemption {
  id: string;
  userId: string;
  itemKey: string;
  label: string;
  emoji: string;
  cost: number;
  createdAt: string; // ISO
}

export const EXCHANGE_ITEMS: ExchangeItem[] = [
  { key: 'drink', label: '冷たいドリンク1杯', emoji: '🥤', cost: 100, tier: 'daily', description: '退勤後の一杯に。定番の即時還元。' },
  { key: 'sweets', label: '人気スイーツセット', emoji: '🍰', cost: 300, tier: 'daily', description: '休憩時間にみんなでシェアできる焼き菓子セット。' },
  { key: 'gift-card', label: 'コンビニギフトカード 3,000円分', emoji: '🎁', cost: 800, tier: 'gift', description: '好きなタイミングで使えるギフトカード。' },
  { key: 'resort-voucher', label: 'リゾート宿泊券（1泊2食付）', emoji: '🏨', cost: 1500, tier: 'resort', description: '軸②の四季イベントとも連動する宿泊特典。' },
  { key: 'gourmet-set', label: '豪華食材セット（お取り寄せグルメ）', emoji: '🍖', cost: 3000, tier: 'resort', description: 'ご褒美グルメのお取り寄せセット。' },
  { key: 'bonus-cash', label: '特別報奨金', emoji: '💰', cost: 8000, tier: 'reward', description: '金一封として現金給付。' },
  { key: 'reward-trip', label: '褒賞旅行（国内／海外）', emoji: '✈️', cost: 20000, tier: 'reward', description: '積み上げたGenesisコインの集大成、褒賞旅行への招待。' },
];
