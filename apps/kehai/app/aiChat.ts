// AIとの会話機能(課金モード)のスタブ実装。
//
// 気配の声・息づかいを聴きながら、AIと会話できるモード。実装できる範囲と、
// 実サービス化に必要な残りの部分をここで明確に分けておく。
//
// ✅ このサンドボックスで実装・動作確認できる範囲:
//   - 会話UI(履歴表示・テキスト入力・送信)→ ChatModal.tsx
//   - Web版でのブラウザ標準音声認識(Web Speech API)によるマイク入力
//     → useSpeechInput.ts
//   - AIの返答をTTS(expo-speech、useVoiceCompanionのspeakCustom)で読み上げる
//
// ❌ このサンドボックスでは実装できない範囲(実機・本番サーバーが必要):
//   - 実際のAI応答生成。LLM(Claude APIなど)のAPIキーをアプリに直接埋め込む
//     のはセキュリティ上不可(誰でも取り出せてしまう)。ユーザー自身が
//     APIキーを保持する軽量バックエンド(プロキシサーバー)を別途用意し、
//     アプリはそのエンドポイントにユーザー発話を送って応答を受け取る構成が
//     必要。このサンドボックス環境は外部ネットワークがブロックされている
//     ため、そのバックエンドの構築・疎通確認ができない。
//   - iOS/Androidネイティブの音声認識。@jamsch/expo-speech-recognition 等の
//     config-pluginパッケージ+カスタム開発ビルド(EAS Build)が必要で、
//     Expo Goでは動かない。このサンドボックスには実機がないため、
//     ビルド・動作確認ができない(差し込み口は useSpeechInput.ts 参照)。
//
// 差し込みポイント: 本番では getAIResponse() の中身を、
//   const res = await fetch('https://<自前バックエンド>/chat', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ message: userText, history }),
//   });
//   const { reply } = await res.json();
//   return reply;
// に差し替えるだけで、会話UI・音声入力・TTS読み上げなど周辺の仕組みは
// そのまま使い回せる。

export type ChatMessage = { role: 'user' | 'ai'; text: string };

const CANNED_RESPONSES = [
  'うん、聞いてるよ。もう少し詳しく教えて?',
  'そっか、それは大変だったね。ゆっくりでいいよ。',
  'いいね、その調子。',
  'なるほどね。他には何かあった?',
  '今日はちゃんと休めてる?',
  'そばにいるから、話したいこと話して。',
];

let cannedIndex = 0;

export async function getAIResponse(userText: string, history: ChatMessage[]): Promise<string> {
  // 本番実装ではここで自前バックエンド(LLM APIキーを保持するプロキシ)を呼ぶ。
  // 今はサンドボックスの制約により、応答の代わりに固定フレーズを順番に返す。
  void userText;
  void history;
  await new Promise((resolve) => setTimeout(resolve, 700 + Math.random() * 500));
  const text = CANNED_RESPONSES[cannedIndex % CANNED_RESPONSES.length];
  cannedIndex += 1;
  return text;
}
