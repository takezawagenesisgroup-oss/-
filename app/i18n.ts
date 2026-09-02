import { useCallback, useEffect, useState } from 'react';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 凪の多言語対応。会話ログのTTSを使う気配・隣と違い、凪は環境音+タイマーだけの
// UIなので、音声合成の言語切り替えは不要で、画面文言の差し替えだけで完結する。
//
// 対応言語を増やす手順:
// 1. SUPPORTED_LOCALES に言語コードを追加
// 2. LOCALE_LABELS にその言語での自国語表記(切り替えUI用)を追加
// 3. TRANSLATIONS に全キー分の翻訳を追加(型チェックで不足があればtscがエラーにする)
//
// 注意: ここでの翻訳はネイティブレビューを経ていない。特にストア申請文言
// (docs/store-listing.md等)は別途ネイティブスピーカーによる確認を推奨する。
export type LocaleCode = 'ja' | 'en' | 'es' | 'ko' | 'de' | 'fr' | 'pt';

export const SUPPORTED_LOCALES: LocaleCode[] = ['ja', 'en', 'es', 'ko', 'de', 'fr', 'pt'];

export const LOCALE_LABELS: Record<LocaleCode, string> = {
  ja: '日本語',
  en: 'English',
  es: 'Español',
  ko: '한국어',
  de: 'Deutsch',
  fr: 'Français',
  pt: 'Português',
};

type Vars = Record<string, string | number>;

