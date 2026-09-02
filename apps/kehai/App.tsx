import React, { useEffect, useState } from 'react';
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync } from 'expo-audio';
import { colors, radius, spacing } from './app/theme';
import { formatClock } from './app/format';
import { CATEGORIES, CATEGORY_LABEL, UNLOCK_PRICE_JPY, getPersona, personasByCategory, type ToneId } from './app/personas';
import { SITUATIONS, getSituation, type SituationId } from './app/situations';
import { usePresenceSession } from './app/usePresenceSession';
import { useVoiceCompanion, type VoiceGender } from './app/useVoiceCompanion';
import { useAmbientPresence } from './app/useAmbientPresence';
import { usePurchase, useAiChatPurchase } from './app/purchases';
import { PersonaPicker } from './app/components/PersonaPicker';
import { PaywallModal } from './app/components/PaywallModal';
import { ChatPaywallModal } from './app/components/ChatPaywallModal';
import { ChatModal } from './app/components/ChatModal';

const DURATION_PRESETS = [
  { label: 'お試し5分', sec: 5 * 60 },
  { label: '30分', sec: 30 * 60 },
  { label: '1時間', sec: 60 * 60 },
  { label: '2時間', sec: 120 * 60 },
];
const GENDER_OPTIONS: { id: VoiceGender; label: string }[] = [
  { id: 'feminine', label: '女性寄り' },
  { id: 'neutral', label: 'ナチュラル' },
  { id: 'masculine', label: '男性寄り' },
];

