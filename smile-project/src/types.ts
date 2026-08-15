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
  score: number; // sum of checklist points
  comment: string;
  createdAt: string; // ISO
  approvals: Approval[];
  ticketIssued: boolean;
  missionTitle?: string; // daily mission this post completed
  prop?: string; // speech-bubble prop caption overlaid on the photo
  stampKey?: string; // key into STAMP_OPTIONS, seasonal sticker overlaid on the photo
  buddyIds?: string[]; // colleague ids tagged as photographed together
}

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
