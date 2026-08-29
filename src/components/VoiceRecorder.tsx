'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  value: string;
  onChange: (text: string) => void;
};

export default function VoiceRecorder({ value, onChange }: Props) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef('');

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (finalText) baseTextRef.current += finalText;
      onChange((baseTextRef.current + interimText).trim());
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
  }, [onChange]);

  function start() {
    baseTextRef.current = value ? value + ' ' : '';
    try {
      recognitionRef.current?.start();
      setListening(true);
    } catch {
      /* already started */
    }
  }

  function stop() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  return (
    <div>
      {supported ? (
        <button
          type="button"
          onClick={listening ? stop : start}
          className={`big-btn w-full ${listening ? 'bg-red-600 text-white' : 'bg-white border-brand-300 text-brand-800'}`}
        >
          <span className="text-5xl">{listening ? '⏹️' : '🎤'}</span>
          <span>{listening ? '話し終わったら押してください' : '音声でふきこむ'}</span>
        </button>
      ) : (
        <p className="text-base text-red-600 font-bold">
          このブラウザは音声入力に対応していません。下の欄に直接入力してください。
        </p>
      )}

      <label className="block text-lg font-bold mt-4 mb-1">対処方法・使った道具のメモ</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        placeholder="例：駐車場のアスファルトが陥没していたので常温合材とコテとタンパーで補修しました。"
        className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg"
      />
    </div>
  );
}
