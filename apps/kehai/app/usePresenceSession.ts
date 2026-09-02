import { useCallback, useEffect, useRef, useState } from 'react';
import type { TriggerType } from './personas';

export type SessionState = 'idle' | 'running' | 'finished';

const CHEER_CARE_MIN_INTERVAL_MS = 90_000; // 1分30秒
const CHEER_CARE_MAX_INTERVAL_MS = 240_000; // 4分
const CHEER_WEIGHT = 0.6; // 応援60% / 気遣い40%

export function usePresenceSession(onTrigger: (trigger: TriggerType) => void) {
  const [state, setState] = useState<SessionState>('idle');
  const [durationSec, setDurationSec] = useState(30 * 60);
  const [remainingSec, setRemainingSec] = useState(0);

  const endAtRef = useRef(0);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextLineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    if (nextLineTimerRef.current) clearTimeout(nextLineTimerRef.current);
    tickTimerRef.current = null;
    nextLineTimerRef.current = null;
  }, []);

  // 声かけの間隔をランダムにすることで、毎回同じタイミング・同じ内容に
  // ならないようにする(pickLineAvoidingRepeatと合わせて「マンネリ回避」)。
  const scheduleNextLine = useCallback(() => {
    const delay = CHEER_CARE_MIN_INTERVAL_MS + Math.random() * (CHEER_CARE_MAX_INTERVAL_MS - CHEER_CARE_MIN_INTERVAL_MS);
    nextLineTimerRef.current = setTimeout(() => {
      const trigger: TriggerType = Math.random() < CHEER_WEIGHT ? 'cheer' : 'care';
      onTrigger(trigger);
      scheduleNextLine();
    }, delay);
  }, [onTrigger]);

  const start = useCallback(() => {
    clearTimers();
    endAtRef.current = Date.now() + durationSec * 1000;
    setRemainingSec(durationSec);
    setState('running');
    onTrigger('start');
    scheduleNextLine();
    tickTimerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemainingSec(remaining);
      if (remaining <= 0) {
        clearTimers();
        setState('finished');
        onTrigger('finish');
      }
    }, 500);
  }, [clearTimers, durationSec, onTrigger, scheduleNextLine]);

  const stop = useCallback(() => {
    clearTimers();
    setState('finished');
    onTrigger('finish');
  }, [clearTimers, onTrigger]);

  const reset = useCallback(() => {
    clearTimers();
    setState('idle');
    setRemainingSec(0);
  }, [clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  return { state, durationSec, setDurationSec, remainingSec, start, stop, reset };
}
