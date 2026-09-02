import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { formatClock, formatPace } from '../format';
import { computeStreakDays, formatRecordDate, summarizeLastDays, type RunRecord } from '../history';
import { getPersona, localizePersona } from '../personas';
import type { TranslationKey } from '../i18n';

type Props = {
  visible: boolean;
  records: RunRecord[];
  onClear: () => void;
  onClose: () => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  contentLocale: 'ja' | 'en';
};

export function HistoryModal({ visible, records, onClear, onClose, t, contentLocale }: Props) {
  const modeLabel = { run: t('modeRun'), walk: t('modeWalk'), cycle: t('modeCycle') } as const;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.headRow}>
            <Text style={styles.title}>{t('historyTitle')}</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeText}>{t('historyClose')}</Text>
            </Pressable>
          </View>

          {records.length === 0 ? (
            <Text style={styles.empty}>{t('historyEmpty')}</Text>
          ) : (
            <>
              <SummaryRow records={records} t={t} />
              <FlatList
              data={records}
              keyExtractor={(r) => r.id}
              style={styles.list}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowDate}>{formatRecordDate(item.endedAt)}</Text>
                    <Text style={styles.rowMeta}>
                      {modeLabel[item.activityMode]} ・ {localizePersona(getPersona(item.toneId), contentLocale).label}
                    </Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.rowStat}>{item.distanceKm.toFixed(2)}km</Text>
                    <Text style={styles.rowStatMuted}>
                      {formatClock(item.elapsedSec)} ・ {formatPace(item.avgPaceMinPerKm)}/km
                    </Text>
                  </View>
                </View>
              )}
              />
            </>
          )}

          {records.length > 0 ? (
            <Pressable onPress={onClear} style={styles.clearButton}>
              <Text style={styles.clearText}>{t('historyClear')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function SummaryRow({ records, t }: { records: RunRecord[]; t: (key: TranslationKey, vars?: Record<string, string | number>) => string }) {
  const week = summarizeLastDays(records, 7);
  const streak = computeStreakDays(records);
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryTile}>
        <Text style={styles.summaryValue}>{week.totalKm.toFixed(1)}km</Text>
        <Text style={styles.summaryLabel}>{t('historyWeekSummary', { count: week.count })}</Text>
      </View>
      <View style={styles.summaryTile}>
        <Text style={styles.summaryValue}>{t('historyStreakDays', { n: streak })}</Text>
        <Text style={styles.summaryLabel}>{t('historyStreak')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,8,6,0.72)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  sheet: { width: '100%', maxWidth: 380, maxHeight: '80%', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  closeText: { color: colors.textMuted, fontSize: 13 },
  empty: { color: colors.textMuted, fontSize: 13.5, lineHeight: 20 },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryTile: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    gap: 2,
  },
  summaryValue: { color: colors.accent, fontSize: 17, fontWeight: '800' },
  summaryLabel: { color: colors.textMuted, fontSize: 10.5 },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLeft: { gap: 2 },
  rowDate: { color: colors.text, fontSize: 13.5, fontWeight: '700' },
  rowMeta: { color: colors.textMuted, fontSize: 11.5 },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  rowStat: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  rowStatMuted: { color: colors.textMuted, fontSize: 11 },
  clearButton: { alignItems: 'center', paddingTop: spacing.xs },
  clearText: { color: colors.danger, fontSize: 12.5, fontWeight: '600' },
});
