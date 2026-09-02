import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { SOUNDS } from '../sounds';
import type { TranslationKey } from '../i18n';

type Props = {
  visible: boolean;
  purchasing: boolean;
  priceLabel: string;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  onUnlock: () => void;
  onRestore: () => void;
  onClose: () => void;
};

export function PaywallModal({ visible, purchasing, priceLabel, t, onUnlock, onRestore, onClose }: Props) {
  const premiumSounds = SOUNDS.filter((s) => !s.free);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.eyebrow}>{t('paywallEyebrow')}</Text>
          <Text style={styles.title}>{t('paywallTitle', { price: priceLabel })}</Text>
          <Text style={styles.body}>{t('paywallBody')}</Text>

          <View style={styles.list}>
            {premiumSounds.map((s) => (
              <View key={s.id} style={styles.listRow}>
                <Text style={styles.listEmoji}>{s.emoji}</Text>
                <Text style={styles.listLabel}>{t(`sound.${s.id}` as TranslationKey)}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={[styles.primaryButton, purchasing && styles.buttonDisabled]}
            onPress={onUnlock}
            disabled={purchasing}
          >
            {purchasing ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Text style={styles.primaryButtonText}>{t('paywallUnlockButton', { price: priceLabel })}</Text>
            )}
          </Pressable>

          <Pressable onPress={onRestore} disabled={purchasing} style={styles.restoreButton}>
            <Text style={styles.restoreText}>{t('paywallRestore')}</Text>
          </Pressable>

          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>{t('paywallClose')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 10, 9, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.accent2,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  body: {
    color: colors.textMuted,
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  list: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  listEmoji: {
    fontSize: 18,
  },
  listLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.bg,
    fontWeight: '800',
    fontSize: 15,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  restoreText: {
    color: colors.accent2,
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  closeText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
