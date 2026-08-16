export const CATEGORIES = [
  "大工",
  "電気工事",
  "左官",
  "塗装",
  "内装・クロス",
  "水道・設備",
  "外構・造園",
  "屋根工事",
  "リフォーム全般",
  "その他",
] as const;

export const DAYS = [
  { key: "MON", label: "月" },
  { key: "TUE", label: "火" },
  { key: "WED", label: "水" },
  { key: "THU", label: "木" },
  { key: "FRI", label: "金" },
  { key: "SAT", label: "土" },
  { key: "SUN", label: "日" },
] as const;

export const GENDER_LABEL: Record<string, string> = {
  MALE: "男性",
  FEMALE: "女性",
  OTHER: "その他",
  UNSPECIFIED: "未回答",
};

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "回答待ち",
  ACCEPTED: "受諾済み（マッチング成立）",
  DECLINED: "辞退",
  CANCELLED: "キャンセル",
  COMPLETED: "完了",
};

export const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  CANCELLED: "bg-neutral-200 text-neutral-600",
  COMPLETED: "bg-blue-100 text-blue-700",
};

export const COMMISSION_RATE = 0.15;
