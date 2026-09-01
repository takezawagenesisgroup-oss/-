import React, { useEffect } from 'react';
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync } from 'expo-audio';
import { SOUNDS } from './app/sounds';
import { colors, radius, spacing } from './app/theme';
import { useSoundEngine } from './app/useSoundEngine';
import { SoundTile } from './app/components/SoundTile';
import { TimerPanel } from './app/components/TimerPanel';

export default function App() {
  const engine = useSoundEngine();

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {
      // 音声モードの設定に失敗しても、フォアグラウンド再生自体は継続できる
    });
  }, []);

  const activeCount = engine.activeIds.size;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>凪</Text>
          <Text style={styles.subtitle}>集中と眠りのサウンドタイマー</Text>
        </View>

        <View style={styles.grid}>
          {SOUNDS.map((sound) => (
            <SoundTile
              key={sound.id}
              sound={sound}
              active={engine.activeIds.has(sound.id)}
              volume={engine.volumes[sound.id]}
              onToggle={engine.toggle}
              onVolumeChange={engine.setVolume}
            />
          ))}
        </View>

        <TimerPanel stopAll={engine.stopAll} fadeOutAndStop={engine.fadeOutAndStop} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {activeCount > 0 ? `${activeCount}個のサウンドを再生中` : '音を選んでタップすると再生します'}
          </Text>
          {activeCount > 0 ? (
            <Pressable onPress={engine.stopAll} style={styles.stopAllButton}>
              <Text style={styles.stopAllText}>全て停止</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    padding: spacing.lg,
    paddingTop: Platform.OS === 'android' ? spacing.xl : spacing.md,
    gap: spacing.lg,
  },
  header: {
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 2,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 13,
    flexShrink: 1,
  },
  stopAllButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  stopAllText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 12,
  },
});
