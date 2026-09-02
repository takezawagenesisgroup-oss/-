export type SoundDef = {
  id: string;
  label: string;
  sub: string;
  emoji: string;
  source: number;
  free: boolean;
};

// プレースホルダー音源(assets/sounds/README.md 参照)。リリース前に実録音へ差し替え推奨。
// 無料枠は検索需要の大きい3種(雨・ホワイトノイズ・波)、残り4種は買い切りで解放する
// 価格戦略(戦略メモ参照)に対応させている。
export const SOUNDS: SoundDef[] = [
  { id: 'rain', label: '雨', sub: 'Rain', emoji: '🌧️', source: require('../assets/sounds/rain.wav'), free: true },
  { id: 'waves', label: '波', sub: 'Waves', emoji: '🌊', source: require('../assets/sounds/waves.wav'), free: true },
  { id: 'white_noise', label: 'ホワイトノイズ', sub: 'White noise', emoji: '📻', source: require('../assets/sounds/white_noise.wav'), free: true },
  { id: 'campfire', label: '焚き火', sub: 'Campfire', emoji: '🔥', source: require('../assets/sounds/campfire.wav'), free: false },
  { id: 'cafe', label: 'カフェ', sub: 'Café', emoji: '☕', source: require('../assets/sounds/cafe.wav'), free: false },
  { id: 'wind_chimes', label: '風鈴', sub: 'Wind chimes', emoji: '🎐', source: require('../assets/sounds/wind_chimes.wav'), free: false },
  // 隣で誰かが眠っているような気配を作る、ゆっくり深い寝息のループ(気配アプリの技術を流用)。
  { id: 'sleeping_breath', label: '誰かの寝息', sub: 'Sleeping breath', emoji: '😴', source: require('../assets/sounds/sleeping_breath.wav'), free: false },
];

export const PREMIUM_SOUND_COUNT = SOUNDS.filter((s) => !s.free).length;
export const DEFAULT_VOLUME = 0.7;
export const UNLOCK_PRICE_JPY = 480;