const TRANSLATIONS = {
  ja: {
    appSubtitle: '集中と眠りのサウンドタイマー',
    'sound.rain': '雨',
    'sound.waves': '波',
    'sound.white_noise': 'ホワイトノイズ',
    'sound.campfire': '焚き火',
    'sound.cafe': 'カフェ',
    'sound.wind_chimes': '風鈴',
    'sound.sleeping_breath': '誰かの寝息',
    upgradeBanner: '🔒 残り{count}種類のサウンドを解放 — 買い切り{price}',
    footerIdle: '音を選んでタップすると再生します',
    stopAll: '全て停止',
    paywallEyebrow: 'すべてのサウンドを解放',
    paywallTitle: '買い切り {price}',
    paywallBody: 'サブスクなし。一度購入すれば、追加の環境音をずっと使えます。',
    paywallUnlockButton: '{price} で解放する',
    paywallRestore: '購入を復元',
    paywallClose: '閉じる',
    actionStop: '停止',
    actionPlay: '再生',
    a11yLocked: '{label}は購入すると解放されます',
    a11yToggle: '{label}を{action}',
    tabFocus: '集中',
    tabSleep: '就寝',
    hintFocusRunning: '終了時にサウンドを止めます',
    hintSleepRunning: '終了前にゆっくりフェードアウトします',
    stopTimer: 'タイマーを止める',
    custom: 'カスタム',
    start: '開始',
    languageLabel: '言語',
  },
  en: {
    appSubtitle: 'Sound timer for focus and sleep',
    'sound.rain': 'Rain',
    'sound.waves': 'Waves',
    'sound.white_noise': 'White noise',
    'sound.campfire': 'Campfire',
    'sound.cafe': 'Café',
    'sound.wind_chimes': 'Wind chimes',
    'sound.sleeping_breath': 'Sleeping breath',
    upgradeBanner: '🔒 Unlock {count} more sounds — one-time {price}',
    footerIdle: 'Pick a sound and tap to play',
    stopAll: 'Stop all',
    paywallEyebrow: 'Unlock every sound',
    paywallTitle: 'One-time {price}',
    paywallBody: 'No subscription. Pay once and keep every extra sound forever.',
    paywallUnlockButton: 'Unlock for {price}',
    paywallRestore: 'Restore purchase',
    paywallClose: 'Close',
    actionStop: 'stop',
    actionPlay: 'play',
    a11yLocked: '{label} unlocks with purchase',
    a11yToggle: '{action} {label}',
    tabFocus: 'Focus',
    tabSleep: 'Sleep',
    hintFocusRunning: 'Sounds stop when the timer ends',
    hintSleepRunning: 'Sounds fade out gently before the timer ends',
    stopTimer: 'Stop timer',
    custom: 'Custom',
    start: 'Start',
    languageLabel: 'Language',
  },
  es: {
    appSubtitle: 'Temporizador de sonidos para concentrarte y dormir',
    'sound.rain': 'Lluvia',
    'sound.waves': 'Olas',
    'sound.white_noise': 'Ruido blanco',
    'sound.campfire': 'Fogata',
    'sound.cafe': 'Café',
    'sound.wind_chimes': 'Campanas de viento',
    'sound.sleeping_breath': 'Respiración de alguien dormido',
    upgradeBanner: '🔒 Desbloquea {count} sonidos más — pago único de {price}',
    footerIdle: 'Elige un sonido y toca para reproducir',
    stopAll: 'Detener todo',
    paywallEyebrow: 'Desbloquea todos los sonidos',
    paywallTitle: 'Pago único de {price}',
    paywallBody: 'Sin suscripción. Paga una vez y conserva todos los sonidos adicionales para siempre.',
    paywallUnlockButton: 'Desbloquear por {price}',
    paywallRestore: 'Restaurar compra',
    paywallClose: 'Cerrar',
    actionStop: 'detener',
    actionPlay: 'reproducir',
    a11yLocked: '{label} se desbloquea con la compra',
    a11yToggle: '{action} {label}',
    tabFocus: 'Concentración',
    tabSleep: 'Dormir',
    hintFocusRunning: 'Los sonidos se detienen al terminar el temporizador',
    hintSleepRunning: 'Los sonidos se desvanecen suavemente antes de terminar',
    stopTimer: 'Detener temporizador',
    custom: 'Personalizado',
    start: 'Empezar',
    languageLabel: 'Idioma',
  },
  ko: {
    appSubtitle: '집중과 수면을 위한 사운드 타이머',
    'sound.rain': '비',
    'sound.waves': '파도',
    'sound.white_noise': '화이트 노이즈',
    'sound.campfire': '모닥불',
    'sound.cafe': '카페',
    'sound.wind_chimes': '풍경',
    'sound.sleeping_breath': '옆에서 잠든 숨소리',
    upgradeBanner: '🔒 사운드 {count}개 더 해제 — 평생 이용 {price}',
    footerIdle: '사운드를 선택해서 탭하면 재생됩니다',
    stopAll: '모두 정지',
    paywallEyebrow: '모든 사운드 해제',
    paywallTitle: '평생 이용 {price}',
    paywallBody: '구독 없음. 한 번만 결제하면 추가 사운드를 계속 사용할 수 있어요.',
    paywallUnlockButton: '{price}로 해제하기',
    paywallRestore: '구매 복원',
    paywallClose: '닫기',
    actionStop: '정지',
    actionPlay: '재생',
    a11yLocked: '{label}은(는) 구매하면 해제됩니다',
    a11yToggle: '{label} {action}',
    tabFocus: '집중',
    tabSleep: '수면',
    hintFocusRunning: '타이머가 끝나면 사운드가 정지됩니다',
    hintSleepRunning: '타이머가 끝나기 전에 천천히 페이드아웃됩니다',
    stopTimer: '타이머 정지',
    custom: '직접 설정',
    start: '시작',
    languageLabel: '언어',
  },
  de: {
    appSubtitle: 'Sound-Timer für Konzentration und Schlaf',
    'sound.rain': 'Regen',
    'sound.waves': 'Wellen',
    'sound.white_noise': 'Weißes Rauschen',
    'sound.campfire': 'Lagerfeuer',
    'sound.cafe': 'Café',
    'sound.wind_chimes': 'Windspiel',
    'sound.sleeping_breath': 'Atem eines schlafenden Menschen',
    upgradeBanner: '🔒 {count} weitere Sounds freischalten — einmalig {price}',
    footerIdle: 'Sound auswählen und antippen zum Abspielen',
    stopAll: 'Alle stoppen',
    paywallEyebrow: 'Alle Sounds freischalten',
    paywallTitle: 'Einmalig {price}',
    paywallBody: 'Kein Abo. Einmal zahlen und alle zusätzlichen Sounds für immer nutzen.',
    paywallUnlockButton: 'Für {price} freischalten',
    paywallRestore: 'Kauf wiederherstellen',
    paywallClose: 'Schließen',
    actionStop: 'stoppen',
    actionPlay: 'abspielen',
    a11yLocked: '{label} wird mit dem Kauf freigeschaltet',
    a11yToggle: '{label} {action}',
    tabFocus: 'Fokus',
    tabSleep: 'Schlaf',
    hintFocusRunning: 'Sounds stoppen, wenn der Timer endet',
    hintSleepRunning: 'Sounds blenden sanft aus, bevor der Timer endet',
    stopTimer: 'Timer stoppen',
    custom: 'Individuell',
    start: 'Start',
    languageLabel: 'Sprache',
  },
  fr: {
    appSubtitle: 'Minuteur sonore pour la concentration et le sommeil',
    'sound.rain': 'Pluie',
    'sound.waves': 'Vagues',
    'sound.white_noise': 'Bruit blanc',
    'sound.campfire': 'Feu de camp',
    'sound.cafe': 'Café',
    'sound.wind_chimes': 'Carillon éolien',
    'sound.sleeping_breath': "Respiration de quelqu'un qui dort",
    upgradeBanner: '🔒 Débloquez {count} sons supplémentaires — paiement unique de {price}',
    footerIdle: 'Choisissez un son et appuyez pour le lire',
    stopAll: 'Tout arrêter',
    paywallEyebrow: 'Débloquer tous les sons',
    paywallTitle: 'Paiement unique de {price}',
    paywallBody: 'Sans abonnement. Payez une fois et gardez tous les sons supplémentaires pour toujours.',
    paywallUnlockButton: 'Débloquer pour {price}',
    paywallRestore: "Restaurer l'achat",
    paywallClose: 'Fermer',
    actionStop: 'arrêter',
    actionPlay: 'lire',
    a11yLocked: "{label} se débloque à l'achat",
    a11yToggle: '{action} {label}',
    tabFocus: 'Concentration',
    tabSleep: 'Sommeil',
    hintFocusRunning: 'Les sons s’arrêtent à la fin du minuteur',
    hintSleepRunning: 'Les sons s’estompent doucement avant la fin',
    stopTimer: 'Arrêter le minuteur',
    custom: 'Personnalisé',
    start: 'Démarrer',
    languageLabel: 'Langue',
  },
  pt: {
    appSubtitle: 'Temporizador de sons para foco e sono',
    'sound.rain': 'Chuva',
    'sound.waves': 'Ondas',
    'sound.white_noise': 'Ruído branco',
    'sound.campfire': 'Fogueira',
    'sound.cafe': 'Café',
    'sound.wind_chimes': 'Sinos de vento',
    'sound.sleeping_breath': 'Respiração de alguém dormindo',
    upgradeBanner: '🔒 Desbloqueie mais {count} sons — pagamento único de {price}',
    footerIdle: 'Escolha um som e toque para reproduzir',
    stopAll: 'Parar tudo',
    paywallEyebrow: 'Desbloqueie todos os sons',
    paywallTitle: 'Pagamento único de {price}',
    paywallBody: 'Sem assinatura. Pague uma vez e use todos os sons extras para sempre.',
    paywallUnlockButton: 'Desbloquear por {price}',
    paywallRestore: 'Restaurar compra',
    paywallClose: 'Fechar',
    actionStop: 'parar',
    actionPlay: 'reproduzir',
    a11yLocked: '{label} é desbloqueado com a compra',
    a11yToggle: '{action} {label}',
    tabFocus: 'Foco',
    tabSleep: 'Sono',
    hintFocusRunning: 'Os sons param quando o temporizador termina',
    hintSleepRunning: 'Os sons desaparecem suavemente antes do fim',
    stopTimer: 'Parar temporizador',
    custom: 'Personalizado',
    start: 'Iniciar',
    languageLabel: 'Idioma',
  },
} satisfies Record<LocaleCode, Record<string, string>>;

