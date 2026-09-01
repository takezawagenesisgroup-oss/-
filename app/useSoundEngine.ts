import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { DEFAULT_VOLUME, SOUNDS } from './sounds';

const FADE_STEP_MS = 50;

export function useSoundEngine() {
  const playersRef = useRef<Record<string, AudioPlayer>>({});
  const fadeTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [volumes, setVolumes] = useState<Record<string, number>>(() =>
    Object.fromEntries(SOUNDS.map((s) => [s.id, DEFAULT_VOLUME]))
  );

  useEffect(() => {
    const players = playersRef.current;
    SOUNDS.forEach((s) => {
      const player = createAudioPlayer(s.source, { updateInterval: 1000 });
      player.loop = true;
      player.volume = 0;
      players[s.id] = player;
    });
    const timers = fadeTimers.current;
    return () => {
      Object.values(timers).forEach(clearInterval);
      Object.values(players).forEach((p) => p.remove());
    };
  }, []);

  const clearFade = useCallback((id: string) => {
    const timer = fadeTimers.current[id];
    if (timer) {
      clearInterval(timer);
      delete fadeTimers.current[id];
    }
  }, []);

  const toggle = useCallback(
    (id: string) => {
      const player = playersRef.current[id];
      if (!player) return;
      clearFade(id);
      setActiveIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          player.pause();
        } else {
          next.add(id);
          player.volume = volumes[id] ?? DEFAULT_VOLUME;
          player.play();
        }
        return next;
      });
    },
    [clearFade, volumes]
  );

  const setVolume = useCallback(
    (id: string, value: number) => {
      setVolumes((prev) => ({ ...prev, [id]: value }));
      const player = playersRef.current[id];
      if (player && activeIds.has(id)) {
        player.volume = value;
      }
    },
    [activeIds]
  );

  const stopAll = useCallback(() => {
    Object.keys(fadeTimers.current).forEach(clearFade);
    Object.values(playersRef.current).forEach((p) => p.pause());
    setActiveIds(new Set());
  }, [clearFade]);

  // 就寝タイマー終了時に使う、指定時間かけて音量を0まで下げてから停止する処理。
  const fadeOutAndStop = useCallback(
    (durationMs: number) => {
      const ids = Array.from(activeIds);
      if (ids.length === 0) return;
      const steps = Math.max(1, Math.floor(durationMs / FADE_STEP_MS));
      ids.forEach((id) => {
        const player = playersRef.current[id];
        if (!player) return;
        const startVolume = player.volume;
        const restoreVolume = volumes[id] ?? DEFAULT_VOLUME;
        let step = 0;
        clearFade(id);
        fadeTimers.current[id] = setInterval(() => {
          step += 1;
          const t = step / steps;
          player.volume = Math.max(0, startVolume * (1 - t));
          if (step >= steps) {
            clearFade(id);
            player.pause();
            player.volume = restoreVolume;
          }
        }, FADE_STEP_MS);
      });
      setActiveIds(new Set());
    },
    [activeIds, clearFade, volumes]
  );

  return { activeIds, volumes, toggle, setVolume, stopAll, fadeOutAndStop };
}

export type SoundEngine = ReturnType<typeof useSoundEngine>;
