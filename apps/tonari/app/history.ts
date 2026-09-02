import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActivityMode } from './useRunSession';
import type { ToneId } from './personas';

const STORAGE_KEY = 'tonari.history.v1';
const MAX_RECORDS = 50;

export type RunRecord = {
  id: string;
  endedAt: number; // epoch ms
  activityMode: ActivityMode;
  toneId: ToneId;
  distanceKm: number;
  elapsedSec: number;
  avgPaceMinPerKm: number | null;
};

async function loadRecords(): Promise<RunRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useRunHistory() {
  const [records, setRecords] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords()
      .then(setRecords)
      .finally(() => setLoading(false));
  }, []);

  const addRecord = useCallback(async (record: RunRecord) => {
    setRecords((prev) => {
      const next = [record, ...prev].slice(0, MAX_RECORDS);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const clearHistory = useCallback(async () => {
    setRecords([]);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return { records, loading, addRecord, clearHistory };
}

export function summarizeLastDays(records: RunRecord[], days: number): { totalKm: number; count: number } {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = records.filter((r) => r.endedAt >= cutoff);
  return { totalKm: recent.reduce((sum, r) => sum + r.distanceKm, 0), count: recent.length };
}

function dayKey(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// 今日(または昨日)から遡って、記録が途切れず続いている日数
export function computeStreakDays(records: RunRecord[]): number {
  if (records.length === 0) return 0;
  const daysWithRun = new Set(records.map((r) => dayKey(r.endedAt)));
  const today = new Date();
  let cursor = new Date(today);
  if (!daysWithRun.has(dayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1); // 今日まだ走っていなくても、昨日までの連続は数える
    if (!daysWithRun.has(dayKey(cursor.getTime()))) return 0;
  }
  let streak = 0;
  while (daysWithRun.has(dayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function formatRecordDate(epochMs: number): string {
  const d = new Date(epochMs);
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()}(${weekday}) ${hh}:${mm}`;
}
