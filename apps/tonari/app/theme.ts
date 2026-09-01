// 「隣 -Tonari-」の配色トークン。凪(夜・静)とは対照的に、屋外を走る昼の
// エネルギーをイメージした明るいトーン。差し色はランニングウェアのような
// コーラルオレンジ、達成・ペース向上を示すサブ差し色に爽やかなブルー。
export const colors = {
  bg: '#161A22',
  surface: '#1D222D',
  surfaceRaised: '#242B38',
  surfaceActive: '#3A2A22',
  border: '#2E3441',
  borderActive: '#C8672F',
  text: '#F3F1EC',
  textMuted: '#9AA1B0',
  accent: '#E2662F',
  accent2: '#3E8FBF',
  danger: '#E0644F',
  success: '#4FA97E',
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
