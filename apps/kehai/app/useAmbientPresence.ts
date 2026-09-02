import { useCallback, useEffect, useRef } from 'react';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

const BREATH_SOURCE = require('../assets/sounds/breath_loop.wav');
const LIFE_SOUNDS: number[] = [
  require('../assets/sounds/sigh.wav'),
  require('../assets/sounds/stretch.wav'),
  require('../assets/sounds/hum.wav'),
  require('../assets/sounds/page_turn.wav'),
];

const BREATH_VOLUME = 0.32;
const LIFE_SOUND_VOLUME = 0.55;
const LIFE_SOUND_MIN_INTERVAL_MS = 45_000;
const LIFE_SOUND_MAX_INTERVAL_MS = 110_000;

// 常時流れる呼吸ループと、ランダムなタイミングで挟む生活音(ため息・伸び・
// 鼻歌・ページをめくる音)を管理する。「隣に誰かがいる気配」の音の土台。
export function useAmbientPresence() {
  const breathPlayerRef = useRef<AudioPlayer | null>(null);
  const lifePlayersRef = useRef<AudioPlayer[]>([]);
  const lifeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const breath = createAudioPlayer(BREATH_SOURCE, { updateInterval: 1000 });
    breath.loop = true;
    breath.volume = 0;
    breathPlayerRef.current = breath;

    const lifePlayers = LIFE_SOUNDS.map((src) => {
      const p = createAudioPlayer(src, { updateInterval: 1000 });
      p.volume = LIFE_SOUND_VOLUME;
      return p;
    });
    lifePlayersRef.current = lifePlayers;

    return () => {
      breath.remove();
      lifePlayers.forEach((p) => p.remove());
      if (lifeTimerRef.current) clearTimeout(lifeTimerRef.current);
    };
  }, []);

  const scheduleNextLifeSound = useCallback(() => {
    const delay = LIFE_SOUND_MIN_INTERVAL_MS + Math.random() * (LIFE_SOUND_MAX_INTERVAL_MS - LIFE_SOUND_MIN_INTERVAL_MS);
    lifeTimerRef.current = setTimeout(() => {
      const players = lifePlayersRef.current;
      if (players.length > 0) {
        const p = players[Math.floor(Math.random() * players.length)];
        p.seekTo(0)
          .then(() => p.play())
          .catch(() => {});
      }
      scheduleNextLifeSound();
    }, delay);
  }, []);

  const start = useCallback(() => {
    const breath = breathPlayerRef.current;
    if (breath) {
      breath.volume = BREATH_VOLUME;
      breath.play();
    }
    scheduleNextLifeSound();
  }, [scheduleNextLifeSound]);

  const stop = useCallback(() => {
    breathPlayerRef.current?.pause();
    lifePlayersRef.current.forEach((p) => p.pause());
    if (lifeTimerRef.current) {
      clearTimeout(lifeTimerRef.current);
      lifeTimerRef.current = null;
    }
  }, []);

  return { start, stop };
}
