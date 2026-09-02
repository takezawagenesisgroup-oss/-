import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync } from 'expo-audio';
import * as Location from 'expo-location';
import { colors, radius, spacing } from './app/theme';
import { formatClock, formatPace } from './app/format';
import { CATEGORIES, UNLOCK_PRICE_JPY, getPersona, localizePersona, personasByCategory, type ToneId } from './app/personas';
import { SITUATIONS, getSituation, localizeSituation, type SituationId } from './app/situations';
import { useRunSession, type ActivityMode } from './app/useRunSession';
import { useVoiceCompanion, type VoiceGender } from './app/useVoiceCompanion';
import { usePurchase } from './app/purchases';
import { useRunHistory } from './app/history';
import { buildWeatherLine, fetchCurrentWeather } from './app/weather';
import { useI18n, SUPPORTED_LOCALES, LOCALE_LABELS, SPEECH_LANGUAGE } from './app/i18n';
import { PersonaPicker } from './app/components/PersonaPicker';
import { PaywallModal } from './app/components/PaywallModal';
import { HistoryModal } from './app/components/HistoryModal';
import { LanguagePicker } from './app/components/LanguagePicker';

const DISTANCE_PRESETS_KM = [3, 5, 10];
const PRICE_LABEL = `¥${UNLOCK_PRICE_JPY}`;