export type TranslationKey = keyof (typeof TRANSLATIONS)['ja'];

// 分数表示だけは言語ごとに単位の位置が違う({n}分 / {n} min / {n}分)ので専用に扱う。
const MINUTES_FORMAT: Record<LocaleCode, (n: number) => string> = {
  ja: (n) => `${n}分`,
  en: (n) => `${n} min`,
  es: (n) => `${n} min`,
  ko: (n) => `${n}분`,
  de: (n) => `${n} Min`,
  fr: (n) => `${n} min`,
  pt: (n) => `${n} min`,
};

// 再生中サウンド数の表示は英語・スペイン語などで単数/複数の語尾が変わるので専用に扱う。
const PLAYING_COUNT_FORMAT: Record<LocaleCode, (n: number) => string> = {
  ja: (n) => `${n}個のサウンドを再生中`,
  en: (n) => `${n} sound${n === 1 ? '' : 's'} playing`,
  es: (n) => `${n} sonido${n === 1 ? '' : 's'} reproduciéndose`,
  ko: (n) => `${n}개 재생 중`,
  de: (n) => `${n} Sound${n === 1 ? '' : 's'} läuft`,
  fr: (n) => `${n} son${n === 1 ? '' : 's'} en cours de lecture`,
  pt: (n) => `${n} som${n === 1 ? '' : 's'} tocando`,
};

const STORAGE_KEY = 'nagi.locale.v1';

function detectDeviceLocale(): LocaleCode {
  const locales = Localization.getLocales();
  for (const l of locales) {
    const code = l.languageCode as LocaleCode | null;
    if (code && SUPPORTED_LOCALES.includes(code)) return code;
  }
  return 'en';
}

function fillVars(template: string, vars?: Vars): string {
  if (!vars) return template;
  let text = template;
  for (const [key, value] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return text;
}

export function useI18n() {
  const [locale, setLocaleState] = useState<LocaleCode>('en');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored && SUPPORTED_LOCALES.includes(stored as LocaleCode)) {
          setLocaleState(stored as LocaleCode);
        } else {
          setLocaleState(detectDeviceLocale());
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code);
    AsyncStorage.setItem(STORAGE_KEY, code).catch(() => {});
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Vars) => fillVars(TRANSLATIONS[locale][key], vars),
    [locale]
  );

  const formatMinutes = useCallback((n: number) => MINUTES_FORMAT[locale](n), [locale]);
  const formatPlayingCount = useCallback((n: number) => PLAYING_COUNT_FORMAT[locale](n), [locale]);

  return { locale, setLocale, loading, t, formatMinutes, formatPlayingCount };
}
