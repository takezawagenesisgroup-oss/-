import { useCallback, useEffect, useState } from 'react';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 隣の多言語対応。凪(app/i18n.ts)と同じパターン。
//
// UI(ボタン・見出し・ペイウォール等)は7言語ぶん用意しているが、キャラの
// 台詞・シチュエーション・天気コメント(personas.ts / situations.ts / weather.ts)は
// 台詞量が多いため、まず日本語+英語のみ翻訳済み(personas.ts の
// PERSONA_TRANSLATIONS 等を参照)。英語以外のUI言語を選んだ場合、UI表示は
// その言語になるが、キャラの発話内容は英語にフォールバックする
// (contentLocale = locale === 'ja' ? 'ja' : 'en')。他言語の台詞を追加する
// 場合は personas.ts / situations.ts / weather.ts の翻訳辞書に言語を足し、
// ここの SUPPORTED_LOCALES はそのまま使い回せる。
//
// 注意: ここでの翻訳はネイティブレビューを経ていない。ストア申請文言は
// 別途ネイティブスピーカーの確認を推奨する。
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

// キャラの発話内容(personas/situations/weather)は今のところ日本語と英語しか
// 用意していないので、UIの表示言語からそのどちらを使うかを決める。
export type ContentLocale = 'ja' | 'en';
export function toContentLocale(locale: LocaleCode): ContentLocale {
  return locale === 'ja' ? 'ja' : 'en';
}

// expo-speechに渡すBCP47言語タグ。
export const SPEECH_LANGUAGE: Record<ContentLocale, string> = {
  ja: 'ja-JP',
  en: 'en-US',
};

type Vars = Record<string, string | number>;

