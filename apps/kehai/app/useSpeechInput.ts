import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';

// マイク入力から文字起こしを行うフック。
//
// Web: ブラウザ標準の Web Speech API (SpeechRecognition) を使う。Chrome等の
// 対応ブラウザではネットワーク越しにブラウザ側の音声認識サービスへ送られる
// (アプリ側で外部APIキーは不要)。
//
// iOS/Android: ネイティブの音声認識には @jamsch/expo-speech-recognition の
// ようなconfig-pluginパッケージと、Expo Goでは動かないカスタム開発ビルド
// (expo prebuild / EAS Build)が必要。このサンドボックスには実機・ビルド
// 環境がなく確認できないため、ここでは未配線。isSupported が false の場合、
// 呼び出し側はテキスト入力にフォールバックする想定。
//
// ネイティブ対応を追加する場合の差し込みポイント:
//   import { ExpoSpeechRecognitionModule } from '@jamsch/expo-speech-recognition';
//   ExpoSpeechRecognitionModule.start({ lang: 'ja-JP', interimResults: false });
//   のようなAPIを isSupported / start / stop の実装に足す。
export function useSpeechInput(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const isSupported =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const start = useCallback(() => {
    if (!isSupported) return;
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'ja-JP';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript;
      if (text) onResult(text);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  }, [isSupported, onResult]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { isSupported, listening, start, stop };
}
