import { useCallback, useEffect, useRef, useState } from 'react';

export function useCountdown() {
  const [remainingMs, setRemainingMs] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const [running, setRunning] = useState(false);
  const endAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef<(() => void) | null>(null);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(
    (durationMs: number, onComplete?: () => void) => {
      clear();
      endAtRef.current = Date.now() + durationMs;
      onCompleteRef.current = onComplete ?? null;
      setTotalMs(durationMs);
      setRemainingMs(durationMs);
      setRunning(true);
      intervalRef.current = setInterval(() => {
        const remaining = Math.max(0, (endAtRef.current ?? 0) - Date.now());
        setRemainingMs(remaining);
        if (remaining <= 0) {
          clear();
          setRunning(false);
          onCompleteRef.current?.();
        }
      }, 250);
    },
    [clear]
  );

  const stop = useCallback(() => {
    clear();
    setRunning(false);
    setRemainingMs(0);
    setTotalMs(0);
  }, [clear]);

  useEffect(() => clear, [clear]);

  return { remainingMs, totalMs, running, start, stop };
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
