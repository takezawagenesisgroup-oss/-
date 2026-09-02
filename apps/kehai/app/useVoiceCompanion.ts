import { useCallback, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { pickLineAvoidingRepeat, type Persona, type TriggerType } from './personas';
import type { Situation } from './situations';

export type VoiceGender = 'neutral' | 'feminine' | 'masculine';

export type SpeakEvent = { kind: 'persona'; trigger: TriggerType } | { kind: 'situational' };

const PITCH_BY_GENDER: Record<VoiceGender, number> = {
  neutral: 1.0,
  feminine: 1.3,
  masculine: 0.85,
};

export function useVoiceCompanion(persona: Persona, gender: VoiceGender, situation: Situation | null) {
  const [lastSpoken, setLastSpoken] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const lastLineIndexRef = useRef<Record<string, number>>({});

  const speak = useCallback(
    (event: SpeakEvent) => {
      let key: string;
      let candidates: string[];
      if (event.kind === 'situational' && situation) {
        key = `situational:${situation.id}`;
        candidates = situation.lines;
      } else if (event.kind === 'persona') {
        key = `${persona.id}:${event.trigger}`;
        candidates = persona.lines[event.trigger];
      } else {
        return; // シチュエーション未選択でsituationalが来た場合は何もしない
      }

      const { text, index } = pickLineAvoidingRepeat(candidates, lastLineIndexRef.current[key]);
      lastLineIndexRef.current[key] = index;

      setLastSpoken(text);
      setSpeaking(true);
      const trigger = event.kind === 'persona' ? event.trigger : 'cheer';
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
    [persona, gender, situation]
  );

  const stop = useCallback(() => {
    Speech.stop();
    setSpeaking(false);
  }, []);

  // AIと話すモードなど、通常のトリガーの仕組みを介さずに任意のテキストを
  // 一度だけ話したい時に使う。
  const speakCustom = useCallback(
    (text: string) => {
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
    [gender]
  );

  return { speak, speakCustom, stop, lastSpoken, speaking };
}
