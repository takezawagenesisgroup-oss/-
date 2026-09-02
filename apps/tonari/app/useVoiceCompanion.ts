import { useCallback, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { fillTemplate, pickLineAvoidingRepeat, type Persona, type TriggerType } from './personas';
import type { Situation } from './situations';
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

// 「時間経過」トリガーが来た時、シチュエーションを選んでいればこの確率で
// キャラの通常セリフの代わりにシチュエーション別の一言を話す。
const SITUATIONAL_SUBSTITUTION_RATE = 0.5;

export function useVoiceCompanion(persona: Persona, gender: VoiceGender, situation: Situation | null) {
  const [lastSpoken, setLastSpoken] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const lastSpokenAtRef = useRef(0);
  const lastLineIndexRef = useRef<Record<string, number>>({});

  const speak = useCallback(
    (event: TriggerEvent) => {
      const now = Date.now();
      const minGap = IMPORTANT_TRIGGERS.has(event.trigger) ? IMPORTANT_MIN_GAP_MS : CHATTER_MIN_GAP_MS;
      if (now - lastSpokenAtRef.current < minGap) return;
      lastSpokenAtRef.current = now;

      let text: string;
      if (event.trigger === 'time' && situation && Math.random() < SITUATIONAL_SUBSTITUTION_RATE) {
        const key = `situational:${situation.id}`;
        const candidates = situation.lines;
        let index = Math.floor(Math.random() * candidates.length);
        if (index === lastLineIndexRef.current[key] && candidates.length > 1) {
          index = (index + 1) % candidates.length;
        }
        lastLineIndexRef.current[key] = index;
        text = candidates[index];
      } else {
        const key = `${persona.id}:${event.trigger}`;
        const { text: template, index } = pickLineAvoidingRepeat(persona, event.trigger, lastLineIndexRef.current[key]);
        lastLineIndexRef.current[key] = index;
        text = fillTemplate(template, { km: event.km, paceMinPerKm: event.paceMinPerKm, min: event.min });
      }

      setLastSpoken(text);
      setSpeaking(true);

      // 話しかけると同時に軽く振動でも知らせる(イヤホンを外している時や
      // 音量が小さい時の気づきやすさのため)。失敗しても発話自体は続ける。
      const haptic =
        event.trigger === 'finish'
          ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          : IMPORTANT_TRIGGERS.has(event.trigger)
            ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      haptic.catch(() => {});

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

  // 天気連動など、通常のトリガー/クールダウンの仕組みを介さずに一度だけ
  // 話したい時に使う(例: ラン開始直後の天気コメント)。
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
