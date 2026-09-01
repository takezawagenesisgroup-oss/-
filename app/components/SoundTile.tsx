import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors, radius, spacing } from '../theme';
import type { SoundDef } from '../sounds';

type Props = {
  sound: SoundDef;
  active: boolean;
  volume: number;
  locked: boolean;
  onToggle: (id: string) => void;
  onVolumeChange: (id: string, value: number) => void;
  onLockedPress: () => void;
};

export function SoundTile({ sound, active, volume, locked, onToggle, onVolumeChange, onLockedPress }: Props) {
  return (
    <View style={[styles.card, active && styles.cardActive, locked && styles.cardLocked]}>
      <Pressable
        onPress={() => (locked ? onLockedPress() : onToggle(sound.id))}
        style={styles.pressable}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={locked ? `${sound.label}は購入すると解放されます` : `${sound.label}を${active ? '停止' : '再生'}`}
      >
        {locked ? <Text style={styles.lockBadge}>🔒</Text> : null}
        <Text style={styles.emoji}>{sound.emoji}</Text>
        <Text style={[styles.label, active && styles.labelActive]}>{sound.label}</Text>
        <Text style={styles.sub}>{sound.sub}</Text>
      </Pressable>
      {active ? (
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={volume}
          minimumTrackTintColor={colors.accent2}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.accent2}
          onValueChange={(v) => onVolumeChange(sound.id, v)}
        />
      ) : (
        <View style={styles.sliderPlaceholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingBottom: spacing.sm,
    overflow: 'hidden',
  },
  cardActive: {
    backgroundColor: colors.surfaceActive,
    borderColor: colors.borderActive,
  },
  cardLocked: {
    opacity: 0.7,
  },
  pressable: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  lockBadge: {
    position: 'absolute',
    top: 8,
    right: 10,
    fontSize: 13,
  },
  emoji: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.accent2,
  },
  sub: {
    color: colors.textMuted,
    fontSize: 11,
  },
  slider: {
    width: '86%',
    height: 28,
    alignSelf: 'center',
  },
  sliderPlaceholder: {
    height: 28,
  },
});
