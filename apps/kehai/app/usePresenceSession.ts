import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpeakEvent } from './useVoiceCompanion';
import type { SituationId } from './situations';

export type SessionState = 'idle' | 'running' | 'finished';

const LINE_MIN_INTERVAL_MS = 90_000; // 1分30秒
const LINE_MAX_INTERVAL_MS = 240_000; // 4分

export function usePresenceSession(onTrigger: (event: SpeakEvent) => void) {
  const [state, setState] = useState<SessionState>('idle');
  const [durationSec, setDurationSec] = useState(30 * 60);
  const [remainingSec, setRemainingSec] = useState(0);
  const [situationId, setSituationId] = useState<SituationId | null>(null);

  const endAtRef = useRef(0);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextLineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const situationIdRef = useRef<SituationId | null>(null);
  situationIdRef.current = situationId;

  const clearTimers = useCallback(() => {
    if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    if (nextLineTimerRef.current) clearTimeout(nextLineTimerRef.current);
    tickTimerRef.current = null;
    nextLineTimerRef.current = null;
  }, []);

  // 声かけの間隔をランダムにすることで、毎回同じタイミング・同じ内容に
  // ならないようにする。シチュエーションを選んでいる場合は、応援/気遣いに
  // 加えてシチュエーション別の一言も混ぜる。
  const scheduleNextLine = useCallback(() => {
    const delay = LINE_MIN_INTERVAL_MS + Math.random() * (LINE_MAX_INTERVAL_MS - LINE_MIN_INTERVAL_MS);
    nextLineTimerRef.current = setTimeout(() => {
      const hasSituation = situationIdRef.current !== null;
      const roll = Math.random();
      let event: SpeakEvent;
      if (hasSituation && roll < 0.2) {
        event = { kind: 'situational' };
      } else if (roll < (hasSituation ? 0.2 + 0.48 : 0.6)) {
        event = { kind: 'persona', trigger: 'cheer' };
      } else {
        event = { kind: 'persona', trigger: 'care' };
      }
      onTrigger(event);
      scheduleNextLine();
    }, delay);
  }, [onTrigger]);

  const start = useCallback(() => {
    clearTimers();
    endAtRef.current = Date.now() + durationSec * 1000;
    setRemainingSec(durationSec);
    setState('running');
    onTrigger({ kind: 'persona', trigger: 'start' });
    scheduleNextLine();
    tickTimerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemainingSec(remaining);
      if (remaining <= 0) {
        clearTimers();
        setState('finished');
        onTrigger({ kind: 'persona', trigger: 'finish' });
      }
    }, 500);
  }, [clearTimers, durationSec, onTrigger, scheduleNextLine]);

  const stop = useCallback(() => {
    clearTimers();
    setState('finished');
    onTrigger({ kind: 'persona', trigger: 'finish' });
  }, [clearTimers, onTrigger]);

  const reset = useCallback(() => {
    clearTimers();
    setState('idle');
    setRemainingSec(0);
  }, [clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  return { state, durationSec, setDurationSec, remainingSec, situationId, setSituationId, start, stop, reset };
}