const TRANSLATIONS = {
  ja: {
    appSubtitle: '-Tonari- 一緒に走ってくれる、声の伴走者',
    historyLabel: '📋 履歴',
    modeSectionTitle: 'モード',
    activityRun: 'ランニング',
    activityWalk: 'ウォーキング',
    toneSectionTitle: '口調を選ぶ — {category}',
    categoryHuman: '人物',
    categoryAnimal: 'どうぶつ',
    upgradeBanner: '🔒 「友人」「恋人」「犬」「猫」を解放 — 買い切り{price}',
    situationSectionTitle: 'シチュエーション(任意)',
    situationNone: 'なし',
    weatherSectionTitle: '天気連動(GPS開始時のみ)',
    weatherToggleOn: '✓ 現在地の天気に合わせてコメント',
    weatherToggleOff: '現在地の天気に合わせてコメントする',
    weatherHint: '気温・天候・時間帯(昼/夜)を見て、開始直後に一言添えます。ネットワークが無い場合は通常の声かけのみになります。',
    genderSectionTitle: '声の高さ',
    genderFeminine: '女性寄り',
    genderNeutral: 'ナチュラル',
    genderMasculine: '男性寄り',
    distanceSectionTitle: '目標距離',
    distanceNone: '目標なし',
    permissionDenied: '位置情報の利用が許可されていません。端末の設定からこのアプリの位置情報アクセスを許可してください。',
    startGps: 'GPSで開始',
    startDemo: 'デモで体験(約75秒)',
    demoHint: 'デモは実際に歩かなくても、口調と声の雰囲気を試せるプレビューモードです。',
    statDistance: '距離',
    statElapsed: '経過時間',
    statPace: 'ペース',
    statTime: '時間',
    statAvgPace: '平均ペース',
    speakingNow: '🔊 話しています',
    voiceOf: '{persona}の声',
    runningPlaceholder: '走り始めると、話しかけてくれます。',
    stop: '終了する',
    finishedTitle: 'お疲れさまでした',
    again: 'もう一度',
    paywallEyebrow: '「友人」「恋人」「犬」「猫」を解放',
    paywallTitle: '買い切り {price}',
    paywallBody: 'サブスクなし。一度購入すれば、4つの口調をずっと使えます。声の高さ(女性寄り/男性寄り)はいつでも切り替え可能です。',
    paywallUnlock: '{price} で解放する',
    paywallRestore: '購入を復元',
    paywallClose: '閉じる',
    historyTitle: 'これまでの記録',
    historyEmpty: 'まだ記録がありません。走り終えるとここに残ります。',
    historyWeekSummary: '過去7日間・{count}回',
    historyStreak: '連続記録',
    historyStreakDays: '{n}日',
    historyClear: '履歴を消去',
    historyClose: '閉じる',
    modeRun: 'ラン',
    modeWalk: 'ウォーク',
    languageLabel: '言語',
  },
  en: {
    appSubtitle: '-Tonari- A voice that runs beside you',
    historyLabel: '📋 History',
    modeSectionTitle: 'Mode',
    activityRun: 'Running',
    activityWalk: 'Walking',
    toneSectionTitle: 'Choose a voice — {category}',
    categoryHuman: 'People',
    categoryAnimal: 'Animals',
    upgradeBanner: '🔒 Unlock Friend, Partner, Dog & Cat — one-time {price}',
    situationSectionTitle: 'Situation (optional)',
    situationNone: 'None',
    weatherSectionTitle: 'Weather mode (GPS start only)',
    weatherToggleOn: '✓ Commenting on your local weather',
    weatherToggleOff: 'Comment on the weather where you are',
    weatherHint: 'Adds one line about temperature, conditions, and time of day right after you start. Falls back to normal chatter if there is no network.',
    genderSectionTitle: 'Voice pitch',
    genderFeminine: 'Higher',
    genderNeutral: 'Natural',
    genderMasculine: 'Lower',
    distanceSectionTitle: 'Target distance',
    distanceNone: 'No target',
    permissionDenied: 'Location access is not allowed. Please enable it for this app in your device settings.',
    startGps: 'Start with GPS',
    startDemo: 'Try the demo (~75s)',
    demoHint: 'The demo lets you preview the voice and tone without actually moving.',
    statDistance: 'Distance',
    statElapsed: 'Elapsed',
    statPace: 'Pace',
    statTime: 'Time',
    statAvgPace: 'Avg pace',
    speakingNow: '🔊 Speaking',
    voiceOf: "{persona}'s voice",
    runningPlaceholder: 'Start moving and they will talk to you.',
    stop: 'Stop',
    finishedTitle: 'Great work!',
    again: 'Go again',
    paywallEyebrow: 'Unlock Friend, Partner, Dog & Cat',
    paywallTitle: 'One-time {price}',
    paywallBody: 'No subscription. Pay once and keep all 4 extra voices forever. You can change the voice pitch anytime.',
    paywallUnlock: 'Unlock for {price}',
    paywallRestore: 'Restore purchase',
    paywallClose: 'Close',
    historyTitle: 'Your history',
    historyEmpty: 'No records yet. They will show up here after you finish a session.',
    historyWeekSummary: 'Last 7 days · {count} sessions',
    historyStreak: 'Streak',
    historyStreakDays: '{n} days',
    historyClear: 'Clear history',
    historyClose: 'Close',
    modeRun: 'Run',
    modeWalk: 'Walk',
    languageLabel: 'Language',
  },
  es: {
    appSubtitle: '-Tonari- Una voz que corre a tu lado',
    historyLabel: '📋 Historial',
    modeSectionTitle: 'Modo',
    activityRun: 'Correr',
    activityWalk: 'Caminar',
    toneSectionTitle: 'Elige una voz — {category}',
    categoryHuman: 'Personas',
    categoryAnimal: 'Animales',
    upgradeBanner: '🔒 Desbloquea Amigo, Pareja, Perro y Gato — pago único de {price}',
    situationSectionTitle: 'Situación (opcional)',
    situationNone: 'Ninguna',
    weatherSectionTitle: 'Modo clima (solo al iniciar con GPS)',
    weatherToggleOn: '✓ Comentando el clima de tu ubicación',
    weatherToggleOff: 'Comentar el clima de tu ubicación',
    weatherHint: 'Añade un comentario sobre temperatura, clima y hora del día justo al empezar. Si no hay red, sigue con los comentarios habituales.',
    genderSectionTitle: 'Tono de voz',
    genderFeminine: 'Más agudo',
    genderNeutral: 'Natural',
    genderMasculine: 'Más grave',
    distanceSectionTitle: 'Distancia objetivo',
    distanceNone: 'Sin objetivo',
    permissionDenied: 'No se permitió el acceso a la ubicación. Actívalo para esta app en los ajustes del dispositivo.',
    startGps: 'Empezar con GPS',
    startDemo: 'Probar demo (~75s)',
    demoHint: 'La demo te deja probar la voz y el tono sin moverte de verdad.',
    statDistance: 'Distancia',
    statElapsed: 'Tiempo',
    statPace: 'Ritmo',
    statTime: 'Tiempo',
    statAvgPace: 'Ritmo medio',
    speakingNow: '🔊 Hablando',
    voiceOf: 'Voz de {persona}',
    runningPlaceholder: 'Empieza a moverte y te hablará.',
    stop: 'Terminar',
    finishedTitle: '¡Buen trabajo!',
    again: 'Otra vez',
    paywallEyebrow: 'Desbloquea Amigo, Pareja, Perro y Gato',
    paywallTitle: 'Pago único de {price}',
    paywallBody: 'Sin suscripción. Paga una vez y conserva las 4 voces adicionales para siempre. Puedes cambiar el tono de voz cuando quieras.',
    paywallUnlock: 'Desbloquear por {price}',
    paywallRestore: 'Restaurar compra',
    paywallClose: 'Cerrar',
    historyTitle: 'Tu historial',
    historyEmpty: 'Aún no hay registros. Aparecerán aquí cuando termines una sesión.',
    historyWeekSummary: 'Últimos 7 días · {count} sesiones',
    historyStreak: 'Racha',
    historyStreakDays: '{n} días',
    historyClear: 'Borrar historial',
    historyClose: 'Cerrar',
    modeRun: 'Correr',
    modeWalk: 'Caminar',
    languageLabel: 'Idioma',
  },
  ko: {
    appSubtitle: '-Tonari- 옆에서 함께 달려주는 목소리',
    historyLabel: '📋 기록',
    modeSectionTitle: '모드',
    activityRun: '러닝',
    activityWalk: '워킹',
    toneSectionTitle: '목소리 선택 — {category}',
    categoryHuman: '사람',
    categoryAnimal: '동물',
    upgradeBanner: '🔒 친구·연인·강아지·고양이 해제 — 평생 이용 {price}',
    situationSectionTitle: '상황(선택)',
    situationNone: '없음',
    weatherSectionTitle: '날씨 연동(GPS 시작 시에만)',
    weatherToggleOn: '✓ 현재 위치 날씨에 맞춰 코멘트',
    weatherToggleOff: '현재 위치 날씨에 맞춰 코멘트하기',
    weatherHint: '기온·날씨·시간대(낮/밤)를 보고 시작 직후 한마디 더합니다. 네트워크가 없으면 평소처럼 말을 걸어줍니다.',
    genderSectionTitle: '목소리 톤',
    genderFeminine: '높은 톤',
    genderNeutral: '자연스럽게',
    genderMasculine: '낮은 톤',
    distanceSectionTitle: '목표 거리',
    distanceNone: '목표 없음',
    permissionDenied: '위치 정보 접근이 허용되지 않았습니다. 기기 설정에서 이 앱의 위치 정보 접근을 허용해주세요.',
    startGps: 'GPS로 시작',
    startDemo: '데모 체험(약 75초)',
    demoHint: '데모는 실제로 움직이지 않아도 목소리 톤과 분위기를 미리 들어볼 수 있는 모드입니다.',
    statDistance: '거리',
    statElapsed: '경과 시간',
    statPace: '페이스',
    statTime: '시간',
    statAvgPace: '평균 페이스',
    speakingNow: '🔊 말하는 중',
    voiceOf: '{persona}의 목소리',
    runningPlaceholder: '움직이기 시작하면 말을 걸어줍니다.',
    stop: '종료',
    finishedTitle: '수고하셨습니다',
    again: '다시 하기',
    paywallEyebrow: '친구·연인·강아지·고양이 해제',
    paywallTitle: '평생 이용 {price}',
    paywallBody: '구독 없음. 한 번만 결제하면 4가지 목소리를 계속 사용할 수 있어요. 목소리 톤은 언제든 바꿀 수 있습니다.',
    paywallUnlock: '{price}로 해제하기',
    paywallRestore: '구매 복원',
    paywallClose: '닫기',
    historyTitle: '지금까지의 기록',
    historyEmpty: '아직 기록이 없습니다. 세션을 마치면 여기에 남습니다.',
    historyWeekSummary: '지난 7일 · {count}회',
    historyStreak: '연속 기록',
    historyStreakDays: '{n}일',
    historyClear: '기록 삭제',
    historyClose: '닫기',
    modeRun: '러닝',
    modeWalk: '워킹',
    languageLabel: '언어',
  },
  de: {
    appSubtitle: '-Tonari- Eine Stimme, die neben dir läuft',
    historyLabel: '📋 Verlauf',
    modeSectionTitle: 'Modus',
    activityRun: 'Laufen',
    activityWalk: 'Gehen',
    toneSectionTitle: 'Stimme wählen — {category}',
    categoryHuman: 'Personen',
    categoryAnimal: 'Tiere',
    upgradeBanner: '🔒 Freund, Partner, Hund & Katze freischalten — einmalig {price}',
    situationSectionTitle: 'Situation (optional)',
    situationNone: 'Keine',
    weatherSectionTitle: 'Wettermodus (nur bei GPS-Start)',
    weatherToggleOn: '✓ Kommentiert das Wetter an deinem Standort',
    weatherToggleOff: 'Wetter an deinem Standort kommentieren',
    weatherHint: 'Fügt direkt nach dem Start einen Satz zu Temperatur, Wetter und Tageszeit hinzu. Ohne Netzwerk geht es mit den normalen Ansagen weiter.',
    genderSectionTitle: 'Stimmlage',
    genderFeminine: 'Höher',
    genderNeutral: 'Natürlich',
    genderMasculine: 'Tiefer',
    distanceSectionTitle: 'Zieldistanz',
    distanceNone: 'Kein Ziel',
    permissionDenied: 'Standortzugriff ist nicht erlaubt. Bitte aktiviere ihn für diese App in den Geräteeinstellungen.',
    startGps: 'Mit GPS starten',
    startDemo: 'Demo testen (~75s)',
    demoHint: 'In der Demo kannst du Stimme und Ton ausprobieren, ohne dich wirklich zu bewegen.',
    statDistance: 'Distanz',
    statElapsed: 'Verstrichen',
    statPace: 'Tempo',
    statTime: 'Zeit',
    statAvgPace: 'Ø-Tempo',
    speakingNow: '🔊 Spricht gerade',
    voiceOf: 'Stimme von {persona}',
    runningPlaceholder: 'Fang an, dich zu bewegen, dann wird gesprochen.',
    stop: 'Beenden',
    finishedTitle: 'Gut gemacht!',
    again: 'Nochmal',
    paywallEyebrow: 'Freund, Partner, Hund & Katze freischalten',
    paywallTitle: 'Einmalig {price}',
    paywallBody: 'Kein Abo. Einmal zahlen und alle 4 zusätzlichen Stimmen für immer nutzen. Die Stimmlage kannst du jederzeit ändern.',
    paywallUnlock: 'Für {price} freischalten',
    paywallRestore: 'Kauf wiederherstellen',
    paywallClose: 'Schließen',
    historyTitle: 'Dein Verlauf',
    historyEmpty: 'Noch keine Einträge. Sie erscheinen hier, sobald du eine Session beendest.',
    historyWeekSummary: 'Letzte 7 Tage · {count} Sessions',
    historyStreak: 'Serie',
    historyStreakDays: '{n} Tage',
    historyClear: 'Verlauf löschen',
    historyClose: 'Schließen',
    modeRun: 'Lauf',
    modeWalk: 'Gang',
    languageLabel: 'Sprache',
  },
  fr: {
    appSubtitle: '-Tonari- Une voix qui court à tes côtés',
    historyLabel: '📋 Historique',
    modeSectionTitle: 'Mode',
    activityRun: 'Course',
    activityWalk: 'Marche',
    toneSectionTitle: 'Choisir une voix — {category}',
    categoryHuman: 'Personnes',
    categoryAnimal: 'Animaux',
    upgradeBanner: '🔒 Débloquez Ami, Partenaire, Chien et Chat — paiement unique de {price}',
    situationSectionTitle: 'Situation (facultatif)',
    situationNone: 'Aucune',
    weatherSectionTitle: 'Mode météo (au démarrage GPS uniquement)',
    weatherToggleOn: '✓ Commente la météo de votre position',
    weatherToggleOff: 'Commenter la météo de votre position',
    weatherHint: "Ajoute une phrase sur la température, le temps et le moment de la journée juste après le départ. Sans réseau, les remarques habituelles continuent.",
    genderSectionTitle: 'Hauteur de voix',
    genderFeminine: 'Plus aiguë',
    genderNeutral: 'Naturelle',
    genderMasculine: 'Plus grave',
    distanceSectionTitle: 'Distance cible',
    distanceNone: 'Aucun objectif',
    permissionDenied: "L'accès à la position n'est pas autorisé. Activez-le pour cette application dans les réglages de l'appareil.",
    startGps: 'Démarrer avec le GPS',
    startDemo: 'Essayer la démo (~75s)',
    demoHint: 'La démo permet de découvrir la voix et le ton sans vraiment bouger.',
    statDistance: 'Distance',
    statElapsed: 'Écoulé',
    statPace: 'Allure',
    statTime: 'Temps',
    statAvgPace: 'Allure moy.',
    speakingNow: '🔊 En train de parler',
    voiceOf: 'Voix de {persona}',
    runningPlaceholder: 'Commencez à bouger et on vous parlera.',
    stop: 'Terminer',
    finishedTitle: 'Bien joué !',
    again: 'Recommencer',
    paywallEyebrow: 'Débloquer Ami, Partenaire, Chien et Chat',
    paywallTitle: 'Paiement unique de {price}',
    paywallBody: "Sans abonnement. Payez une fois et gardez les 4 voix supplémentaires pour toujours. Vous pouvez changer la hauteur de voix à tout moment.",
    paywallUnlock: 'Débloquer pour {price}',
    paywallRestore: "Restaurer l'achat",
    paywallClose: 'Fermer',
    historyTitle: 'Votre historique',
    historyEmpty: 'Pas encore de séance. Elles apparaîtront ici une fois terminées.',
    historyWeekSummary: '7 derniers jours · {count} séances',
    historyStreak: 'Série',
    historyStreakDays: '{n} jours',
    historyClear: "Effacer l'historique",
    historyClose: 'Fermer',
    modeRun: 'Course',
    modeWalk: 'Marche',
    languageLabel: 'Langue',
  },
  pt: {
    appSubtitle: '-Tonari- Uma voz que corre ao seu lado',
    historyLabel: '📋 Histórico',
    modeSectionTitle: 'Modo',
    activityRun: 'Corrida',
    activityWalk: 'Caminhada',
    toneSectionTitle: 'Escolha uma voz — {category}',
    categoryHuman: 'Pessoas',
    categoryAnimal: 'Animais',
    upgradeBanner: '🔒 Desbloqueie Amigo, Parceiro, Cão e Gato — pagamento único de {price}',
    situationSectionTitle: 'Situação (opcional)',
    situationNone: 'Nenhuma',
    weatherSectionTitle: 'Modo clima (apenas ao iniciar com GPS)',
    weatherToggleOn: '✓ Comentando o clima da sua localização',
    weatherToggleOff: 'Comentar o clima da sua localização',
    weatherHint: 'Adiciona um comentário sobre temperatura, clima e hora do dia logo após começar. Sem rede, continua com os comentários normais.',
    genderSectionTitle: 'Tom de voz',
    genderFeminine: 'Mais agudo',
    genderNeutral: 'Natural',
    genderMasculine: 'Mais grave',
    distanceSectionTitle: 'Distância alvo',
    distanceNone: 'Sem meta',
    permissionDenied: 'O acesso à localização não foi permitido. Ative-o para este app nas configurações do dispositivo.',
    startGps: 'Iniciar com GPS',
    startDemo: 'Testar demo (~75s)',
    demoHint: 'A demo permite testar a voz e o tom sem se mover de verdade.',
    statDistance: 'Distância',
    statElapsed: 'Decorrido',
    statPace: 'Ritmo',
    statTime: 'Tempo',
    statAvgPace: 'Ritmo médio',
    speakingNow: '🔊 Falando',
    voiceOf: 'Voz de {persona}',
    runningPlaceholder: 'Comece a se mover e você será acompanhado.',
    stop: 'Encerrar',
    finishedTitle: 'Muito bem!',
    again: 'De novo',
    paywallEyebrow: 'Desbloquear Amigo, Parceiro, Cão e Gato',
    paywallTitle: 'Pagamento único de {price}',
    paywallBody: 'Sem assinatura. Pague uma vez e use as 4 vozes extras para sempre. Você pode mudar o tom de voz quando quiser.',
    paywallUnlock: 'Desbloquear por {price}',
    paywallRestore: 'Restaurar compra',
    paywallClose: 'Fechar',
    historyTitle: 'Seu histórico',
    historyEmpty: 'Ainda sem registros. Eles aparecerão aqui após você terminar uma sessão.',
    historyWeekSummary: 'Últimos 7 dias · {count} sessões',
    historyStreak: 'Sequência',
    historyStreakDays: '{n} dias',
    historyClear: 'Limpar histórico',
    historyClose: 'Fechar',
    modeRun: 'Corrida',
    modeWalk: 'Caminhada',
    languageLabel: 'Idioma',
  },
} satisfies Record<LocaleCode, Record<string, string>>;

export type TranslationKey = keyof (typeof TRANSLATIONS)['ja'];

const STORAGE_KEY = 'tonari.locale.v1';

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

  return { locale, setLocale, loading, t, contentLocale: toContentLocale(locale) };
}