export default function App() {
  const purchase = usePurchase();
  const aiChatPurchase = useAiChatPurchase();
  const ambient = useAmbientPresence();
  const [toneId, setToneId] = useState<ToneId>('seiso');
  const [gender, setGender] = useState<VoiceGender>('neutral');
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [chatPaywallVisible, setChatPaywallVisible] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);

  const persona = getPersona(toneId);
  const session = usePresenceSession((event) => voice.speak(event));
  const situation = session.situationId ? getSituation(session.situationId) : null;
  const voice = useVoiceCompanion(persona, gender, situation);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
    }).catch(() => {});
  }, []);

  const isIdle = session.state === 'idle';
  const isRunning = session.state === 'running';
  const isFinished = session.state === 'finished';

  function handleStart() {
    ambient.start();
    session.start();
  }

  function handleStop() {
    ambient.stop();
    voice.stop();
    session.stop();
  }

  function handleReset() {
    session.reset();
  }

  function handleOpenChat() {
    if (aiChatPurchase.isUnlocked) {
      setChatVisible(true);
    } else {
      setChatPaywallVisible(true);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>気配</Text>
          <Text style={styles.subtitle}>-Kehai- 隣にいるような、声と息づかい</Text>
        </View>

        {isIdle ? (
          <>
            {CATEGORIES.map((category) => (
              <Section key={category} title={CATEGORY_LABEL[category]}>
                <PersonaPicker
                  personas={personasByCategory(category)}
                  selectedId={toneId}
                  isUnlocked={purchase.isUnlocked}
                  onSelect={setToneId}
                  onLockedPress={() => setPaywallVisible(true)}
                />
              </Section>
            ))}
            {!purchase.loading && !purchase.isUnlocked ? (
              <Pressable style={styles.upgradeBanner} onPress={() => setPaywallVisible(true)}>
                <Text style={styles.upgradeBannerText}>🔒 清楚系以外の8キャラを解放 — 買い切り¥{UNLOCK_PRICE_JPY}</Text>
              </Pressable>
            ) : null}

            <Section title="シチュエーション(任意)">
              <View style={styles.pillRow}>
                <Pressable onPress={() => session.setSituationId(null)} style={[styles.pill, session.situationId === null && styles.pillActive]}>
                  <Text style={[styles.pillText, session.situationId === null && styles.pillTextActive]}>なし</Text>
                </Pressable>
                {SITUATIONS.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => session.setSituationId(s.id as SituationId)}
                    style={[styles.pill, session.situationId === s.id && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, session.situationId === s.id && styles.pillTextActive]}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Section>

            <Section title="声の高さ">
              <View style={styles.pillRow}>
                {GENDER_OPTIONS.map((g) => (
                  <Pressable key={g.id} onPress={() => setGender(g.id)} style={[styles.pill, gender === g.id && styles.pillActive]}>
                    <Text style={[styles.pillText, gender === g.id && styles.pillTextActive]}>{g.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Section>

            <Section title="時間">
              <View style={styles.pillRow}>
                {DURATION_PRESETS.map((d) => (
                  <Pressable
                    key={d.sec}
                    onPress={() => session.setDurationSec(d.sec)}
                    style={[styles.pill, session.durationSec === d.sec && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, session.durationSec === d.sec && styles.pillTextActive]}>{d.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Section>

            <Pressable style={styles.startButton} onPress={handleStart}>
              <Text style={styles.startButtonText}>はじめる</Text>
            </Pressable>
            <Text style={styles.hint}>呼吸の音を土台に、時々声をかけたり、伸びやため息などの生活音が挟まります。</Text>
          </>
        ) : null}

        {isRunning ? (
          <>
            <View style={styles.clockCard}>
              <Text style={styles.clockValue}>{formatClock(session.remainingSec)}</Text>
              <Text style={styles.clockLabel}>残り時間</Text>
            </View>

            <View style={styles.captionCard}>
              <Text style={styles.captionEyebrow}>{voice.speaking ? '🔊 話しています' : `${persona.label}`}</Text>
              <Text style={styles.captionText}>{voice.lastSpoken ?? '静かに、隣にいます。'}</Text>
            </View>

            <Pressable style={styles.chatButton} onPress={handleOpenChat}>
              <Text style={styles.chatButtonText}>{aiChatPurchase.isUnlocked ? '💬 AIと話す' : '🔒 AIと話す(¥300)'}</Text>
            </Pressable>

            <Pressable style={styles.stopButton} onPress={handleStop}>
              <Text style={styles.stopButtonText}>終了する</Text>
            </Pressable>
          </>
        ) : null}

        {isFinished ? (
          <View style={styles.finishedCard}>
            <Text style={styles.finishedTitle}>お疲れさまでした</Text>
            <Text style={styles.finishedBody}>{persona.label}が、今日もそばにいました。</Text>
            <Pressable style={styles.startButton} onPress={handleReset}>
              <Text style={styles.startButtonText}>もう一度</Text>
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

      <ChatPaywallModal
        visible={chatPaywallVisible}
        purchasing={aiChatPurchase.purchasing}
        onUnlock={async () => {
          const success = await aiChatPurchase.unlock();
          if (success) {
            setChatPaywallVisible(false);
            setChatVisible(true);
          }
        }}
        onRestore={async () => {
          const restored = await aiChatPurchase.restore();
          if (restored) setChatPaywallVisible(false);
        }}
        onClose={() => setChatPaywallVisible(false)}
      />

      <ChatModal
        visible={chatVisible}
        personaLabel={persona.label}
        onClose={() => setChatVisible(false)}
        onSpeak={(text) => voice.speakCustom(text)}
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
  pillActive: { borderColor: colors.accent2, backgroundColor: colors.surfaceActive },
  pillText: { color: colors.text, fontWeight: '600', fontSize: 13.5 },
  pillTextActive: { color: colors.accent2 },

  upgradeBanner: { backgroundColor: colors.surfaceRaised, borderRadius: radius.md, borderWidth: 1, borderColor: colors.accent2, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  upgradeBannerText: { color: colors.accent2, fontWeight: '700', fontSize: 12.5, textAlign: 'center' },

  startButton: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: spacing.sm + 4, alignItems: 'center' },
  startButtonText: { color: colors.bg, fontWeight: '800', fontSize: 15 },
  hint: { color: colors.textMuted, fontSize: 11.5, textAlign: 'center' },

  clockCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingVertical: spacing.lg, alignItems: 'center', gap: 4 },
  clockValue: { color: colors.text, fontSize: 40, fontWeight: '800', fontVariant: ['tabular-nums'] },
  clockLabel: { color: colors.textMuted, fontSize: 12 },

  captionCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderActive, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  captionEyebrow: { color: colors.accent2, fontSize: 11.5, fontWeight: '700', letterSpacing: 0.5 },
  captionText: { color: colors.text, fontSize: 16, lineHeight: 24 },

  chatButton: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.accent2, paddingVertical: spacing.sm + 2, alignItems: 'center' },
  chatButtonText: { color: colors.accent2, fontWeight: '700', fontSize: 14 },

  stopButton: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.danger, paddingVertical: spacing.sm + 2, alignItems: 'center' },
  stopButtonText: { color: colors.danger, fontWeight: '700', fontSize: 14 },

  finishedCard: { gap: spacing.md },
  finishedTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  finishedBody: { color: colors.textMuted, fontSize: 13.5 },
});
