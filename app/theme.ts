// "凪 -Nagi-" の配色トークン。静かな夜の海をイメージした濃紺グリーン地に、
// 月あかりのブラス(accent)と、再生中を示す翡翠(accent2)を差し色にする。
export const colors = {
  bg: '#0F1614',
  surface: '#17211E',
  surfaceRaised: '#1C2724',
  surfaceActive: '#1F3A31',
  border: '#243330',
  borderActive: '#3A5B4E',
  text: '#ECEEE8',
  textMuted: '#8FA098',
  accent: '#D9A94F',
  accent2: '#5FB795',
  danger: '#E08A72',
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
