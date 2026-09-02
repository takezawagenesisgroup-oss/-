import { useCallback, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { pickLineAvoidingRepeat, type Persona, type TriggerType } from './personas';
import type { Situation } from './situations';
import { NAME_CHEER_LINES, fillName } from './nameLines';

export type VoiceGender = 'neutral' | 'feminine' | 'masculine';

export type SpeakEvent = { kind: 'persona'; trigger: TriggerType } | { kind: 'situational' };

const PITCH_BY_GENDER: Record<VoiceGender, number> = {
  neutral: 1.0,
  feminine: 1.3,
  masculine: 0.85,
};

// 「応援(cheer)」トリガーが来た時、ニックネーム設定+プレミアム解放済みなら
// この確率で通常セリフの代わりに名前を呼ぶセリフを話す。
const NAME_SUBSTITUTION_RATE = 0.4;

export function useVoiceCompanion(
  persona: Persona,
  gender: VoiceGender,
  situation: Situation | null,
  nickname: string = '',
  nameFeatureUnlocked: boolean = false
) {
  const [lastSpoken, setLastSpoken] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const lastLineIndexRef = useRef<Record<string, number>>({});

  const speak = useCallback(
    (event: SpeakEvent) => {
      let key: string;
      let candidates: string[];
      let nameTemplate = false;

      const canUseName = nameFeatureUnlocked && nickname.trim().length > 0;
      if (event.kind === 'persona' && event.trigger === 'cheer' && canUseName && Math.random() < NAME_SUBSTITUTION_RATE) {
        key = `name:${persona.id}`;
        candidates = NAME_CHEER_LINES[persona.id];
        nameTemplate = true;
      } else if (event.kind === 'situational' && situation) {
        key = `situational:${situation.id}`;
        candidates = situation.lines;
      } else if (event.kind === 'persona') {
        key = `${persona.id}:${event.trigger}`;
        candidates = persona.lines[event.trigger];
      } else {
        return; // シチュエーション未選択でsituationalが来た場合は何もしない
      }

      const { text: rawText, index } = pickLineAvoidingRepeat(candidates, lastLineIndexRef.current[key]);
      lastLineIndexRef.current[key] = index;
      const text = nameTemplate ? fillName(rawText, nickname.trim()) : rawText;

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
    [persona, gender, situation, nickname, nameFeatureUnlocked]
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