export default function App() {
  const purchase = usePurchase();
  const history = useRunHistory();
  const i18n = useI18n();
  const { t, contentLocale } = i18n;
  const [toneId, setToneId] = useState<ToneId>('coach');
  const [gender, setGender] = useState<VoiceGender>('neutral');
  const [situationId, setSituationId] = useState<SituationId | null>(null);
  const [weatherEnabled, setWeatherEnabled] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);

  const ACTIVITY_OPTIONS: { id: ActivityMode; label: string }[] = [
    { id: 'run', label: t('activityRun') },
    { id: 'walk', label: t('activityWalk') },
  ];
  const GENDER_OPTIONS: { id: VoiceGender; label: string }[] = [
    { id: 'feminine', label: t('genderFeminine') },
    { id: 'neutral', label: t('genderNeutral') },
    { id: 'masculine', label: t('genderMasculine') },
  ];

  const persona = localizePersona(getPersona(toneId), contentLocale);
  const situation = situationId ? localizeSituation(getSituation(situationId), contentLocale) : null;
  const voice = useVoiceCompanion(persona, gender, situation, SPEECH_LANGUAGE[contentLocale], contentLocale);
  const session = useRunSession(voice.speak);

  // リアルタイム天気連動: GPS開始時に現在地の天気を一度だけ取得し、スタートの
  // 声かけが終わった頃合いを見て天気コメントを追加する。取得に失敗しても
  // 通常の声かけには影響しない(weather.ts参照)。デモモードでは実行しない
  // (実際の位置情報が無いため)。
  async function announceWeatherIfEnabled() {
    if (!weatherEnabled) return;
    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.LocationAccuracy.Balanced });
      const weather = await fetchCurrentWeather(position.coords.latitude, position.coords.longitude);
      if (!weather) return;
      setTimeout(() => {
        voice.speakCustom(buildWeatherLine(weather, contentLocale));
      }, 6000);
    } catch {
      // 位置情報取得やAPI呼び出しに失敗しても、通常のランは続行する
    }
  }

  function handleStartGps() {
    session.startGps();
    announceWeatherIfEnabled();
  }

  const prevSessionStateRef = useRef(session.state);
  useEffect(() => {
    const justFinished = prevSessionStateRef.current !== 'finished' && session.state === 'finished';
    prevSessionStateRef.current = session.state;
    if (!justFinished) return;
    if (session.metrics.distanceKm < 0.05) return; // 数十メートルで即終了した記録は保存しない
    history.addRecord({
      id: `${Date.now()}`,
      endedAt: Date.now(),
      activityMode: session.activityMode,
      toneId,
      distanceKm: session.metrics.distanceKm,
      elapsedSec: session.metrics.elapsedSec,
      avgPaceMinPerKm: session.metrics.avgPaceMinPerKm,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.state]);

  useEffect(() => {
    // 音楽アプリ(Spotify等)を止めずに、声だけを重ねて再生する。
    // iOSはAVAudioSessionのduckOthersでアプリ全体の音声(expo-speechの読み上げ含む)に
    // 確実に適用される。Androidはexpo-speechがオーディオフォーカスを自前で取得しないため、
    // OS標準のTTSエンジンの挙動に委ねるベストエフォートとなる点に留意。
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
    }).catch(() => {
      // 設定に失敗しても読み上げ自体は継続できる
    });
  }, []);

  const isIdle = session.state === 'idle';
  const isRunning = session.state === 'running';
  const isFinished = session.state === 'finished';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>隣</Text>
              <Text style={styles.subtitle}>{t('appSubtitle')}</Text>
            </View>
            <View style={styles.headerActions}>
              <LanguagePicker
                locale={i18n.locale}
                locales={SUPPORTED_LOCALES}
                labels={LOCALE_LABELS}
                onSelect={i18n.setLocale}
                languageLabel={t('languageLabel')}
              />
              {isIdle ? (
                <Pressable style={styles.historyButton} onPress={() => setHistoryVisible(true)}>
                  <Text style={styles.historyButtonText}>{t('historyLabel')}{history.records.length > 0 ? ` (${history.records.length})` : ''}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        {isIdle ? (
          <>
            <Section title={t('modeSectionTitle')}>
              <View style={styles.pillRow}>
                {ACTIVITY_OPTIONS.map((m) => (
                  <Pressable
                    key={m.id}
                    onPress={() => session.setActivityMode(m.id)}
                    style={[styles.pill, session.activityMode === m.id && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, session.activityMode === m.id && styles.pillTextActive]}>{m.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Section>

            {CATEGORIES.map((category) => (
              <Section key={category} title={t('toneSectionTitle', { category: t(category === 'human' ? 'categoryHuman' : 'categoryAnimal') })}>
                <PersonaPicker
                  personas={personasByCategory(category).map((p) => localizePersona(p, contentLocale))}
                  selectedId={toneId}
                  isUnlocked={purchase.isUnlocked}
                  onSelect={setToneId}
                  onLockedPress={() => setPaywallVisible(true)}
                />
              </Section>
            ))}
            {!purchase.loading && !purchase.isUnlocked ? (
              <Pressable style={styles.upgradeBanner} onPress={() => setPaywallVisible(true)}>
                <Text style={styles.upgradeBannerText}>{t('upgradeBanner', { price: PRICE_LABEL })}</Text>
              </Pressable>
            ) : null}

            <Section title={t('situationSectionTitle')}>
              <View style={styles.pillRow}>
                <Pressable onPress={() => setSituationId(null)} style={[styles.pill, situationId === null && styles.pillActive]}>
                  <Text style={[styles.pillText, situationId === null && styles.pillTextActive]}>{t('situationNone')}</Text>
                </Pressable>
                {SITUATIONS.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => setSituationId(s.id as SituationId)}
                    style={[styles.pill, situationId === s.id && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, situationId === s.id && styles.pillTextActive]}>{localizeSituation(s, contentLocale).label}</Text>
                  </Pressable>
                ))}
              </View>
            </Section>

            <Section title={t('weatherSectionTitle')}>
              <Pressable
                onPress={() => setWeatherEnabled((v) => !v)}
                style={[styles.pill, weatherEnabled && styles.pillActive, styles.weatherToggle]}
              >
                <Text style={[styles.pillText, weatherEnabled && styles.pillTextActive]}>
                  {weatherEnabled ? t('weatherToggleOn') : t('weatherToggleOff')}
                </Text>
              </Pressable>
              <Text style={styles.hint}>{t('weatherHint')}</Text>
            </Section>

            <Section title={t('genderSectionTitle')}>
              <View style={styles.pillRow}>
                {GENDER_OPTIONS.map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() => setGender(g.id)}
                    style={[styles.pill, gender === g.id && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, gender === g.id && styles.pillTextActive]}>{g.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Section>

            <Section title={t('distanceSectionTitle')}>
              <View style={styles.pillRow}>
                {DISTANCE_PRESETS_KM.map((km) => (
                  <Pressable
                    key={km}
                    onPress={() => session.setTargetDistanceKm(km)}
                    style={[styles.pill, session.targetDistanceKm === km && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, session.targetDistanceKm === km && styles.pillTextActive]}>{km}km</Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => session.setTargetDistanceKm(null)}
                  style={[styles.pill, session.targetDistanceKm === null && styles.pillActive]}
                >
                  <Text style={[styles.pillText, session.targetDistanceKm === null && styles.pillTextActive]}>{t('distanceNone')}</Text>
                </Pressable>
              </View>
            </Section>

            {session.permissionDenied ? (
              <View style={styles.warnBox}>
                <Text style={styles.warnText}>{t('permissionDenied')}</Text>
              </View>
            ) : null}

            <View style={styles.startRow}>
              <Pressable style={styles.startButtonPrimary} onPress={handleStartGps}>
                <Text style={styles.startButtonPrimaryText}>{t('startGps')}</Text>
              </Pressable>
              <Pressable style={styles.startButtonSecondary} onPress={session.startDemo}>
                <Text style={styles.startButtonSecondaryText}>{t('startDemo')}</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>{t('demoHint')}</Text>
          </>
        ) : null}

        {isRunning ? (
          <>
            <View style={styles.statGrid}>
              <Stat label={t('statDistance')} value={`${session.metrics.distanceKm.toFixed(2)}`} unit="km" />
              <Stat label={t('statElapsed')} value={formatClock(session.metrics.elapsedSec)} unit="" />
              <Stat label={t('statPace')} value={formatPace(session.metrics.currentPaceMinPerKm)} unit="/km" />
            </View>

            <View style={styles.captionCard}>
              <Text style={styles.captionEyebrow}>{voice.speaking ? t('speakingNow') : t('voiceOf', { persona: persona.label })}</Text>
              <Text style={styles.captionText}>{voice.lastSpoken ?? t('runningPlaceholder')}</Text>
            </View>

            <Pressable style={styles.stopButton} onPress={session.stop}>
              <Text style={styles.stopButtonText}>{t('stop')}</Text>
            </Pressable>
          </>
        ) : null}

        {isFinished ? (
          <View style={styles.finishedCard}>
            <Text style={styles.finishedTitle}>{t('finishedTitle')}</Text>
            <View style={styles.statGrid}>
              <Stat label={t('statDistance')} value={`${session.metrics.distanceKm.toFixed(2)}`} unit="km" />
              <Stat label={t('statTime')} value={formatClock(session.metrics.elapsedSec)} unit="" />
              <Stat label={t('statAvgPace')} value={formatPace(session.metrics.avgPaceMinPerKm)} unit="/km" />
            </View>
            <Pressable style={styles.startButtonPrimary} onPress={session.reset}>
              <Text style={styles.startButtonPrimaryText}>{t('again')}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <PaywallModal
        visible={paywallVisible}
        purchasing={purchase.purchasing}
        t={t}
        priceLabel={PRICE_LABEL}
        onUnlock={async () => {
          const success = await purchase.unlock();
          if (success) setPaywallVisible(false);
        }}
        onRestore={async () => {
          const restored = await purchase.restore();
          if (restored) setPaywallVisible(false);
        }}
        onClose={() => setPaywallVisible(false)}
      />

      <HistoryModal
        visible={historyVisible}
        records={history.records}
        onClear={history.clearHistory}
        onClose={() => setHistoryVisible(false)}
        t={t}
        contentLocale={contentLocale}
      />
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>
        {value}
        <Text style={styles.statUnit}>{unit}</Text>
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: Platform.OS === 'android' ? spacing.xl : spacing.md, gap: spacing.lg },
  header: { gap: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { color: colors.text, fontSize: 34, fontWeight: '800', letterSpacing: 2 },
  subtitle: { color: colors.textMuted, fontSize: 13 },
  historyButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
  },
  historyButtonText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },

  section: { gap: spacing.sm },
  sectionTitle: { color: colors.textMuted, fontSize: 12.5, fontWeight: '700', letterSpacing: 0.5 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised },
  pillActive: { borderColor: colors.accent, backgroundColor: colors.surfaceActive },
  pillText: { color: colors.text, fontWeight: '600', fontSize: 13.5 },
  pillTextActive: { color: colors.accent },
  weatherToggle: { alignSelf: 'flex-start', marginBottom: spacing.xs },

  upgradeBanner: { backgroundColor: colors.surfaceRaised, borderRadius: radius.md, borderWidth: 1, borderColor: colors.accent, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  upgradeBannerText: { color: colors.accent, fontWeight: '700', fontSize: 12.5, textAlign: 'center' },

  warnBox: { backgroundColor: colors.surfaceActive, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md, padding: spacing.md },
  warnText: { color: colors.text, fontSize: 12.5, lineHeight: 18 },

  startRow: { gap: spacing.sm },
  startButtonPrimary: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: spacing.sm + 4, alignItems: 'center' },
  startButtonPrimaryText: { color: colors.bg, fontWeight: '800', fontSize: 15 },
  startButtonSecondary: { borderRadius: radius.pill, paddingVertical: spacing.sm + 2, alignItems: 'center', borderWidth: 1, borderColor: colors.accent2 },
  startButtonSecondaryText: { color: colors.accent2, fontWeight: '700', fontSize: 14 },
  hint: { color: colors.textMuted, fontSize: 11.5, textAlign: 'center' },

  statGrid: { flexDirection: 'row', gap: spacing.sm },
  statTile: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', gap: 4 },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statUnit: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  statLabel: { color: colors.textMuted, fontSize: 11 },

  captionCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderActive, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  captionEyebrow: { color: colors.accent, fontSize: 11.5, fontWeight: '700', letterSpacing: 0.5 },
  captionText: { color: colors.text, fontSize: 16, lineHeight: 24 },

  stopButton: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.danger, paddingVertical: spacing.sm + 2, alignItems: 'center' },
  stopButtonText: { color: colors.danger, fontWeight: '700', fontSize: 14 },

  finishedCard: { gap: spacing.md },
  finishedTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
});
