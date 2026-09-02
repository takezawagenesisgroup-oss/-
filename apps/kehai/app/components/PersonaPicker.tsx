import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import type { Persona, ToneId } from '../personas';

type Props = {
  personas: Persona[];
  selectedId: ToneId;
  isUnlocked: boolean;
  onSelect: (id: ToneId) => void;
  onLockedPress: () => void;
};

export function PersonaPicker({ personas, selectedId, isUnlocked, onSelect, onLockedPress }: Props) {
  return (
    <View style={styles.grid}>
      {personas.map((persona) => {
        const locked = !persona.free && !isUnlocked;
        const active = persona.id === selectedId;
        return (
          <Pressable
            key={persona.id}
            onPress={() => (locked ? onLockedPress() : onSelect(persona.id))}
            style={[styles.card, active && styles.cardActive, locked && styles.cardLocked]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            {locked ? <Text style={styles.lockBadge}>🔒</Text> : null}
            <Text style={[styles.label, active && styles.labelActive]}>{persona.label}</Text>
            <Text style={styles.tagline}>{persona.tagline}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 96,
  },
  cardActive: { backgroundColor: colors.surfaceActive, borderColor: colors.borderActive },
  cardLocked: { opacity: 0.7 },
  lockBadge: { position: 'absolute', top: 8, right: 10, fontSize: 12 },
  label: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 6 },
  labelActive: { color: colors.accent2 },
  tagline: { color: colors.textMuted, fontSize: 11.5, lineHeight: 16 },
});
