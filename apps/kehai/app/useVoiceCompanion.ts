import { useCallback, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { pickLineAvoidingRepeat, type Persona, type TriggerType } from './personas';

export type VoiceGender = 'neutral' | 'feminine' | 'masculine';

const PITCH_BY_GENDER: Record<VoiceGender, number> = {
  neutral: 1.0,
  feminine: 1.3,
  masculine: 0.85,
};

export function useVoiceCompanion(persona: Persona, gender: VoiceGender) {
  const [lastSpoken, setLastSpoken] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const lastLineIndexRef = useRef<Record<string, number>>({});

  const speak = useCallback(
    (trigger: TriggerType) => {
      const key = `${persona.id}:${trigger}`;
      const { text, index } = pickLineAvoidingRepeat(persona, trigger, lastLineIndexRef.current[key]);
      lastLineIndexRef.current[key] = index;

      setLastSpoken(text);
      setSpeaking(true);
      Haptics.impactAsync(trigger === 'finish' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});

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
