export type SoundDef = {
  id: string;
  label: string;
  sub: string;
  emoji: string;
  source: number;
};

// プレースホルダー音源(assets/sounds/README.md 参照)。リリース前に実録音へ差し替え推奨。
export const SOUNDS: SoundDef[] = [
  { id: 'rain', label: '雨', sub: 'Rain', emoji: '🌧️', source: require('../assets/sounds/rain.wav') },
  { id: 'waves', label: '波', sub: 'Waves', emoji: '🌊', source: require('../assets/sounds/waves.wav') },
  { id: 'campfire', label: '焚き火', sub: 'Campfire', emoji: '🔥', source: require('../assets/sounds/campfire.wav') },
  { id: 'white_noise', label: 'ホワイトノイズ', sub: 'White noise', emoji: '📻', source: require('../assets/sounds/white_noise.wav') },
  { id: 'cafe', label: 'カフェ', sub: 'Café', emoji: '☕', source: require('../assets/sounds/cafe.wav') },
  { id: 'wind_chimes', label: '風鈴', sub: 'Wind chimes', emoji: '🎐', source: require('../assets/sounds/wind_chimes.wav') },
];

export const DEFAULT_VOLUME = 0.7;
