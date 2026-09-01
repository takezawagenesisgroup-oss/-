import React, { useState } from 'react';
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, radius, spacing } from './app/theme';
import { PERSONAS, UNLOCK_PRICE_JPY, getPersona, type ToneId } from './app/personas';
import { useRunSession } from './app/useRunSession';
import { useVoiceCompanion, type VoiceGender } from './app/useVoiceCompanion';
import { usePurchase } from './app/purchases';
import { PersonaPicker } from './app/components/PersonaPicker';
import { PaywallModal } from './app/components/PaywallModal';

const DISTANCE_PRESETS_KM = [3, 5, 10];
const GENDER_OPTIONS: { id: VoiceGender; label: string }[] = [
  { id: 'feminine', label: '女性寄り' },
  { id: 'neutral', label: 'ナチュラル' },
  { id: 'masculine', label: '男性寄り' },
];

function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function formatPace(paceMinPerKm: number | null): string {
  if (paceMinPerKm === null || !Number.isFinite(paceMinPerKm)) return '--\'--"';
  const totalSec = Math.round(paceMinPerKm * 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}'${s.toString().padStart(2, '0')}"`;
}

export default function App() {
  const purchase = usePurchase();
  const [toneId, setToneId] = useState<ToneId>('coach');
  const [gender, setGender] = useState<VoiceGender>('neutral');
  const [paywallVisible, setPaywallVisible] = useState(false);

  const persona = getPersona(toneId);
  const voice = useVoiceCompanion(persona, gender);
  const session = useRunSession(voice.speak);

  const isIdle = session.state === 'idle';
  const isRunning = session.state === 'running';
  const isFinished = session.state === 'finished';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>隣</Text>
          <Text style={styles.subtitle}>-Tonari- 一緒に走ってくれる、声の伴走者</Text>
        </View>

        {isIdle ? (
          <>
            <Section title="口調を選ぶ">
              <PersonaPicker
                personas={PERSONAS}
                selectedId={toneId}
                isUnlocked={purchase.isUnlocked}
                onSelect={setToneId}
                onLockedPress={() => setPaywallVisible(true)}
              />
              {!purchase.loading && !purchase.isUnlocked ? (
                <Pressable style={styles.upgradeBanner} onPress={() => setPaywallVisible(true)}>
                  <Text style={styles.upgradeBannerText}>🔒 「友人」「恋人」を解放 — 買い切り¥{UNLOCK_PRICE_JPY}</Text>
                </Pressable>
              ) : null}
            </Section>

            <Section title="声の高さ">
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

            <Section title="目標距離">
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
                  <Text style={[styles.pillText, session.targetDistanceKm === null && styles.pillTextActive]}>目標なし</Text>
                </Pressable>
              </View>
            </Section>

            {session.permissionDenied ? (
              <View style={styles.warnBox}>
                <Text style={styles.warnText}>位置情報の利用が許可されていません。端末の設定からこのアプリの位置情報アクセスを許可してください。</Text>
              </View>
            ) : null}

            <View style={styles.startRow}>
              <Pressable style={styles.startButtonPrimary} onPress={session.startGps}>
                <Text style={styles.startButtonPrimaryText}>GPSで開始</Text>
              </Pressable>
              <Pressable style={styles.startButtonSecondary} onPress={session.startDemo}>
                <Text style={styles.startButtonSecondaryText}>デモで体験(約75秒)</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>デモは実際に歩かなくても、口調と声の雰囲気を試せるプレビューモードです。</Text>
          </>
        ) : null}

        {isRunning ? (
          <>
            <View style={styles.statGrid}>
              <Stat label="距離" value={`${session.metrics.distanceKm.toFixed(2)}`} unit="km" />
              <Stat label="経過時間" value={formatClock(session.metrics.elapsedSec)} unit="" />
              <Stat label="ペース" value={formatPace(session.metrics.currentPaceMinPerKm)} unit="/km" />
            </View>

            <View style={styles.captionCard}>
              <Text style={styles.captionEyebrow}>{voice.speaking ? '🔊 話しています' : `${persona.label}の声`}</Text>
              <Text style={styles.captionText}>{voice.lastSpoken ?? '走り始めると、話しかけてくれます。'}</Text>
            </View>

            <Pressable style={styles.stopButton} onPress={session.stop}>
              <Text style={styles.stopButtonText}>終了する</Text>
            </Pressable>
          </>
        ) : null}

        {isFinished ? (
          <View style={styles.finishedCard}>
            <Text style={styles.finishedTitle}>お疲れさまでした</Text>
            <View style={styles.statGrid}>
              <Stat label="距離" value={`${session.metrics.distanceKm.toFixed(2)}`} unit="km" />
              <Stat label="時間" value={formatClock(session.metrics.elapsedSec)} unit="" />
              <Stat label="平均ペース" value={formatPace(session.metrics.avgPaceMinPerKm)} unit="/km" />
            </View>
            <Pressable style={styles.startButtonPrimary} onPress={session.reset}>
              <Text style={styles.startButtonPrimaryText}>もう一度</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <PaywallModal
        visible={paywallVisible}
        purchasing={purchase.purchasing}
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
  title: { color: colors.text, fontSize: 34, fontWeight: '800', letterSpacing: 2 },
  subtitle: { color: colors.textMuted, fontSize: 13 },

  section: { gap: spacing.sm },
  sectionTitle: { color: colors.textMuted, fontSize: 12.5, fontWeight: '700', letterSpacing: 0.5 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised },
  pillActive: { borderColor: colors.accent, backgroundColor: colors.surfaceActive },
  pillText: { color: colors.text, fontWeight: '600', fontSize: 13.5 },
  pillTextActive: { color: colors.accent },

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
