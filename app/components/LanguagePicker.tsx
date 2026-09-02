import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import type { LocaleCode } from '../i18n';

type Props = {
  locale: LocaleCode;
  locales: LocaleCode[];
  labels: Record<LocaleCode, string>;
  onSelect: (locale: LocaleCode) => void;
  languageLabel: string;
};

export function LanguagePicker({ locale, locales, labels, onSelect, languageLabel }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)} accessibilityLabel={languageLabel}>
        <Text style={styles.triggerText}>{locale.toUpperCase()}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{languageLabel}</Text>
            {locales.map((code) => (
              <Pressable
                key={code}
                style={[styles.row, code === locale && styles.rowActive]}
                onPress={() => {
                  onSelect(code);
                  setOpen(false);
                }}
              >
                <Text style={[styles.rowText, code === locale && styles.rowTextActive]}>{labels[code]}</Text>
                {code === locale ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceRaised,
  },
  triggerText: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 10, 9, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  title: {
    color: colors.textMuted,
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  rowActive: {
    backgroundColor: colors.surfaceActive,
  },
  rowText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowTextActive: {
    color: colors.accent2,
  },
  check: {
    color: colors.accent2,
    fontWeight: '800',
  },
});
