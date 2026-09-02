import React, { useEffect, useState } from 'react';
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync } from 'expo-audio';
import { SOUNDS, UNLOCK_PRICE_JPY } from './app/sounds';
import { colors, radius, spacing } from './app/theme';
import { useSoundEngine } from './app/useSoundEngine';
import { usePurchase } from './app/purchases';
import { useI18n, SUPPORTED_LOCALES, LOCALE_LABELS, type TranslationKey } from './app/i18n';
import { SoundTile } from './app/components/SoundTile';
import { TimerPanel } from './app/components/TimerPanel';
import { PaywallModal } from './app/components/PaywallModal';
import { LanguagePicker } from './app/components/LanguagePicker';

const PRICE_LABEL = `¥${UNLOCK_PRICE_JPY}`;

export default function App() {
  const engine = useSoundEngine();
  const purchase = usePurchase();
  const i18n = useI18n();
  const { t } = i18n;
  const [paywallVisible, setPaywallVisible] = useState(false);

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
          <View style={styles.headerRow}>
            <Text style={styles.title}>凪</Text>
            <LanguagePicker
              locale={i18n.locale}
              locales={SUPPORTED_LOCALES}
              labels={LOCALE_LABELS}
              onSelect={i18n.setLocale}
              languageLabel={t('languageLabel')}
            />
          </View>
          <Text style={styles.subtitle}>{t('appSubtitle')}</Text>
        </View>

        <View style={styles.grid}>
          {SOUNDS.map((sound) => (
            <SoundTile
              key={sound.id}
              sound={sound}
              label={t(`sound.${sound.id}` as TranslationKey)}
              active={engine.activeIds.has(sound.id)}
              volume={engine.volumes[sound.id]}
              locked={!sound.free && !purchase.isUnlocked}
              onToggle={engine.toggle}
              onVolumeChange={engine.setVolume}
              onLockedPress={() => setPaywallVisible(true)}
              t={t}
            />
          ))}
        </View>

        {!purchase.loading && !purchase.isUnlocked ? (
          <Pressable style={styles.upgradeBanner} onPress={() => setPaywallVisible(true)}>
            <Text style={styles.upgradeBannerText}>
              {t('upgradeBanner', { count: SOUNDS.filter((s) => !s.free).length, price: PRICE_LABEL })}
            </Text>
          </Pressable>
        ) : null}

        <TimerPanel stopAll={engine.stopAll} fadeOutAndStop={engine.fadeOutAndStop} t={t} formatMinutes={i18n.formatMinutes} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>{activeCount > 0 ? i18n.formatPlayingCount(activeCount) : t('footerIdle')}</Text>
          {activeCount > 0 ? (
            <Pressable onPress={engine.stopAll} style={styles.stopAllButton}>
              <Text style={styles.stopAllText}>{t('stopAll')}</Text>
            </Pressable>
          ) : null}
        </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  upgradeBanner: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  upgradeBannerText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
});
