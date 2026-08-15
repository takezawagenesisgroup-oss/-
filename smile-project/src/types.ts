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
}

export interface Member {
  id: string;
  name: string;
  avatar: string; // emoji, or an image path/data URI
  photo?: string; // this member's own smile photo, used on their posts
}
