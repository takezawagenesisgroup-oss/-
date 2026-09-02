import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { formatClock, formatPace } from '../format';
import { computeStreakDays, formatRecordDate, summarizeLastDays, type RunRecord } from '../history';
import { getPersona } from '../personas';

type Props = {
  visible: boolean;
  records: RunRecord[];
  onClear: () => void;
  onClose: () => void;
};

const MODE_LABEL = { run: 'ラン', walk: 'ウォーク' } as const;

export function HistoryModal({ visible, records, onClear, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.headRow}>
            <Text style={styles.title}>これまでの記録</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeText}>閉じる</Text>
            </Pressable>
          </View>

          {records.length === 0 ? (
            <Text style={styles.empty}>まだ記録がありません。走り終えるとここに残ります。</Text>
          ) : (
            <>
              <SummaryRow records={records} />
              <FlatList
              data={records}
              keyExtractor={(r) => r.id}
              style={styles.list}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowDate}>{formatRecordDate(item.endedAt)}</Text>
                    <Text style={styles.rowMeta}>
                      {MODE_LABEL[item.activityMode]} ・ {getPersona(item.toneId).label}
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
              <Text style={styles.clearText}>履歴を消去</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function SummaryRow({ records }: { records: RunRecord[] }) {
  const week = summarizeLastDays(records, 7);
  const streak = computeStreakDays(records);
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryTile}>
        <Text style={styles.summaryValue}>{week.totalKm.toFixed(1)}km</Text>
        <Text style={styles.summaryLabel}>過去7日間・{week.count}回</Text>
      </View>
      <View style={styles.summaryTile}>
        <Text style={styles.summaryValue}>{streak}日</Text>
        <Text style={styles.summaryLabel}>連続記録</Text>
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
