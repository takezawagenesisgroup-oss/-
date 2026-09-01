import { useCallback, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import { fillTemplate, pickLine, type Persona, type TriggerType } from './personas';
import type { TriggerEvent } from './useRunSession';

export type VoiceGender = 'neutral' | 'feminine' | 'masculine';

const PITCH_BY_GENDER: Record<VoiceGender, number> = {
  neutral: 1.0,
  feminine: 1.3,
  masculine: 0.85,
};

// 重要な出来事(スタート/ゴール/距離/中間/ラストスパート)は短い間隔でも発話を許可し、
// 雑談寄りのトリガー(ペース変化/時間経過/停止検知)はしゃべりすぎないよう間隔を広めに取る。
const IMPORTANT_TRIGGERS = new Set<TriggerType>(['start', 'finish', 'distance', 'midpoint', 'nearFinish']);
const IMPORTANT_MIN_GAP_MS = 8000;
const CHATTER_MIN_GAP_MS = 25000;

export function useVoiceCompanion(persona: Persona, gender: VoiceGender) {
  const [lastSpoken, setLastSpoken] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const lastSpokenAtRef = useRef(0);

  const speak = useCallback(
    (event: TriggerEvent) => {
      const now = Date.now();
      const minGap = IMPORTANT_TRIGGERS.has(event.trigger) ? IMPORTANT_MIN_GAP_MS : CHATTER_MIN_GAP_MS;
      if (now - lastSpokenAtRef.current < minGap) return;
      lastSpokenAtRef.current = now;

      const template = pickLine(persona, event.trigger);
      const text = fillTemplate(template, { km: event.km, paceMinPerKm: event.paceMinPerKm, min: event.min });

      setLastSpoken(text);
      setSpeaking(true);
      Speech.stop();
      Speech.speak(text, {
        language: 'ja-JP',
        pitch: PITCH_BY_GENDER[gender],
        rate: 1.0,
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    },
    [persona, gender]
  );

  const stop = useCallback(() => {
    Speech.stop();
    setSpeaking(false);
  }, []);

  return { speak, stop, lastSpoken, speaking };
}
