// 「気配 -Kehai-」の配色トークン。夜の勉強部屋のランプのような、暖かく静かな
// 灯りをイメージ。凪(夜の海)・隣(屋外ラン)とは違う、室内の落ち着いた暖色。
export const colors = {
  bg: '#1B1620',
  surface: '#241D29',
  surfaceRaised: '#2C2431',
  surfaceActive: '#3A2A34',
  border: '#352C3B',
  borderActive: '#C98BA0',
  text: '#F2ECEE',
  textMuted: '#9C90A0',
  accent: '#D9A15C',
  accent2: '#C98BA0',
  danger: '#D97F6A',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;
