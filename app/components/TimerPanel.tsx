import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { formatClock, useCountdown } from '../useCountdown';

const FOCUS_PRESETS_MIN = [25, 50];
const SLEEP_PRESETS_MIN = [15, 30, 45, 60];
const SLEEP_FADE_MS = 60_000;

type Mode = 'focus' | 'sleep';

type Props = {
  stopAll: () => void;
  fadeOutAndStop: (durationMs: number) => void;
};

export function TimerPanel({ stopAll, fadeOutAndStop }: Props) {
  const [mode, setMode] = useState<Mode>('focus');
  const [customMinutes, setCustomMinutes] = useState(90);
  const [customOpen, setCustomOpen] = useState(false);
  const { remainingMs, totalMs, running, start, stop } = useCountdown();
  const modeAtStartRef = useRef<Mode>('focus');
  const fadeTriggeredRef = useRef(false);

  // 就寝タイマーは終了60秒前(短いタイマーなら残り半分)から音量をフェードアウトする
  useEffect(() => {
    if (mode !== 'sleep' || !running || fadeTriggeredRef.current) return;
    const fadeWindow = Math.min(SLEEP_FADE_MS, totalMs / 2);
    if (remainingMs <= fadeWindow) {
      fadeTriggeredRef.current = true;
      fadeOutAndStop(fadeWindow);
    }
  }, [mode, running, remainingMs, totalMs, fadeOutAndStop]);

  const progress = totalMs > 0 ? 1 - remainingMs / totalMs : 0;
  const presets = mode === 'focus' ? FOCUS_PRESETS_MIN : SLEEP_PRESETS_MIN;

  function beginTimer(minutes: number) {
    modeAtStartRef.current = mode;
    fadeTriggeredRef.current = false;
    setCustomOpen(false);
    start(minutes * 60_000, () => {
      if (modeAtStartRef.current === 'focus') {
        stopAll();
      }
    });
  }

  function handleStop() {
    stop();
    stopAll();
  }

  function switchMode(next: Mode) {
    if (running) return;
    setMode(next);
    setCustomOpen(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <ModeTab label="集中" active={mode === 'focus'} disabled={running} onPress={() => switchMode('focus')} />
        <ModeTab label="就寝" active={mode === 'sleep'} disabled={running} onPress={() => switchMode('sleep')} />
      </View>

      {running ? (
        <View style={styles.runningBlock}>
          <Text style={styles.clock}>{formatClock(remainingMs)}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, progress * 100)}%` }]} />
          </View>
          <Text style={styles.runningHint}>
            {mode === 'focus' ? '終了時にサウンドを止めます' : '終了前にゆっくりフェードアウトします'}
          </Text>
          <Pressable style={styles.stopButton} onPress={handleStop}>
            <Text style={styles.stopButtonText}>タイマーを止める</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.presetsRow}>
            {presets.map((m) => (
              <Pressable key={m} style={styles.chip} onPress={() => beginTimer(m)}>
                <Text style={styles.chipText}>{m}分</Text>
              </Pressable>
            ))}
            <Pressable
              style={[styles.chip, customOpen && styles.chipActive]}
              onPress={() => setCustomOpen((v) => !v)}
            >
              <Text style={styles.chipText}>カスタム</Text>
            </Pressable>
          </View>

          {customOpen ? (
            <View style={styles.customRow}>
              <Pressable style={styles.stepButton} onPress={() => setCustomMinutes((v) => Math.max(5, v - 5))}>
                <Text style={styles.stepButtonText}>−5</Text>
              </Pressable>
              <Text style={styles.customMinutes}>{customMinutes}分</Text>
              <Pressable style={styles.stepButton} onPress={() => setCustomMinutes((v) => Math.min(240, v + 5))}>
                <Text style={styles.stepButtonText}>+5</Text>
              </Pressable>
              <Pressable style={styles.startButton} onPress={() => beginTimer(customMinutes)}>
                <Text style={styles.startButtonText}>開始</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

function ModeTab({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.surfaceActive,
  },
  tabText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: colors.accent2,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  chipActive: {
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  customMinutes: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 48,
    textAlign: 'center',
  },
  startButton: {
    marginLeft: 'auto',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  startButtonText: {
    color: colors.bg,
    fontWeight: '700',
  },
  runningBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  clock: {
    color: colors.text,
    fontSize: 44,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent2,
  },
  runningHint: {
    color: colors.textMuted,
    fontSize: 12,
  },
  stopButton: {
    marginTop: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  stopButtonText: {
    color: colors.danger,
    fontWeight: '700',
  },
});
